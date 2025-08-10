package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ApiKey represents an API key model
type ApiKey struct {
	ID         string     `json:"id"`
	TenantID   string     `json:"tenant_id"`
	ProjectID  *string    `json:"project_id,omitempty"`
	Name       string     `json:"name"`
	KeyPreview string     `json:"key_preview"`
	KeyHash    string     `json:"-"` // Never expose the hash
	CreatedAt  time.Time  `json:"created_at"`
	LastUsed   *time.Time `json:"last_used,omitempty"`
	IsActive   bool       `json:"is_active"`
	CreatedBy  string     `json:"created_by"`
}

type ApiKeyHandler struct {
	// In-memory store for demonstration (replace with database in production)
	store map[string]*ApiKey
	mutex sync.RWMutex
}

func NewApiKeyHandler() *ApiKeyHandler {
	return &ApiKeyHandler{
		store: make(map[string]*ApiKey),
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

// ApiKeyWithValueResponse represents an API key response with the full key value (only for creation)
type ApiKeyWithValueResponse struct {
	ApiKeyResponse
	Key string `json:"key"`
}

// ListApiKeys handles GET /tenants/:tenantId/api-keys
func (h *ApiKeyHandler) ListApiKeys(c *gin.Context) {
	tenantID := c.Param("tenantId")

	h.mutex.RLock()
	defer h.mutex.RUnlock()

	var response []ApiKeyResponse
	for _, apiKey := range h.store {
		if apiKey.TenantID == tenantID {
			response = append(response, ApiKeyResponse{
				ID:         apiKey.ID,
				Name:       apiKey.Name,
				KeyPreview: apiKey.KeyPreview,
				CreatedAt:  apiKey.CreatedAt,
				LastUsed:   apiKey.LastUsed,
				IsActive:   apiKey.IsActive,
			})
		}
	}
	c.JSON(http.StatusOK, response)
}

// CreateApiKey handles POST /tenants/:tenantId/api-keys
func (h *ApiKeyHandler) CreateApiKey(c *gin.Context) {
	tenantID := c.Param("tenantId")
	agentID := c.GetString("agent_id") // Get from middleware context

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
	keyRecord := &ApiKey{
		ID:         uuid.New().String(),
		TenantID:   tenantID,
		ProjectID:  nil, // Tenant-level API keys
		Name:       req.Name,
		KeyPreview: apiKey[:12] + "...", // Store preview
		KeyHash:    hashApiKey(apiKey),  // Store hash, not the actual key
		CreatedAt:  time.Now(),
		IsActive:   true,
		CreatedBy:  agentID,
	}

	// Store in memory
	h.mutex.Lock()
	h.store[keyRecord.ID] = keyRecord
	h.mutex.Unlock()

	// Return the API key with the full value (only time it's shown)
	response := ApiKeyWithValueResponse{
		ApiKeyResponse: ApiKeyResponse{
			ID:         keyRecord.ID,
			Name:       keyRecord.Name,
			KeyPreview: keyRecord.KeyPreview,
			CreatedAt:  keyRecord.CreatedAt,
			LastUsed:   keyRecord.LastUsed,
			IsActive:   keyRecord.IsActive,
		},
		Key: apiKey,
	}

	c.JSON(http.StatusCreated, response)
}

// GetApiKey handles GET /tenants/:tenantId/projects/:projectId/api-keys/:keyId
func (h *ApiKeyHandler) GetApiKey(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
}

// UpdateApiKey handles PUT /tenants/:tenantId/projects/:projectId/api-keys/:keyId
func (h *ApiKeyHandler) UpdateApiKey(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
}

// DeleteApiKey handles DELETE /tenants/:tenantId/api-keys/:keyId
func (h *ApiKeyHandler) DeleteApiKey(c *gin.Context) {
	tenantID := c.Param("tenantId")
	keyID := c.Param("keyId")

	h.mutex.Lock()
	defer h.mutex.Unlock()

	apiKey, exists := h.store[keyID]
	if !exists || apiKey.TenantID != tenantID {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	delete(h.store, keyID)
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

// hashApiKey creates a hash of the API key for storage (implement based on your security requirements)
func hashApiKey(key string) string {
	// This is a simplified version - in production, use proper password hashing
	// like bcrypt or argon2
	return key[:8] + "..." // For demo purposes, just store prefix
}

// maskApiKey creates a masked version of the API key for display
func maskApiKey(keyHash string) string {
	if len(keyHash) >= 8 {
		return keyHash[:8] + "..."
	}
	return keyHash
}
