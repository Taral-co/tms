package handlers

import (
	"net/http"

	"github.com/bareuptime/tms/internal/middleware"
	"github.com/bareuptime/tms/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService   *service.AuthService
	publicService *service.PublicService
	validator     *validator.Validate
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *service.AuthService, publicService *service.PublicService) *AuthHandler {
	return &AuthHandler{
		authService:   authService,
		publicService: publicService,
		validator:     validator.New(),
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	User         User   `json:"user"`
}

// User represents the user data returned in login response
type User struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	TenantID string `json:"tenant_id"`
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	tenantID := c.Param("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant ID is required"})
		return
	}

	loginReq := service.LoginRequest{
		Email:    req.Email,
		Password: req.Password,
		TenantID: tenantID,
	}

	response, err := h.authService.Login(c.Request.Context(), loginReq)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Determine primary role (use tenant_admin if available, otherwise first role found)
	primaryRole := "agent" // default
	for _, roles := range response.RoleBindings {
		for _, role := range roles {
			if role == "tenant_admin" {
				primaryRole = role
				break
			}
			if primaryRole == "agent" { // Only set if we haven't found a better role
				primaryRole = role
			}
		}
		if primaryRole == "tenant_admin" {
			break
		}
	}

	c.JSON(http.StatusOK, LoginResponse{
		AccessToken:  response.AccessToken,
		RefreshToken: response.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600, // 1 hour
		User: User{
			ID:       response.Agent.ID.String(),
			Email:    response.Agent.Email,
			Name:     response.Agent.Name,
			Role:     primaryRole,
			TenantID: response.Agent.TenantID.String(),
		},
	})
}

// RefreshRequest represents a refresh token request
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// RefreshResponse represents a refresh token response
type RefreshResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// Refresh handles token refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed", "details": err.Error()})
		return
	}

	tenantID := c.Param("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant ID is required"})
		return
	}

	refreshReq := service.RefreshTokenRequest{
		RefreshToken: req.RefreshToken,
	}

	response, err := h.authService.RefreshToken(c.Request.Context(), refreshReq)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, RefreshResponse{
		AccessToken: response.AccessToken,
		TokenType:   "Bearer",
		ExpiresIn:   3600, // 1 hour
	})
}

// GenerateMagicLinkRequest represents a magic link generation request
type GenerateMagicLinkRequest struct {
	TicketID string `json:"ticket_id" validate:"required,uuid"`
}

// GenerateMagicLinkResponse represents a magic link generation response
type GenerateMagicLinkResponse struct {
	MagicLink string `json:"magic_link"`
	ExpiresIn int    `json:"expires_in"`
}

// GenerateMagicLink handles magic link generation
func (h *AuthHandler) GenerateMagicLink(c *gin.Context) {
	var req GenerateMagicLinkRequest
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
	agentID := middleware.GetUserID(c)

	if tenantID == "" || projectID == "" || agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameters"})
		return
	}

	magicLink, err := h.publicService.GenerateMagicLinkToken(tenantID, projectID, req.TicketID, agentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, GenerateMagicLinkResponse{
		MagicLink: magicLink,
		ExpiresIn: 86400, // 24 hours
	})
}

// LogoutResponse represents a logout response
type LogoutResponse struct {
	Message string `json:"message"`
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// For stateless JWT, logout is handled client-side by removing the token
	// In a production system, you might want to maintain a blacklist of revoked tokens
	c.JSON(http.StatusOK, LogoutResponse{
		Message: "Logged out successfully",
	})
}

// MeResponse represents the current user information
type MeResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	TenantID string `json:"tenant_id"`
}

// Me returns current user information
func (h *AuthHandler) Me(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	c.JSON(http.StatusOK, MeResponse{
		ID:       claims.Subject,
		Email:    claims.Email,
		Name:     claims.Email, // Use email as name since Name field doesn't exist
		TenantID: claims.TenantID,
	})
}
