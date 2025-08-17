package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/service"
	ws "github.com/bareuptime/tms/internal/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

type ChatWebSocketHandler struct {
	chatSessionService *service.ChatSessionService
	connectionManager  *ws.ConnectionManager
}

func NewChatWebSocketHandler(chatSessionService *service.ChatSessionService, connectionManager *ws.ConnectionManager) *ChatWebSocketHandler {
	return &ChatWebSocketHandler{
		chatSessionService: chatSessionService,
		connectionManager:  connectionManager,
	}
}

// HandleWebSocket handles WebSocket connections for real-time chat from visitors
func (h *ChatWebSocketHandler) HandleWebSocket(c *gin.Context) {
	sessionToken := c.Param("session_token")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_token is required"})
		return
	}

	// Validate session
	session, err := h.chatSessionService.GetChatSessionByToken(c.Request.Context(), sessionToken)
	if err != nil || session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session token"})
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Register connection with the enterprise connection manager
	connection, err := h.connectionManager.AddConnection(
		session.ID.String(),
		ws.ConnectionTypeVisitor,
		session.TenantID.String(),
		nil, // No user ID for visitors
		conn,
	)
	if err != nil {
		log.Printf("Failed to register connection: %v", err)
		return
	}

	// Clean up on disconnect
	defer func() {
		h.connectionManager.RemoveConnection(connection.ID)
	}()

	// Send welcome message
	welcomeMsg := &ws.Message{
		Type:      "session_update",
		SessionID: session.ID.String(),
		Data: json.RawMessage(`{
			"type": "connected",
			"message": "Connected to chat session"
		}`),
		FromType: ws.ConnectionTypeVisitor,
	}
	h.connectionManager.SendToConnection(connection.ID, welcomeMsg)

	// Set up ping handler for connection health
	conn.SetPongHandler(func(string) error {
		h.connectionManager.UpdateConnectionPing(connection.ID)
		return nil
	})

	// Handle messages
	for {
		var msg models.WSMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		h.handleVisitorMessage(c.Request.Context(), session, msg, connection.ID)
	}
}

// HandleAgentWebSocket handles WebSocket connections for agents
func (h *ChatWebSocketHandler) HandleAgentWebSocket(c *gin.Context) {
	sessionID := c.Param("session_id")
	agentID := c.Query("agent_id")

	if sessionID == "" || agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id and agent_id are required"})
		return
	}

	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	agentUUID, err := uuid.Parse(agentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid agent ID"})
		return
	}

	// Get session to validate and get tenant context
	session, err := h.chatSessionService.GetChatSessionByToken(c.Request.Context(), sessionUUID.String())
	if err != nil || session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Register agent connection
	userIDStr := agentUUID.String()
	connection, err := h.connectionManager.AddConnection(
		session.ID.String(),
		ws.ConnectionTypeAgent,
		session.TenantID.String(),
		&userIDStr,
		conn,
	)
	if err != nil {
		log.Printf("Failed to register agent connection: %v", err)
		return
	}

	defer func() {
		h.connectionManager.RemoveConnection(connection.ID)
	}()

	// Send welcome message to agent
	welcomeMsg := &ws.Message{
		Type:      "session_joined",
		SessionID: session.ID.String(),
		Data: json.RawMessage(`{
			"type": "agent_connected",
			"message": "Agent connected to session"
		}`),
		FromType: ws.ConnectionTypeAgent,
	}
	h.connectionManager.SendToConnection(connection.ID, welcomeMsg)

	// Set up ping handler
	conn.SetPongHandler(func(string) error {
		h.connectionManager.UpdateConnectionPing(connection.ID)
		return nil
	})

	// Handle agent messages
	for {
		var msg models.WSMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		h.handleAgentMessage(c.Request.Context(), session, agentUUID, msg, connection.ID)
	}
}

// handleVisitorMessage handles incoming WebSocket messages from visitors
func (h *ChatWebSocketHandler) handleVisitorMessage(ctx context.Context, session *models.ChatSession, msg models.WSMessage, connID string) {
	switch msg.Type {
	case models.WSMsgTypeChatMessage:
		h.processVisitorChatMessage(ctx, session, msg, connID)
	case models.WSMsgTypeTypingStart:
		h.processVisitorTyping(session, msg, true)
	case models.WSMsgTypeTypingStop:
		h.processVisitorTyping(session, msg, false)
	case models.WSMsgTypeReadReceipt:
		h.processReadReceipt(ctx, session.ID, "visitor", connID)
	}
}

// handleAgentMessage handles incoming WebSocket messages from agents
func (h *ChatWebSocketHandler) handleAgentMessage(ctx context.Context, session *models.ChatSession, agentID uuid.UUID, msg models.WSMessage, connID string) {
	switch msg.Type {
	case models.WSMsgTypeChatMessage:
		h.processAgentChatMessage(ctx, session, agentID, msg, connID)
	case models.WSMsgTypeTypingStart:
		h.processAgentTyping(session, msg, true)
	case models.WSMsgTypeTypingStop:
		h.processAgentTyping(session, msg, false)
	case models.WSMsgTypeReadReceipt:
		h.processReadReceipt(ctx, session.ID, "agent", connID)
	}
}

