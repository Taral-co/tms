package handlers

import (
	"log"
	"net/http"

	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
)

type TenantHandler struct {
	tenantService *service.TenantService
}

func NewTenantHandler(tenantService *service.TenantService) *TenantHandler {
	return &TenantHandler{
		tenantService: tenantService,
	}
}

// ListTenants handles GET /tenants - Admin only
func (h *TenantHandler) ListTenants(c *gin.Context) {
	// Get requestor agent ID from JWT claims
	agentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	requestorAgentID, ok := agentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	tenants, err := h.tenantService.ListTenants(c.Request.Context(), requestorAgentID)
	if err != nil {
		log.Printf("Failed to list tenants: %v", err)
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tenants": tenants})
}
