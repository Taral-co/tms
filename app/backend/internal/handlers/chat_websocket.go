package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/bareuptime/tms/internal/middleware"
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
	chatSessionService  *service.ChatSessionService
	connectionManager   *ws.ConnectionManager
	notificationService *service.NotificationService
	aiService           *service.AIService
}

func NewChatWebSocketHandler(chatSessionService *service.ChatSessionService, connectionManager *ws.ConnectionManager, notificationService *service.NotificationService, aiService *service.AIService) *ChatWebSocketHandler {
	return &ChatWebSocketHandler{
		chatSessionService:  chatSessionService,
		connectionManager:   connectionManager,
		notificationService: notificationService,
		aiService:           aiService,
	}
}

// HandleWebSocket handles WebSocket connections for real-time chat from visitors
func (h *ChatWebSocketHandler) HandleWebSocketPublic(c *gin.Context) {
	sessionID := middleware.GetSessionID(c)

	// Validate session
	session, err := h.chatSessionService.GetChatSessionOnlyByID(c.Request.Context(), sessionID)
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
	connectionID, err := h.connectionManager.AddConnection(
		ws.ConnectionTypeVisitor,
		session.ID,
		[]uuid.UUID{session.ProjectID},
		nil, // No user ID for visitors
		conn,
	)
	if err != nil {
		log.Printf("Failed to register connection: %v", err)
		return
	}

	// Clean up on disconnect
	defer func() {
		h.connectionManager.RemoveConnection(connectionID)
	}()

	// Send welcome message
	welcomeMsg := &ws.Message{
		Type:      "session_update",
		SessionID: session.ID,
		Data: json.RawMessage(`{
			"type": "connected",
			"message": "Connected to chat session"
		}`),
		FromType:     ws.ConnectionTypeVisitor,
		DeliveryType: ws.Self,
	}
	h.connectionManager.SendToConnection(connectionID, welcomeMsg)

	// Set up ping handler for connection health
	conn.SetPongHandler(func(string) error {
		h.connectionManager.UpdateConnectionPing(connectionID)
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

		h.handleVisitorMessage(c.Request.Context(), session, msg, connectionID)
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
		h.processReadReceipt(ctx, session, msg, "visitor")
	}
}

// // handleAgentMessage handles incoming WebSocket messages from agents
// func (h *ChatWebSocketHandler) handleAgentMessage(ctx context.Context, tenantID, projectID, sessionID, agentID uuid.UUID, msg models.WSMessage, connID string) {
// 	switch msg.Type {
// 	case models.WSMsgTypeChatMessage:
// 		h.processAgentChatMessage(ctx, tenantID, projectID, sessionID, agentID, msg, connID)
// 	case models.WSMsgTypeTypingStart:
// 		h.processAgentTyping(ctx, tenantID, projectID, sessionID, agentID, msg, true)
// 	case models.WSMsgTypeTypingStop:
// 		h.processAgentTyping(ctx, tenantID, projectID, sessionID, agentID, msg, false)
// 	case models.WSMsgTypeReadReceipt:
// 		h.processReadReceipt(ctx, sessionID, "agent", connID)
// 	}
// }

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

			message, err := h.chatSessionService.SendMessage(
				ctx,
				session.TenantID,
				session.ProjectID,
				session.ID,
				req,
				"visitor",
				nil,
				visitorName,
			)
			if err != nil {
				h.sendError(connID, "Failed to send message: "+err.Error())
				return
			}

			// Broadcast to all connections in this session using enterprise manager
			messageData, _ := json.Marshal(message)
			broadcastMsg := &ws.Message{
				Type:         "chat_message",
				SessionID:    session.ID,
				Data:         messageData,
				FromType:     ws.ConnectionTypeVisitor,
				ProjectID:    &session.ProjectID,
				TenantID:     &session.TenantID,
				AgentID:      session.AssignedAgentID,
				DeliveryType: ws.Direct,
			}
			h.connectionManager.DeliverWebSocketMessage(session.ID, broadcastMsg)

			// Process AI response if enabled and applicable
			fmt.Println("should respond iwth AI: h.aiService -> ", h.aiService != nil)
			fmt.Println("should respond iwth AI: session.UseAI -> ", session.UseAI)
			fmt.Println("should respond iwth AI: session.AssignedAgentID == nil -> ", session.AssignedAgentID == nil)
			go func() {
				chatMessage, err := h.aiService.ProcessMessage(ctx, session, message)
				if err != nil {
					log.Printf("AI processing error for session %s: %v", session.ID, err)
				}
				messageData, _ := json.Marshal(chatMessage)
				aiResponse := &ws.Message{
					Type:         "chat_message",
					SessionID:    session.ID,
					Data:         messageData,
					FromType:     ws.ConnectionTypeVisitor,
					ProjectID:    &session.ProjectID,
					TenantID:     &session.TenantID,
					AgentID:      session.AssignedAgentID,
					DeliveryType: ws.Direct,
				}
				h.connectionManager.SendToConnection(connID, aiResponse)
			}()

			// Create notification for assigned agent if session has one
			if session.AssignedAgentID != nil {
				// Create a message received notification
				actionURL := fmt.Sprintf("/chat/session/%s", session.ID.String())
				err = h.notificationService.CreateSystemNotification(
					ctx,
					session.TenantID,
					&session.ProjectID,
					*session.AssignedAgentID,
					models.NotificationTypeMessageReceived,
					fmt.Sprintf("New message from %s", visitorName),
					content, // Use the message content directly
					models.NotificationPriorityNormal,
					&actionURL,
				)
				if err != nil {
					log.Printf("Failed to create notification for agent %s: %v", *session.AssignedAgentID, err)
				}
			}
		}
	}
}