// processVisitorChatMessage processes chat messages from visitors
func (h *ChatWebSocketHandler) processVisitorChatMessage(ctx context.Context, session *models.ChatSession, msg models.WSMessage, connID string) {
	if data, ok := msg.Data.(map[string]interface{}); ok {
		content, _ := data["content"].(string)
		if content != "" {
			req := &models.SendChatMessageRequest{
				Content: content,
			}

			visitorName := "Visitor"
			if session.CustomerName != nil && *session.CustomerName != "" {
				visitorName = *session.CustomerName
			}

			message, err := h.chatSessionService.SendMessage(ctx, session, req, "visitor", nil, visitorName)
			if err != nil {
				h.sendError(connID, "Failed to send message: "+err.Error())
				return
			}

			// Broadcast to all connections in this session using enterprise manager
			messageData, _ := json.Marshal(message)
			broadcastMsg := &ws.Message{
				Type:      "chat_message",
				SessionID: session.ID.String(),
				Data:      messageData,
				FromType:  ws.ConnectionTypeVisitor,
			}
			h.connectionManager.BroadcastToSession(session.ID.String(), broadcastMsg)
		}
	}
}

// processAgentChatMessage processes chat messages from agents
func (h *ChatWebSocketHandler) processAgentChatMessage(ctx context.Context, session *models.ChatSession, agentID uuid.UUID, msg models.WSMessage, connID string) {
	if data, ok := msg.Data.(map[string]interface{}); ok {
		content, _ := data["content"].(string)
		agentName, _ := data["agent_name"].(string)

		if content != "" {
			req := &models.SendChatMessageRequest{
				Content: content,
			}

			message, err := h.chatSessionService.SendMessage(ctx, session, req, "agent", &agentID, agentName)
			if err != nil {
				h.sendError(connID, "Failed to send message: "+err.Error())
				return
			}

			// Broadcast to all connections in this session
			messageData, _ := json.Marshal(message)
			broadcastMsg := &ws.Message{
				Type:      "chat_message",
				SessionID: session.ID.String(),
				Data:      messageData,
				FromType:  ws.ConnectionTypeAgent,
			}
			h.connectionManager.BroadcastToSession(session.ID.String(), broadcastMsg)
		}
	}
}

// processVisitorTyping handles visitor typing indicators
func (h *ChatWebSocketHandler) processVisitorTyping(session *models.ChatSession, msg models.WSMessage, isTyping bool) {
	visitorName := "Visitor"
	if session.CustomerName != nil && *session.CustomerName != "" {
		visitorName = *session.CustomerName
	}

	msgType := "typing_stop"
	if isTyping {
		msgType = "typing_start"
	}

	typingData, _ := json.Marshal(map[string]interface{}{
		"author_name": visitorName,
		"author_type": "visitor",
	})

	broadcastMsg := &ws.Message{
		Type:      msgType,
		SessionID: session.ID.String(),
		Data:      typingData,
		FromType:  ws.ConnectionTypeVisitor,
	}
	h.connectionManager.BroadcastToSession(session.ID.String(), broadcastMsg)
}

// processAgentTyping handles agent typing indicators
func (h *ChatWebSocketHandler) processAgentTyping(session *models.ChatSession, msg models.WSMessage, isTyping bool) {
	if data, ok := msg.Data.(map[string]interface{}); ok {
		agentName, _ := data["agent_name"].(string)

		msgType := "typing_stop"
		if isTyping {
			msgType = "typing_start"
		}

		typingData, _ := json.Marshal(map[string]interface{}{
			"author_name": agentName,
			"author_type": "agent",
		})

		broadcastMsg := &ws.Message{
			Type:      msgType,
			SessionID: session.ID.String(),
			Data:      typingData,
			FromType:  ws.ConnectionTypeAgent,
		}
		h.connectionManager.BroadcastToSession(session.ID.String(), broadcastMsg)
	}
}

// processReadReceipt handles read receipt processing
func (h *ChatWebSocketHandler) processReadReceipt(ctx context.Context, sessionID uuid.UUID, readerType string, connID string) {
	err := h.chatSessionService.MarkMessagesAsRead(ctx, sessionID, readerType)
	if err != nil {
		h.sendError(connID, "Failed to mark messages as read: "+err.Error())
	}
}

// sendError sends an error message to a specific connection
func (h *ChatWebSocketHandler) sendError(connID string, errorMsg string) {
	errorData, _ := json.Marshal(map[string]interface{}{
		"error": errorMsg,
	})

	msg := &ws.Message{
		Type: "error",
		Data: errorData,
	}
	h.connectionManager.SendToConnection(connID, msg)
}

// BroadcastToAgents broadcasts a message to all agent connections in a tenant
func (h *ChatWebSocketHandler) BroadcastToAgents(tenantID string, msg *ws.Message) {
	agents, err := h.connectionManager.GetActiveAgents(tenantID)
	if err != nil {
		log.Printf("Failed to get active agents: %v", err)
		return
	}

	for _, agent := range agents {
		h.connectionManager.SendToConnection(agent.ID, msg)
	}
}

// NotifyAgentOfNewSession notifies agents of a new chat session
func (h *ChatWebSocketHandler) NotifyAgentOfNewSession(session *models.ChatSession) {
	sessionData, _ := json.Marshal(session)
	msg := &ws.Message{
		Type:      "new_session",
		SessionID: session.ID.String(),
		Data:      sessionData,
		FromType:  ws.ConnectionTypeVisitor,
	}
	h.BroadcastToAgents(session.TenantID.String(), msg)
}
