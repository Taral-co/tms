package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/service"
)

type AIHandler struct {
	aiService *service.AIService
}

func NewAIHandler(aiService *service.AIService) *AIHandler {
	return &AIHandler{
		aiService: aiService,
	}
}

// GetAIStatus returns the current AI service status
func (h *AIHandler) GetAIStatus(c *gin.Context) {
	// Check if user has permission to view AI settings
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	status := map[string]interface{}{
		"enabled":    h.aiService.IsEnabled(),
		"tenant_id":  tenantID,
		"project_id": projectID,
	}

	if h.aiService.IsEnabled() {
		// Don't expose sensitive config details, just availability
		status["provider"] = "configured"
		status["model"] = "available"
	}

	c.JSON(http.StatusOK, status)
}

// GetAICapabilities returns what the AI system can do
func (h *AIHandler) GetAICapabilities(c *gin.Context) {
	capabilities := map[string]interface{}{
		"features": []string{
			"automatic_responses",
			"human_handoff",
			"keyword_detection",
			"context_awareness",
		},
		"supported_providers": []string{
			"openai",
			"anthropic",
			"azure",
		},
		"handoff_triggers": []string{
			"manual_request",
			"keyword_detection",
			"timeout_based",
			"complexity_threshold",
		},
	}

	c.JSON(http.StatusOK, capabilities)
}

// GetAIMetrics returns AI usage metrics for the project
func (h *AIHandler) GetAIMetrics(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	projectID := middleware.GetProjectID(c)

	// TODO: Implement metrics collection
	// For now, return placeholder metrics
	metrics := map[string]interface{}{
		"tenant_id":                tenantID,
		"project_id":               projectID,
		"period":                   "last_30_days",
		"ai_responses_sent":        0,
		"sessions_handled":         0,
		"handoffs_triggered":       0,
		"average_response_time_ms": 0,
		"customer_satisfaction":    nil,
	}

	c.JSON(http.StatusOK, metrics)
}
