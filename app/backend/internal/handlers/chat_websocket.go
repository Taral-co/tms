package handlers

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/service"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

type ChatWebSocketHandler struct {
	chatSessionService *service.ChatSessionService
	connections        map[string]*websocket.Conn
	sessionConnections map[uuid.UUID][]*websocket.Conn
	mu                 sync.RWMutex
}

func NewChatWebSocketHandler(chatSessionService *service.ChatSessionService) *ChatWebSocketHandler {
	return &ChatWebSocketHandler{
		chatSessionService: chatSessionService,
		connections:        make(map[string]*websocket.Conn),
		sessionConnections: make(map[uuid.UUID][]*websocket.Conn),
	}
}

// HandleWebSocket handles WebSocket connections for real-time chat
func (h *ChatWebSocketHandler) HandleWebSocket(c *gin.Context) {
	sessionToken := c.Query("session_token")
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

	// Register connection
	connectionID := uuid.New().String()
	h.mu.Lock()
	h.connections[connectionID] = conn
	h.sessionConnections[session.ID] = append(h.sessionConnections[session.ID], conn)
	h.mu.Unlock()

	// Clean up on disconnect
	defer func() {
		h.mu.Lock()
		delete(h.connections, connectionID)
		// Remove from session connections
		if conns, exists := h.sessionConnections[session.ID]; exists {
			for i, c := range conns {
				if c == conn {
					h.sessionConnections[session.ID] = append(conns[:i], conns[i+1:]...)
					break
				}
			}
			if len(h.sessionConnections[session.ID]) == 0 {
				delete(h.sessionConnections, session.ID)
			}
		}
		h.mu.Unlock()
	}()

	// Send welcome message
	welcomeMsg := models.WSMessage{
		Type:      models.WSMsgTypeSessionUpdate,
		SessionID: session.ID,
		Data: map[string]interface{}{
			"type":    "connected",
			"message": "Connected to chat session",
		},
		Timestamp: time.Now(),
	}
	h.sendToConnection(conn, welcomeMsg)

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

		h.handleWebSocketMessage(c.Request.Context(), session, msg, conn)
	}
}

// HandleAgentWebSocket handles WebSocket connections for agents
func (h *ChatWebSocketHandler) HandleAgentWebSocket(c *gin.Context) {
	// This would include agent authentication via JWT
	agentID := c.Query("agent_id")
	if agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent_id is required"})
		return
	}

	agentUUID, err := uuid.Parse(agentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid agent ID"})
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
	connectionID := "agent_" + agentUUID.String()
	h.mu.Lock()
	h.connections[connectionID] = conn
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.connections, connectionID)
		h.mu.Unlock()
	}()

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

		h.handleAgentWebSocketMessage(c.Request.Context(), agentUUID, msg, conn)
	}
}

// handleWebSocketMessage handles incoming WebSocket messages from visitors
func (h *ChatWebSocketHandler) handleWebSocketMessage(ctx context.Context, session *models.ChatSession, msg models.WSMessage, conn *websocket.Conn) {
	switch msg.Type {
	case models.WSMsgTypeChatMessage:
		// Handle chat message
		if data, ok := msg.Data.(map[string]interface{}); ok {
			content, _ := data["content"].(string)
			if content != "" {
				req := &models.SendChatMessageRequest{
					Content: content,
				}

				visitorName := "Visitor"
				if session.CustomerName != "" {
					visitorName = session.CustomerName
				}

				message, err := h.chatSessionService.SendMessage(ctx, session.ID, req, "visitor", nil, visitorName)
				if err != nil {
					h.sendError(conn, "Failed to send message: "+err.Error())
					return
				}

				// Broadcast to all connections in this session
				broadcastMsg := models.WSMessage{
					Type:      models.WSMsgTypeChatMessage,
					SessionID: session.ID,
					Data:      message,
					Timestamp: time.Now(),
				}
				h.broadcastToSession(session.ID, broadcastMsg)
			}
		}

	case models.WSMsgTypeTypingStart:
		// Broadcast typing indicator
		broadcastMsg := models.WSMessage{
			Type:      models.WSMsgTypeTypingStart,
			SessionID: session.ID,
			Data: map[string]interface{}{
				"author_name": session.CustomerName,
				"author_type": "visitor",
			},
			Timestamp: time.Now(),
		}
		h.broadcastToSessionExcluding(session.ID, broadcastMsg, conn)

	case models.WSMsgTypeTypingStop:
		// Broadcast stop typing indicator
		broadcastMsg := models.WSMessage{
			Type:      models.WSMsgTypeTypingStop,
			SessionID: session.ID,
			Data: map[string]interface{}{
				"author_name": session.CustomerName,
				"author_type": "visitor",
			},
			Timestamp: time.Now(),
		}
		h.broadcastToSessionExcluding(session.ID, broadcastMsg, conn)

	case models.WSMsgTypeReadReceipt:
		// Mark messages as read
		err := h.chatSessionService.MarkMessagesAsRead(ctx, session.ID, "visitor")
		if err != nil {
			h.sendError(conn, "Failed to mark messages as read: "+err.Error())
		}
	}
}

