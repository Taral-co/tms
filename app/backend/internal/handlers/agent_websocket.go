package handlers

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/service"
	ws "github.com/bareuptime/tms/internal/websocket"
)

type AgentWebSocketHandler struct {
	chatSessionService *service.ChatSessionService
	connectionManager  *ws.ConnectionManager
}

func NewAgentWebSocketHandler(chatSessionService *service.ChatSessionService, connectionManager *ws.ConnectionManager) *AgentWebSocketHandler {
	return &AgentWebSocketHandler{
		chatSessionService: chatSessionService,
		connectionManager:  connectionManager,
	}
}

// HandleAgentGlobalWebSocket handles a single WebSocket connection per agent for all sessions
func (h *AgentWebSocketHandler) HandleAgentGlobalWebSocket(c *gin.Context) {
	agentUUID := middleware.GetAgentID(c)
	tenantID := middleware.GetTenantID(c)
	// Note: No project_id needed for global agent connection

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Register agent connection with special "agent-global" session ID
	userIDStr := agentUUID.String()
	agentGlobalSessionID := "agent-global-" + agentUUID.String()
	
	connection, err := h.connectionManager.AddConnection(
		agentGlobalSessionID,
		ws.ConnectionTypeAgent,
		tenantID.String(),
		&userIDStr,
		conn,
	)
	if err != nil {
		log.Printf("Failed to register agent global connection: %v", err)
		return
	}

	defer func() {
		h.connectionManager.RemoveConnection(connection.ID)
	}()

	// Send welcome message to agent
	welcomeMsg := &ws.Message{
		Type:      "agent_connected",
		SessionID: agentGlobalSessionID,
		Data: json.RawMessage(`{
			"type": "connected",
			"message": "Connected to TMS agent console",
			"agent_id": "` + agentUUID.String() + `"
		}`),
		FromType: ws.ConnectionTypeAgent,
	}
	h.connectionManager.SendToConnection(connection.ID, welcomeMsg)

	// Set up ping handler for connection health
	conn.SetPongHandler(func(string) error {
		h.connectionManager.UpdateConnectionPing(connection.ID)
		return nil
	})

	// Handle messages from agent
	for {
		var msg models.WSMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		h.handleAgentGlobalMessage(c.Request.Context(), tenantID, agentUUID, msg, connection.ID)
	}
}

func (h *AgentWebSocketHandler) handleAgentGlobalMessage(ctx context.Context, tenantID, agentUUID uuid.UUID, msg models.WSMessage, connectionID string) {
	switch msg.Type {
	case models.WSMsgTypeChatMessage:
		if msg.Data != nil && msg.SessionID != uuid.Nil {
			// Get session to extract project ID
			session, err := h.chatSessionService.GetChatSessionByID(ctx, tenantID, msg.SessionID)
			if err != nil {
				log.Printf("Cannot get session %s: %v", msg.SessionID, err)
				return
			}
			if session == nil {
				log.Printf("Session %s not found", msg.SessionID)
				return
			}
			// Handle message for specific session via agent's global connection
			h.handleChatMessage(ctx, tenantID, session.ProjectID, msg.SessionID.String(), agentUUID, msg, connectionID)
		}
	case models.WSMsgTypeTypingStart, models.WSMsgTypeTypingStop:
		if msg.SessionID != uuid.Nil {
			// Broadcast typing indicator to session
			h.broadcastTypingIndicator(ctx, msg.SessionID.String(), string(msg.Type), agentUUID.String())
		}
	case "ping":
		// Respond to ping
		pongMsg := &ws.Message{
			Type:      "pong",
			SessionID: "agent-global-" + agentUUID.String(),
			Data:      json.RawMessage(`{"timestamp":"` + time.Now().Format(time.RFC3339) + `"}`),
			FromType:  ws.ConnectionTypeAgent,
		}
		h.connectionManager.SendToConnection(connectionID, pongMsg)
	case "session_subscribe":
		// Agent wants to receive updates for a specific session
		if msg.SessionID != uuid.Nil {
			h.subscribeAgentToSession(ctx, agentUUID, msg.SessionID.String(), connectionID)
		}
	case "session_unsubscribe":
		// Agent no longer wants updates for a specific session  
		if msg.SessionID != uuid.Nil {
			h.unsubscribeAgentFromSession(ctx, agentUUID, msg.SessionID.String(), connectionID)
		}
	}
}

