package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/bareuptime/tms/internal/service"
)

type ChatSessionHandler struct {
	chatSessionService *service.ChatSessionService
	chatWidgetService  *service.ChatWidgetService
}

func NewChatSessionHandler(chatSessionService *service.ChatSessionService, chatWidgetService *service.ChatWidgetService) *ChatSessionHandler {
	return &ChatSessionHandler{
		chatSessionService: chatSessionService,
		chatWidgetService:  chatWidgetService,
	}
}

// InitiateChat starts a new chat session (public endpoint)
func (h *ChatSessionHandler) InitiateChat(c *gin.Context) {
	widgetIDStr := c.Param("widget_id")
	widgetID, err := uuid.Parse(widgetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid widget ID format"})
		return
	}

	var req models.InitiateChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Add request metadata
	if req.VisitorInfo == nil {
		req.VisitorInfo = make(models.JSONMap)
	}
	req.VisitorInfo["ip"] = c.ClientIP()
	req.VisitorInfo["user_agent"] = c.GetHeader("User-Agent")
	req.VisitorInfo["referer"] = c.GetHeader("Referer")
	req.VisitorInfo["domain"] = c.GetHeader("Origin")

	session, err := h.chatSessionService.InitiateChat(c.Request.Context(), widgetID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate chat: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"session_id":    session.ID,
		"session_token": session.SessionToken,
		"widget_id":     session.WidgetID,
	})
}

// GetChatSession gets a chat session by ID
func (h *ChatSessionHandler) GetChatSession(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)
	
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	session, err := h.chatSessionService.GetChatSession(c.Request.Context(), tenantID, projectID, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat session"})
		return
	}
	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// GetChatSessionByToken gets a chat session by token (public endpoint)
func (h *ChatSessionHandler) GetChatSessionByToken(c *gin.Context) {
	sessionToken := c.Param("session_token")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session token is required"})
		return
	}

	session, err := h.chatSessionService.GetChatSessionByToken(c.Request.Context(), sessionToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat session"})
		return
	}
	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// ListChatSessions lists chat sessions for a project
func (h *ChatSessionHandler) ListChatSessions(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	// Parse query parameters
	filters := repo.ChatSessionFilters{}
	
	if status := c.Query("status"); status != "" {
		filters.Status = status
	}
	
	if agentIDStr := c.Query("assigned_agent_id"); agentIDStr != "" {
		if agentID, err := uuid.Parse(agentIDStr); err == nil {
			filters.AssignedAgentID = &agentID
		}
	}
	
	if widgetIDStr := c.Query("widget_id"); widgetIDStr != "" {
		if widgetID, err := uuid.Parse(widgetIDStr); err == nil {
			filters.WidgetID = &widgetID
		}
	}
	
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filters.Limit = limit
		}
	}

	sessions, err := h.chatSessionService.ListChatSessions(c.Request.Context(), tenantID, projectID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list chat sessions"})
		return
	}

	if sessions == nil {
		sessions = []*models.ChatSession{}
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// GetActiveSessions gets active sessions for the current agent
func (h *ChatSessionHandler) GetActiveSessions(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	agentID := middleware.GetAgentID(c)

	sessions, err := h.chatSessionService.GetActiveSessions(c.Request.Context(), tenantID, agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active sessions"})
		return
	}

	if sessions == nil {
		sessions = []*models.ChatSession{}
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// AssignAgent assigns an agent to a chat session
func (h *ChatSessionHandler) AssignAgent(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)
	
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	var req models.AssignChatSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.chatSessionService.AssignAgent(c.Request.Context(), tenantID, projectID, sessionID, req.AgentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign agent: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Agent assigned successfully"})
}

// EndSession ends a chat session
func (h *ChatSessionHandler) EndSession(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)
	
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	err = h.chatSessionService.EndSession(c.Request.Context(), tenantID, projectID, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to end session: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session ended successfully"})
}

// SendMessage sends a message in a chat session (agent endpoint)
func (h *ChatSessionHandler) SendMessage(c *gin.Context) {
	agentID := middleware.GetAgentID(c)
	agentName := c.GetString("agent_name") // Should be set by middleware
	
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	var req models.SendChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message, err := h.chatSessionService.SendMessage(c.Request.Context(), sessionID, &req, "agent", &agentID, agentName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, message)
}

// SendVisitorMessage sends a message in a chat session (visitor endpoint)
func (h *ChatSessionHandler) SendVisitorMessage(c *gin.Context) {
	sessionToken := c.Param("session_token")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session token is required"})
		return
	}

	// Get session to validate token
	session, err := h.chatSessionService.GetChatSessionByToken(c.Request.Context(), sessionToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate session"})
		return
	}
	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid session token"})
		return
	}

	var req models.SendChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get visitor name from session
	visitorName := "Visitor"
	if session.CustomerName != "" {
		visitorName = session.CustomerName
	}

	message, err := h.chatSessionService.SendMessage(c.Request.Context(), session.ID, &req, "visitor", nil, visitorName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, message)
}

// GetChatMessages gets messages for a chat session
func (h *ChatSessionHandler) GetChatMessages(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)
	
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	includePrivate := c.Query("include_private") == "true"

	messages, err := h.chatSessionService.GetChatMessages(c.Request.Context(), tenantID, projectID, sessionID, includePrivate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}

	if messages == nil {
		messages = []*models.ChatMessage{}
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// GetVisitorMessages gets messages for a chat session (visitor endpoint)
func (h *ChatSessionHandler) GetVisitorMessages(c *gin.Context) {
	sessionToken := c.Param("session_token")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session token is required"})
		return
	}

	// Get session to validate token
	session, err := h.chatSessionService.GetChatSessionByToken(c.Request.Context(), sessionToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate session"})
		return
	}
	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid session token"})
		return
	}

	messages, err := h.chatSessionService.GetChatMessagesForSession(c.Request.Context(), session.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}

	if messages == nil {
		messages = []*models.ChatMessage{}
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// MarkMessagesAsRead marks messages as read
func (h *ChatSessionHandler) MarkMessagesAsRead(c *gin.Context) {
	sessionIDStr := c.Param("session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	err = h.chatSessionService.MarkMessagesAsRead(c.Request.Context(), sessionID, "agent")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark messages as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Messages marked as read"})
}

// MarkVisitorMessagesAsRead marks messages as read (visitor endpoint)
func (h *ChatSessionHandler) MarkVisitorMessagesAsRead(c *gin.Context) {
	sessionToken := c.Param("session_token")
	if sessionToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session token is required"})
		return
	}

	// Get session to validate token
	session, err := h.chatSessionService.GetChatSessionByToken(c.Request.Context(), sessionToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate session"})
		return
	}
	if session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid session token"})
		return
	}

	err = h.chatSessionService.MarkMessagesAsRead(c.Request.Context(), session.ID, "visitor")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark messages as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Messages marked as read"})
}
