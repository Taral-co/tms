package handlers

import (
	"net/http"
	"strconv"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// TicketHandler handles ticket-related endpoints
type TicketHandler struct {
	ticketService  *service.TicketService
	messageService *service.MessageService
	validator      *validator.Validate
}

// NewTicketHandler creates a new ticket handler
func NewTicketHandler(ticketService *service.TicketService, messageService *service.MessageService) *TicketHandler {
	return &TicketHandler{
		ticketService:  ticketService,
		messageService: messageService,
		validator:      validator.New(),
	}
}

// CreateTicket handles ticket creation
func (h *TicketHandler) CreateTicket(c *gin.Context) {
	var req service.CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	tenantID := middleware.GetTenantID(c)
	projectIDStr := c.Param("project_id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project_id"})
		return
	}
	agentID := middleware.GetAgentID(c)

	ticket, err := h.ticketService.CreateTicket(c.Request.Context(), tenantID, projectID, agentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ticket)
}

// UpdateTicket handles ticket updates
func (h *TicketHandler) UpdateTicket(c *gin.Context) {
	var req service.UpdateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	ticketID := c.Param("ticket_id")
	agentID := middleware.GetAgentID(c)

	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)

	ticket, err := h.ticketService.UpdateTicket(c.Request.Context(), tenantID, projectUUID, ticketUUID, agentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// GetTicket handles ticket retrieval
func (h *TicketHandler) GetTicket(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	ticketID := c.Param("ticket_id")
	agentID := middleware.GetAgentID(c)

	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)

	ticket, err := h.ticketService.GetTicket(c.Request.Context(), tenantID, projectUUID, ticketUUID, agentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// ListTickets handles ticket listing
func (h *TicketHandler) ListTickets(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	agentID := middleware.GetAgentID(c)

	projectUUID, _ := uuid.Parse(projectID)

	// Parse query parameters
	req := service.ListTicketsRequest{
		Status:   c.QueryArray("status"),
		Priority: c.QueryArray("priority"),
		Tags:     c.QueryArray("tags"),
		Search:   c.Query("search"),
		Source:   c.QueryArray("source"),
		Type:     c.QueryArray("type"),
		Cursor:   c.Query("cursor"),
	}

	if assigneeID := c.Query("assignee_id"); assigneeID != "" {
		req.AssigneeID = &assigneeID
	}

	if requesterID := c.Query("requester_id"); requesterID != "" {
		req.RequesterID = &requesterID
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			req.Limit = limit
		}
	}

	tickets, nextCursor, err := h.ticketService.ListTickets(c.Request.Context(), tenantID, projectUUID, agentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"tickets": tickets,
	}

	if nextCursor != "" {
		response["next_cursor"] = nextCursor
	}

	c.JSON(http.StatusOK, response)
}

// AddMessage handles adding a message to a ticket
func (h *TicketHandler) AddMessage(c *gin.Context) {
	var req service.AddMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	ticketID := c.Param("ticket_id")
	agentID := middleware.GetAgentID(c)

	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)

	message, err := h.ticketService.AddMessage(c.Request.Context(), tenantID, projectUUID, ticketUUID, agentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, message)
}

// GetTicketMessages handles retrieving messages for a ticket
func (h *TicketHandler) GetTicketMessages(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	ticketID := c.Param("ticket_id")
	agentID := middleware.GetAgentID(c)

	// Parse query parameters
	includePrivate := c.Query("include_private") == "true"
	cursor := c.Query("cursor")
	limit := 50 // default limit

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)

	messages, nextCursor, err := h.messageService.GetTicketMessages(c.Request.Context(), tenantID, projectUUID, ticketUUID, agentID, includePrivate, cursor, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"messages": messages,
	}

	if nextCursor != "" {
		response["next_cursor"] = nextCursor
	}

	c.JSON(http.StatusOK, response)
}

// UpdateMessage handles updating a message
func (h *TicketHandler) UpdateMessage(c *gin.Context) {
	var req service.UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	ticketID := c.Param("ticket_id")
	messageID := c.Param("message_id")
	agentID := middleware.GetAgentID(c)
	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)
	messageUUID, _ := uuid.Parse(messageID)
	message, err := h.messageService.UpdateMessage(c.Request.Context(), tenantID, projectUUID, ticketUUID, messageUUID, agentID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, message)
}

// DeleteMessage handles deleting a message
func (h *TicketHandler) DeleteMessage(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := c.Param("project_id")
	ticketID := c.Param("ticket_id")
	messageID := c.Param("message_id")
	agentID := middleware.GetAgentID(c)

	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)
	messageUUID, _ := uuid.Parse(messageID)

	err := h.messageService.DeleteMessage(c.Request.Context(), tenantID, projectUUID, ticketUUID, messageUUID, agentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}
