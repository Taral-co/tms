package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// PublicHandler handles public endpoints (magic link access)
type PublicHandler struct {
	publicService *service.PublicService
	validator     *validator.Validate
}

// NewPublicHandler creates a new public handler
func NewPublicHandler(publicService *service.PublicService) *PublicHandler {
	return &PublicHandler{
		publicService: publicService,
		validator:     validator.New(),
	}
}

// GetTicketByMagicLink handles public ticket access via magic link
func (h *PublicHandler) GetTicketByMagicLink(c *gin.Context) {
	magicToken := c.Query("token")
	if magicToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Magic token is required"})
		return
	}

	ticket, err := h.publicService.GetTicketByMagicLink(c.Request.Context(), magicToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// GetTicketMessagesByMagicLink handles public ticket messages access via magic link
func (h *PublicHandler) GetTicketMessagesByMagicLink(c *gin.Context) {
	magicToken := c.Query("token")
	if magicToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Magic token is required"})
		return
	}

	// Parse query parameters
	cursor := c.Query("cursor")
	limit := 50 // default limit

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	messages, nextCursor, err := h.publicService.GetTicketMessagesByMagicLink(c.Request.Context(), magicToken, cursor, limit)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
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

// AddMessageByMagicLink handles adding a public message via magic link
func (h *PublicHandler) AddMessageByMagicLink(c *gin.Context) {
	magicToken := c.Query("token")
	if magicToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Magic token is required"})
		return
	}

	var req service.AddPublicMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	message, err := h.publicService.AddMessageByMagicLink(c.Request.Context(), magicToken, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, message)
}

// GenerateMagicLink generates a magic link for testing purposes
// This endpoint should be removed in production
func (h *PublicHandler) GenerateMagicLink(c *gin.Context) {
	type GenerateMagicLinkRequest struct {
		TenantID   string `json:"tenant_id" binding:"required"`
		ProjectID  string `json:"project_id" binding:"required"`
		TicketID   string `json:"ticket_id" binding:"required"`
		CustomerID string `json:"customer_id" binding:"required"`
	}

	var req GenerateMagicLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse UUIDs
	tenantID, err := uuid.Parse(req.TenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant_id"})
		return
	}

	projectID, err := uuid.Parse(req.ProjectID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project_id"})
		return
	}

	ticketID, err := uuid.Parse(req.TicketID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket_id"})
		return
	}

	customerID, err := uuid.Parse(req.CustomerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer_id"})
		return
	}

	// Generate magic link token
	token, err := h.publicService.GenerateMagicLinkToken(tenantID, projectID, ticketID, customerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate magic link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"magic_token": token,
		"public_url":  fmt.Sprintf("http://localhost:8081/index.html?token=%s", token),
	})
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
	Time    string `json:"time"`
}

// Health handles health check endpoint
func (h *PublicHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status:  "healthy",
		Version: "1.0.0",
		Time:    "2024-01-01T00:00:00Z", // This would be set at build time
	})
}