// processAgentChatMessage processes chat messages from agents
func (h *ChatWebSocketHandler) processAgentChatMessage(ctx context.Context, tenantID, projectID, sessionID, agentID uuid.UUID, msg models.WSMessage, connID string) {
	if data, ok := msg.Data.(map[string]interface{}); ok {
		content, _ := data["content"].(string)
		agentName, _ := data["agent_name"].(string)

		if content != "" {
			req := &models.SendChatMessageRequest{
				Content: content,
			}

			message, err := h.chatSessionService.SendMessage(ctx, tenantID, projectID, sessionID, req, "agent", &agentID, agentName)
			if err != nil {
				h.sendError(connID, "Failed to send message: "+err.Error())
				return
			}

			// Broadcast to all connections in this session
			messageData, _ := json.Marshal(message)
			broadcastMsg := &ws.Message{
				Type:      "chat_message",
				SessionID: sessionID,
				Data:      messageData,
				FromType:  ws.ConnectionTypeAgent,
			}
			h.connectionManager.DeliverWebSocketMessage(sessionID, broadcastMsg)
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
		SessionID: session.ID,
		Data:      typingData,
		FromType:  ws.ConnectionTypeVisitor,
		ProjectID: &session.ProjectID,
		TenantID:  &session.TenantID,
		AgentID:   session.AssignedAgentID,
	}
	h.connectionManager.DeliverWebSocketMessage(session.ID, broadcastMsg)
}

// processAgentTyping handles agent typing indicators
func (h *ChatWebSocketHandler) processAgentTyping(ctx context.Context, tenantID, projectID, sessionID, agentID uuid.UUID, msg models.WSMessage, isTyping bool) {
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
			SessionID: sessionID,
			Data:      typingData,
			FromType:  ws.ConnectionTypeAgent,
		}
		h.connectionManager.DeliverWebSocketMessage(sessionID, broadcastMsg)
	}
}

// processReadReceipt handles read receipt processing
func (h *ChatWebSocketHandler) processReadReceipt(ctx context.Context, session *models.ChatSession, msg models.WSMessage, readerType string) {
	broadcastMsg := &ws.Message{
		Type:      "read_receipt_confirmed",
		SessionID: session.ID,
		Data:      json.RawMessage(`{"status":"acknowledged"}`),
		FromType:  ws.ConnectionTypeVisitor,
		ProjectID: &session.ProjectID,
		TenantID:  &session.TenantID,
		AgentID:   session.AssignedAgentID,
	}
	go h.connectionManager.DeliverWebSocketMessage(session.ID, broadcastMsg)
	go h.chatSessionService.MarkVisitorMessagesAsRead(ctx, session.ID, *msg.MessageID, readerType)
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
func (h *ChatWebSocketHandler) BroadcastToAgents(tenantID uuid.UUID, msg *ws.Message) {
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
		SessionID: session.ID,
		Data:      sessionData,
		FromType:  ws.ConnectionTypeVisitor,
	}
	h.BroadcastToAgents(session.TenantID, msg)
}
