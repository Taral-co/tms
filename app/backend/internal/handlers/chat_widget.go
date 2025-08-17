package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/service"
)

type ChatWidgetHandler struct {
	chatWidgetService *service.ChatWidgetService
}

func NewChatWidgetHandler(chatWidgetService *service.ChatWidgetService) *ChatWidgetHandler {
	return &ChatWidgetHandler{
		chatWidgetService: chatWidgetService,
	}
}

// CreateChatWidget creates a new chat widget
func (h *ChatWidgetHandler) CreateChatWidget(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	var req models.CreateChatWidgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	widget, err := h.chatWidgetService.CreateChatWidget(c.Request.Context(), tenantID, projectID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chat widget: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, widget)
}

// GetChatWidget gets a chat widget by ID
func (h *ChatWidgetHandler) GetChatWidget(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	widgetIDStr := c.Param("widget_id")
	widgetID, err := uuid.Parse(widgetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid widget ID format"})
		return
	}

	widget, err := h.chatWidgetService.GetChatWidget(c.Request.Context(), tenantID, projectID, widgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat widget"})
		return
	}
	if widget == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat widget not found"})
		return
	}

	c.JSON(http.StatusOK, widget)
}

// ListChatWidgets lists all chat widgets for a project
func (h *ChatWidgetHandler) ListChatWidgets(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	widgets, err := h.chatWidgetService.ListChatWidgets(c.Request.Context(), tenantID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list chat widgets"})
		return
	}

	if widgets == nil {
		widgets = []*models.ChatWidget{}
	}

	c.JSON(http.StatusOK, gin.H{"widgets": widgets})
}

// UpdateChatWidget updates a chat widget
func (h *ChatWidgetHandler) UpdateChatWidget(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	widgetIDStr := c.Param("widget_id")
	widgetID, err := uuid.Parse(widgetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid widget ID format"})
		return
	}

	var req models.UpdateChatWidgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	widget, err := h.chatWidgetService.UpdateChatWidget(c.Request.Context(), tenantID, projectID, widgetID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update chat widget: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, widget)
}

// DeleteChatWidget deletes a chat widget
func (h *ChatWidgetHandler) DeleteChatWidget(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	widgetIDStr := c.Param("widget_id")
	widgetID, err := uuid.Parse(widgetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid widget ID format"})
		return
	}

	err = h.chatWidgetService.DeleteChatWidget(c.Request.Context(), tenantID, projectID, widgetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete chat widget"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetChatWidgetByDomain gets a chat widget by domain (public endpoint)
func (h *ChatWidgetHandler) GetChatWidgetByDomain(c *gin.Context) {
	domain := c.Param("domain")
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Domain is required"})
		return
	}

	widget, err := h.chatWidgetService.GetChatWidgetByDomain(c.Request.Context(), domain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get chat widget"})
		return
	}
	if widget == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chat widget not found for domain"})
		return
	}

	c.JSON(http.StatusOK, widget)
}
