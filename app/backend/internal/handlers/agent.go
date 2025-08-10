package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
)

type AgentHandler struct {
	agentService *service.AgentService
}

func NewAgentHandler(agentService *service.AgentService) *AgentHandler {
	return &AgentHandler{
		agentService: agentService,
	}
}

// ListAgents handles GET /agents
func (h *AgentHandler) ListAgents(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")

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

	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 50
	}

	req := service.ListAgentsRequest{
		Search: c.Query("search"),
		Cursor: c.Query("cursor"),
		Limit:  limit,
	}

	agents, nextCursor, err := h.agentService.ListAgents(c.Request.Context(), tenantIDStr, requestorAgentID, req)
	if err != nil {
		log.Printf("Failed to list agents: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch agents"})
		return
	}

	response := gin.H{
		"agents": agents,
	}
	if nextCursor != "" {
		response["next_cursor"] = nextCursor
	}

	c.JSON(http.StatusOK, response)
}

// DeleteAgent handles DELETE /agents/:agent_id
func (h *AgentHandler) DeleteAgent(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get requestor agent ID from JWT claims
	requestorAgentID, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	requestorAgentIDStr, ok := requestorAgentID.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	err := h.agentService.DeleteAgent(c.Request.Context(), tenantIDStr, agentIDStr, requestorAgentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Agent deleted successfully"})
}

// CreateAgent handles POST /agents
func (h *AgentHandler) CreateAgent(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")

	// Get creator agent ID from JWT claims
	agentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	creatorAgentID, ok := agentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	var req service.CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if req.Name == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and email are required"})
		return
	}

	agent, err := h.agentService.CreateAgent(c.Request.Context(), tenantIDStr, creatorAgentID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create agent"})
		return
	}

	c.JSON(http.StatusCreated, agent)
}

// GetAgent handles GET /agents/:agent_id
func (h *AgentHandler) GetAgent(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get requestor agent ID from JWT claims
	requestorAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	requestorAgentID, ok := requestorAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	agent, err := h.agentService.GetAgent(c.Request.Context(), tenantIDStr, agentIDStr, requestorAgentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		return
	}

	c.JSON(http.StatusOK, agent)
}

// UpdateAgent handles PATCH /agents/:agent_id
func (h *AgentHandler) UpdateAgent(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get updater agent ID from JWT claims
	updaterAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	updaterAgentID, ok := updaterAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	var req service.UpdateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	agent, err := h.agentService.UpdateAgent(c.Request.Context(), tenantIDStr, agentIDStr, updaterAgentID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update agent"})
		return
	}

	c.JSON(http.StatusOK, agent)
}

// AssignRole handles POST /agents/:agent_id/roles
func (h *AgentHandler) AssignRole(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get assigner agent ID from JWT claims
	assignerAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	assignerAgentID, ok := assignerAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	var req service.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	err := h.agentService.AssignRole(c.Request.Context(), tenantIDStr, agentIDStr, assignerAgentID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role assigned successfully"})
}

// RemoveRole handles DELETE /agents/:agent_id/roles
func (h *AgentHandler) RemoveRole(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get remover agent ID from JWT claims
	removerAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	removerAgentID, ok := removerAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	var req service.RemoveRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	err := h.agentService.RemoveRole(c.Request.Context(), tenantIDStr, agentIDStr, removerAgentID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role removed successfully"})
}

// GetAgentRoles handles GET /agents/:agent_id/roles
func (h *AgentHandler) GetAgentRoles(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get requestor agent ID from JWT claims
	requestorAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	requestorAgentID, ok := requestorAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	roles, err := h.agentService.GetAgentRoles(c.Request.Context(), tenantIDStr, agentIDStr, requestorAgentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get agent roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"roles": roles})
}

// AssignToProject handles POST /agents/:agent_id/projects/:project_id
func (h *AgentHandler) AssignToProject(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")
	projectIDStr := c.Param("project_id")

	// Get assigner agent ID from JWT claims
	assignerAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	assignerAgentID, ok := assignerAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	var req service.AssignToProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Set the project ID from URL parameter
	req.ProjectID = projectIDStr

	err := h.agentService.AssignToProject(c.Request.Context(), tenantIDStr, agentIDStr, assignerAgentID, req)
	if err != nil {
		log.Printf("Failed to assign agent to project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign agent to project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Agent assigned to project successfully"})
}

// RemoveFromProject handles DELETE /agents/:agent_id/projects/:project_id
func (h *AgentHandler) RemoveFromProject(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")
	projectIDStr := c.Param("project_id")

	// Get remover agent ID from JWT claims
	removerAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	removerAgentID, ok := removerAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	err := h.agentService.RemoveFromProject(c.Request.Context(), tenantIDStr, agentIDStr, projectIDStr, removerAgentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove agent from project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Agent removed from project successfully"})
}

// GetAgentProjects handles GET /agents/:agent_id/projects
func (h *AgentHandler) GetAgentProjects(c *gin.Context) {
	tenantIDStr := c.Param("tenant_id")
	agentIDStr := c.Param("agent_id")

	// Get requestor agent ID from JWT claims
	requestorAgentIDInterface, exists := c.Get("agent_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID not found in token"})
		return
	}

	requestorAgentID, ok := requestorAgentIDInterface.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid agent ID format"})
		return
	}

	projects, err := h.agentService.GetAgentProjects(c.Request.Context(), tenantIDStr, agentIDStr, requestorAgentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get agent projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}
