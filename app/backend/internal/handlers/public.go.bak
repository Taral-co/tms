package handlers

import (
	"net/http"
	"strconv"

	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
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