func (h *AgentWebSocketHandler) handleChatMessage(ctx context.Context, tenantID, projectID uuid.UUID, sessionID string, agentUUID uuid.UUID, msg models.WSMessage, connectionID string) {
	// Parse message data
	var messageData struct {
		Content     string `json:"content"`
		MessageType string `json:"message_type"`
	}

	// Type assert the interface{} to []byte
	dataBytes, ok := msg.Data.([]byte)
	if !ok {
		// Try marshaling if it's not already bytes
		var err error
		dataBytes, err = json.Marshal(msg.Data)
		if err != nil {
			log.Printf("Failed to marshal message data: %v", err)
			return
		}
	}

	if err := json.Unmarshal(dataBytes, &messageData); err != nil {
		log.Printf("Failed to parse message data: %v", err)
		return
	}

	// Parse sessionID to UUID
	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		log.Printf("Invalid session ID: %v", err)
		return
	}

	// Create message request using the correct SendChatMessageRequest structure
	request := &models.SendChatMessageRequest{
		Content:     messageData.Content,
		MessageType: messageData.MessageType,
		SenderName:  "Agent", // This will be updated with proper agent name
		IsPrivate:   false,
		Metadata:    make(models.JSONMap),
	}

	// Send message via service layer with correct parameters
	chatMessage, err := h.chatSessionService.SendMessage(ctx, tenantID, projectID, sessionUUID, request, "agent", &agentUUID, "Agent")
	if err != nil {
		log.Printf("Failed to send chat message: %v", err)
		// Send error back to agent
		errorMsg := &ws.Message{
			Type:      "error",
			SessionID: sessionID,
			Data:      json.RawMessage(`{"error":"Failed to send message","details":"` + err.Error() + `"}`),
			FromType:  ws.ConnectionTypeAgent,
		}
		h.connectionManager.SendToConnection(connectionID, errorMsg)
		return
	}

	// Broadcast message to all session participants (including other agents)
	messageBytes, _ := json.Marshal(chatMessage)
	sessionMsg := &ws.Message{
		Type:      "chat_message",
		SessionID: sessionID,
		Data:      json.RawMessage(messageBytes),
		FromType:  ws.ConnectionTypeAgent,
	}
	h.connectionManager.BroadcastToSession(sessionID, sessionMsg)
}

func (h *AgentWebSocketHandler) broadcastTypingIndicator(ctx context.Context, sessionID, typingType, agentName string) {
	typingData := map[string]interface{}{
		"author_type": "agent",
		"author_name": agentName,
		"is_typing":   typingType == "typing_start",
	}
	typingBytes, _ := json.Marshal(typingData)

	typingMsg := &ws.Message{
		Type:      typingType,
		SessionID: sessionID,
		Data:      json.RawMessage(typingBytes),
		FromType:  ws.ConnectionTypeAgent,
	}
	h.connectionManager.BroadcastToSession(sessionID, typingMsg)
}

func (h *AgentWebSocketHandler) subscribeAgentToSession(ctx context.Context, agentUUID uuid.UUID, sessionID, connectionID string) {
	// For now, just log the subscription - agent will receive messages for all sessions they have access to
	// In future iterations, we could implement more granular subscription management
	log.Printf("Agent %s subscribed to session %s", agentUUID.String(), sessionID)
}

func (h *AgentWebSocketHandler) unsubscribeAgentFromSession(ctx context.Context, agentUUID uuid.UUID, sessionID, connectionID string) {
	// For now, just log the unsubscription
	log.Printf("Agent %s unsubscribed from session %s", agentUUID.String(), sessionID)
}
