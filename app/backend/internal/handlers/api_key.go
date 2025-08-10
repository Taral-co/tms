package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type ApiKeyHandler struct {
	apiKeyRepo repo.ApiKeyRepository
}

func NewApiKeyHandler(apiKeyRepo repo.ApiKeyRepository) *ApiKeyHandler {
	return &ApiKeyHandler{
		apiKeyRepo: apiKeyRepo,
	}
}

// ApiKeyRequest represents the request payload for creating an API key
type ApiKeyRequest struct {
	Name string `json:"name" binding:"required"`
}

// ApiKeyResponse represents an API key in responses
type ApiKeyResponse struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	KeyPreview string     `json:"key_preview"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsed   *time.Time `json:"last_used,omitempty"`
	IsActive   bool       `json:"is_active"`
}

// ApiKeyWithValueResponse includes the actual key value (only shown once during creation)
type ApiKeyWithValueResponse struct {
	ApiKeyResponse
	Key string `json:"key"`
}

// ListApiKeys handles GET /tenants/:tenant_id/api-keys
func (h *ApiKeyHandler) ListApiKeys(c *gin.Context) {
	tenantIDParam := c.Param("tenant_id")

	// Debug: log the tenant ID parameter and stack trace if error
	tenantID, err := uuid.Parse(tenantIDParam)
	if err != nil {
		println("Debug: UUID parse error:", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	// List tenant-level API keys (project_id = NULL)
	apiKeys, err := h.apiKeyRepo.List(c.Request.Context(), tenantID, nil)
	if err != nil {
		debug.PrintStack()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list API keys"})
		return
	}

	// Convert to response format (raw array per requirement)
	// Initialize as empty slice to ensure JSON returns [] instead of null
	response := make([]ApiKeyResponse, 0)
	for _, apiKey := range apiKeys {
		response = append(response, ApiKeyResponse{
			ID:         apiKey.ID.String(),
			Name:       apiKey.Name,
			KeyPreview: apiKey.KeyPrefix,
			CreatedAt:  apiKey.CreatedAt,
			LastUsed:   apiKey.LastUsedAt,
			IsActive:   apiKey.IsActive,
		})
	}

	c.JSON(http.StatusOK, response)
}

// CreateApiKey handles POST /tenants/:tenant_id/api-keys
func (h *ApiKeyHandler) CreateApiKey(c *gin.Context) {
	tenantIDParam := c.Param("tenant_id")
	tenantID, err := uuid.Parse(tenantIDParam)
	if err != nil {
		println("Debug: UUID parse error in CreateApiKey:", err.Error())
		debug.PrintStack()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	agentID := c.GetString("agent_id") // Get from middleware context
	if agentID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Agent ID required"})
		return
	}

	agentUUID, err := uuid.Parse(agentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid agent ID"})
		return
	}

	var req ApiKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate API key
	apiKey, err := generateApiKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate API key"})
		return
	}

	// Create API key record
	now := time.Now()
	keyRecord := &db.ApiKey{
		ID:        uuid.New(),
		TenantID:  tenantID,
		ProjectID: nil, // Tenant-level API keys
		Name:      req.Name,
		KeyHash:   repo.HashApiKey(apiKey),
		KeyPrefix: apiKey[:12] + "...", // Store preview
		Scopes:    pq.StringArray{},    // Default empty scopes as pq.StringArray
		IsActive:  true,
		CreatedBy: agentUUID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Store in database
	err = h.apiKeyRepo.Create(c.Request.Context(), keyRecord)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
		return
	}

	// Return the API key with the full value (only time it's shown)
	response := ApiKeyWithValueResponse{
		ApiKeyResponse: ApiKeyResponse{
			ID:         keyRecord.ID.String(),
			Name:       keyRecord.Name,
			KeyPreview: keyRecord.KeyPrefix,
			CreatedAt:  keyRecord.CreatedAt,
			LastUsed:   keyRecord.LastUsedAt,
			IsActive:   keyRecord.IsActive,
		},
		Key: apiKey,
	}

	c.JSON(http.StatusCreated, response)
}

// GetApiKey handles GET /tenants/:tenant_id/api-keys/:key_id
func (h *ApiKeyHandler) GetApiKey(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenant_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	keyID, err := uuid.Parse(c.Param("key_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
		return
	}

	apiKey, err := h.apiKeyRepo.GetByID(c.Request.Context(), tenantID, keyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	response := ApiKeyResponse{
		ID:         apiKey.ID.String(),
		Name:       apiKey.Name,
		KeyPreview: apiKey.KeyPrefix,
		CreatedAt:  apiKey.CreatedAt,
		LastUsed:   apiKey.LastUsedAt,
		IsActive:   apiKey.IsActive,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateApiKey handles PUT /tenants/:tenant_id/api-keys/:key_id
func (h *ApiKeyHandler) UpdateApiKey(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenant_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	keyID, err := uuid.Parse(c.Param("key_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
		return
	}

	var req struct {
		Name     string `json:"name"`
		IsActive *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing API key
	apiKey, err := h.apiKeyRepo.GetByID(c.Request.Context(), tenantID, keyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		apiKey.Name = req.Name
	}
	if req.IsActive != nil {
		apiKey.IsActive = *req.IsActive
	}

	// Save changes
	err = h.apiKeyRepo.Update(c.Request.Context(), apiKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update API key"})
		return
	}

	response := ApiKeyResponse{
		ID:         apiKey.ID.String(),
		Name:       apiKey.Name,
		KeyPreview: apiKey.KeyPrefix,
		CreatedAt:  apiKey.CreatedAt,
		LastUsed:   apiKey.LastUsedAt,
		IsActive:   apiKey.IsActive,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteApiKey handles DELETE /tenants/:tenant_id/api-keys/:key_id
func (h *ApiKeyHandler) DeleteApiKey(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenant_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	keyID, err := uuid.Parse(c.Param("key_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid key ID"})
		return
	}

	err = h.apiKeyRepo.Delete(c.Request.Context(), tenantID, keyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// generateApiKey generates a cryptographically secure API key
func generateApiKey() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "tms_" + hex.EncodeToString(bytes), nil
}
