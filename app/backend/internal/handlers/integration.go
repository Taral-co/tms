package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/service"
)

type IntegrationHandler struct {
	integrationService *service.IntegrationService
}

func NewIntegrationHandler(integrationService *service.IntegrationService) *IntegrationHandler {
	return &IntegrationHandler{
		integrationService: integrationService,
	}
}

// RegisterRoutes registers all integration-related routes
func (h *IntegrationHandler) RegisterRoutes(rg *gin.RouterGroup) {
	integrations := rg.Group("/integrations")
	{
		integrations.POST("", h.CreateIntegration)
		integrations.GET("", h.ListIntegrations)
		integrations.GET("/:id", h.GetIntegration)
		integrations.PUT("/:id", h.UpdateIntegration)
		integrations.DELETE("/:id", h.DeleteIntegration)
		integrations.POST("/:id/test", h.TestIntegration)

		// Webhook subscriptions
		integrations.POST("/webhooks", h.CreateWebhookSubscription)
		integrations.GET("/webhooks", h.ListWebhookSubscriptions)

		// Integration-specific configurations
		integrations.POST("/slack", h.CreateSlackConfiguration)
		integrations.POST("/jira", h.CreateJiraConfiguration)
		integrations.POST("/calendly", h.CreateCalendlyConfiguration)
		integrations.POST("/zapier", h.CreateZapierConfiguration)
	}
}

// Integration CRUD operations
func (h *IntegrationHandler) CreateIntegration(c *gin.Context) {
	tenantID := getTenantID(c)
	projectID := getProjectID(c)

	var req models.CreateIntegrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	integration, err := h.integrationService.CreateIntegration(c.Request.Context(), tenantID, projectID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create integration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, integration)
}

func (h *IntegrationHandler) GetIntegration(c *gin.Context) {
	tenantID := getTenantID(c)
	integrationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration ID"})
		return
	}

	integration, err := h.integrationService.GetIntegration(c.Request.Context(), tenantID, integrationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
		return
	}

	c.JSON(http.StatusOK, integration)
}

func (h *IntegrationHandler) ListIntegrations(c *gin.Context) {
	tenantID := getTenantID(c)
	projectID := getProjectID(c)

	// Parse query parameters
	var integrationType *models.IntegrationType
	if typeParam := c.Query("type"); typeParam != "" {
		iType := models.IntegrationType(typeParam)
		integrationType = &iType
	}

	var status *models.IntegrationStatus
	if statusParam := c.Query("status"); statusParam != "" {
		iStatus := models.IntegrationStatus(statusParam)
		status = &iStatus
	}

	integrations, err := h.integrationService.ListIntegrations(c.Request.Context(), tenantID, projectID, integrationType, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list integrations", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": integrations})
}

func (h *IntegrationHandler) UpdateIntegration(c *gin.Context) {
	tenantID := getTenantID(c)
	integrationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration ID"})
		return
	}

	var req models.UpdateIntegrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	integration, err := h.integrationService.UpdateIntegration(c.Request.Context(), tenantID, integrationID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update integration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, integration)
}

func (h *IntegrationHandler) DeleteIntegration(c *gin.Context) {
	tenantID := getTenantID(c)
	integrationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration ID"})
		return
	}

	if err := h.integrationService.DeleteIntegration(c.Request.Context(), tenantID, integrationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete integration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *IntegrationHandler) TestIntegration(c *gin.Context) {
	tenantID := getTenantID(c)
	integrationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration ID"})
		return
	}

	if err := h.integrationService.TestIntegration(c.Request.Context(), tenantID, integrationID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Integration test failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Integration test successful"})
}

// Webhook subscription operations
func (h *IntegrationHandler) CreateWebhookSubscription(c *gin.Context) {
	tenantID := getTenantID(c)
	projectID := getProjectID(c)

	var req models.CreateWebhookSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	subscription, err := h.integrationService.CreateWebhookSubscription(c.Request.Context(), tenantID, projectID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create webhook subscription", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, subscription)
}

func (h *IntegrationHandler) ListWebhookSubscriptions(c *gin.Context) {
	tenantID := getTenantID(c)
	projectID := getProjectID(c)

	var integrationID *uuid.UUID
	if idParam := c.Query("integration_id"); idParam != "" {
		id, err := uuid.Parse(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid integration ID"})
			return
		}
		integrationID = &id
	}

	subscriptions, err := h.integrationService.ListWebhookSubscriptions(c.Request.Context(), tenantID, projectID, integrationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list webhook subscriptions", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": subscriptions})
}

// Integration-specific configuration operations
func (h *IntegrationHandler) CreateSlackConfiguration(c *gin.Context) {
	tenantID := getTenantID(c)

	var req models.CreateSlackConfigurationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	config, err := h.integrationService.CreateSlackConfiguration(c.Request.Context(), tenantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Slack configuration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, config)
}

func (h *IntegrationHandler) CreateJiraConfiguration(c *gin.Context) {
	tenantID := getTenantID(c)

	var req models.CreateJiraConfigurationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	config, err := h.integrationService.CreateJiraConfiguration(c.Request.Context(), tenantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create JIRA configuration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, config)
}

func (h *IntegrationHandler) CreateCalendlyConfiguration(c *gin.Context) {
	tenantID := getTenantID(c)

	var req models.CreateCalendlyConfigurationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	config, err := h.integrationService.CreateCalendlyConfiguration(c.Request.Context(), tenantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Calendly configuration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, config)
}

func (h *IntegrationHandler) CreateZapierConfiguration(c *gin.Context) {
	tenantID := getTenantID(c)

	var req models.CreateZapierConfigurationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format", "details": err.Error()})
		return
	}

	config, err := h.integrationService.CreateZapierConfiguration(c.Request.Context(), tenantID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Zapier configuration", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, config)
}

// Helper functions (these would be implemented elsewhere in your codebase)
func getTenantID(c *gin.Context) uuid.UUID {
	// Extract tenant ID from context (set by middleware)
	if tenantID, exists := c.Get("tenant_id"); exists {
		if id, ok := tenantID.(uuid.UUID); ok {
			return id
		}
	}
	// Return a default or handle error appropriately
	return uuid.Nil
}

func getProjectID(c *gin.Context) uuid.UUID {
	// Extract project ID from context or query parameter
	if projectID, exists := c.Get("project_id"); exists {
		if id, ok := projectID.(uuid.UUID); ok {
			return id
		}
	}

	// Try to get from query parameter
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if id, err := uuid.Parse(projectIDStr); err == nil {
			return id
		}
	}

	// Return a default or handle error appropriately
	return uuid.Nil
}