// handleAgentWebSocketMessage handles incoming WebSocket messages from agents
func (h *ChatWebSocketHandler) handleAgentWebSocketMessage(ctx context.Context, agentID uuid.UUID, msg models.WSMessage, conn *websocket.Conn) {
	switch msg.Type {
	case models.WSMsgTypeChatMessage:
		// Handle agent chat message
		if data, ok := msg.Data.(map[string]interface{}); ok {
			content, _ := data["content"].(string)
			sessionIDStr, _ := data["session_id"].(string)
			agentName, _ := data["agent_name"].(string)
			
			if content != "" && sessionIDStr != "" {
				sessionID, err := uuid.Parse(sessionIDStr)
				if err != nil {
					h.sendError(conn, "Invalid session ID")
					return
				}

				req := &models.SendChatMessageRequest{
					Content: content,
				}

				message, err := h.chatSessionService.SendMessage(ctx, sessionID, req, "agent", &agentID, agentName)
				if err != nil {
					h.sendError(conn, "Failed to send message: "+err.Error())
					return
				}

				// Broadcast to all connections in this session
				broadcastMsg := models.WSMessage{
					Type:      models.WSMsgTypeChatMessage,
					SessionID: sessionID,
					Data:      message,
					Timestamp: time.Now(),
				}
				h.broadcastToSession(sessionID, broadcastMsg)
			}
		}

	case models.WSMsgTypeTypingStart:
		// Broadcast agent typing indicator
		if data, ok := msg.Data.(map[string]interface{}); ok {
			sessionIDStr, _ := data["session_id"].(string)
			agentName, _ := data["agent_name"].(string)
			
			if sessionIDStr != "" {
				sessionID, err := uuid.Parse(sessionIDStr)
				if err != nil {
					return
				}

				broadcastMsg := models.WSMessage{
					Type:      models.WSMsgTypeTypingStart,
					SessionID: sessionID,
					Data: map[string]interface{}{
						"author_name": agentName,
						"author_type": "agent",
					},
					Timestamp: time.Now(),
				}
				h.broadcastToSessionExcluding(sessionID, broadcastMsg, conn)
			}
		}

	case models.WSMsgTypeReadReceipt:
		// Mark messages as read by agent
		if data, ok := msg.Data.(map[string]interface{}); ok {
			sessionIDStr, _ := data["session_id"].(string)
			
			if sessionIDStr != "" {
				sessionID, err := uuid.Parse(sessionIDStr)
				if err != nil {
					return
				}

				err = h.chatSessionService.MarkMessagesAsRead(ctx, sessionID, "agent")
				if err != nil {
					h.sendError(conn, "Failed to mark messages as read: "+err.Error())
				}
			}
		}
	}
}

// broadcastToSession broadcasts a message to all connections in a session
func (h *ChatWebSocketHandler) broadcastToSession(sessionID uuid.UUID, msg models.WSMessage) {
	h.mu.RLock()
	connections := h.sessionConnections[sessionID]
	h.mu.RUnlock()

	for _, conn := range connections {
		h.sendToConnection(conn, msg)
	}
}

// broadcastToSessionExcluding broadcasts to all connections in a session except the sender
func (h *ChatWebSocketHandler) broadcastToSessionExcluding(sessionID uuid.UUID, msg models.WSMessage, sender *websocket.Conn) {
	h.mu.RLock()
	connections := h.sessionConnections[sessionID]
	h.mu.RUnlock()

	for _, conn := range connections {
		if conn != sender {
			h.sendToConnection(conn, msg)
		}
	}
}

// sendToConnection sends a message to a specific connection
func (h *ChatWebSocketHandler) sendToConnection(conn *websocket.Conn, msg models.WSMessage) {
	err := conn.WriteJSON(msg)
	if err != nil {
		log.Printf("Failed to send WebSocket message: %v", err)
		conn.Close()
	}
}

// sendError sends an error message to a connection
func (h *ChatWebSocketHandler) sendError(conn *websocket.Conn, errorMsg string) {
	msg := models.WSMessage{
		Type: "error",
		Data: map[string]interface{}{
			"error": errorMsg,
		},
		Timestamp: time.Now(),
	}
	h.sendToConnection(conn, msg)
}

// BroadcastToAgents broadcasts a message to all agent connections
func (h *ChatWebSocketHandler) BroadcastToAgents(msg models.WSMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for connID, conn := range h.connections {
		if conn != nil && len(connID) > 6 && connID[:6] == "agent_" {
			h.sendToConnection(conn, msg)
		}
	}
}

// NotifyAgentOfNewSession notifies agents of a new chat session
func (h *ChatWebSocketHandler) NotifyAgentOfNewSession(session *models.ChatSession) {
	msg := models.WSMessage{
		Type:      "new_session",
		SessionID: session.ID,
		Data:      session,
		Timestamp: time.Now(),
	}
	h.BroadcastToAgents(msg)
}
