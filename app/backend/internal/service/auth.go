package service

import (
	"context"
	"fmt"

	"github.com/bareuptime/tms/internal/auth"
	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles authentication operations
type AuthService struct {
	agentRepo   repo.AgentRepository
	rbacService *rbac.Service
	authService *auth.Service
}

// NewAuthService creates a new auth service
func NewAuthService(agentRepo repo.AgentRepository, rbacService *rbac.Service, authService *auth.Service) *AuthService {
	return &AuthService{
		agentRepo:   agentRepo,
		rbacService: rbacService,
		authService: authService,
	}
}

// convertRoleBindings converts role bindings to map format
func (s *AuthService) convertRoleBindings(roleBindings []*db.RoleBinding) map[string][]string {
	result := make(map[string][]string)
	for _, binding := range roleBindings {
		projectKey := ""
		if binding.ProjectID != nil {
			projectKey = binding.ProjectID.String()
		}
		if result[projectKey] == nil {
			result[projectKey] = []string{}
		}
		result[projectKey] = append(result[projectKey], binding.Role.String())
	}
	return result
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
	TenantID string `json:"tenant_id" validate:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
	Agent        *db.Agent           `json:"agent"`
	RoleBindings map[string][]string `json:"role_bindings"`
}

// Login authenticates an agent and returns tokens
func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	tenantID, err := uuid.Parse(req.TenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant ID: %w", err)
	}

	// Get agent by email
	agent, err := s.agentRepo.GetByEmail(ctx, tenantID, req.Email)
	if err != nil {
		return nil, fmt.Errorf("agent not found: %w", err)
	}

	// Verify password
	if agent.PasswordHash == nil {
		return nil, fmt.Errorf("account not configured for password login")
	}

	err = bcrypt.CompareHashAndPassword([]byte(*agent.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Get role bindings
	roleBindings, err := s.rbacService.GetAgentRoleBindings(ctx, agent.ID, agent.TenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role bindings: %w", err)
	}

	fmt.Println("Role bindings:", roleBindings)

	// Generate tokens
	accessToken, err := s.authService.GenerateAccessToken(
		agent.ID.String(),
		agent.TenantID.String(),
		agent.Email,
		s.convertRoleBindings(roleBindings),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.authService.GenerateRefreshToken(
		agent.ID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Remove password hash from response
	agent.PasswordHash = nil

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Agent:        agent,
		RoleBindings: s.convertRoleBindings(roleBindings),
	}, nil
}

// RefreshTokenRequest represents a refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// RefreshToken generates new access token from refresh token
func (s *AuthService) RefreshToken(ctx context.Context, req RefreshTokenRequest) (*LoginResponse, error) {
	// Validate refresh token
	claims, err := s.authService.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	if claims.TokenType != "refresh" {
		return nil, fmt.Errorf("invalid token type")
	}

	// Get agent
	agentID, err := uuid.Parse(claims.AgentID)
	if err != nil {
		return nil, fmt.Errorf("invalid agent ID in token")
	}

	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant ID in token")
	}

	agent, err := s.agentRepo.GetByID(ctx, tenantID, agentID)
	if err != nil {
		return nil, fmt.Errorf("agent not found")
	}

	// Check if agent is active
	if agent.Status != "active" {
		return nil, fmt.Errorf("account is not active")
	}

	// Get role bindings
	roleBindings, err := s.rbacService.GetAgentRoleBindings(ctx, agent.ID, agent.TenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role bindings: %w", err)
	}

	// Generate new access token
	accessToken, err := s.authService.GenerateAccessToken(
		agent.ID.String(),
		agent.TenantID.String(),
		agent.Email,
		s.convertRoleBindings(roleBindings),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Remove password hash from response
	agent.PasswordHash = nil

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: req.RefreshToken, // Return the same refresh token
		Agent:        agent,
		RoleBindings: s.convertRoleBindings(roleBindings),
	}, nil
}

// MagicLinkRequest represents a magic link request
type MagicLinkRequest struct {
	Email    string `json:"email" validate:"required,email"`
	TenantID string `json:"tenant_id" validate:"required"`
}

// SendMagicLink sends a magic link for passwordless login
func (s *AuthService) SendMagicLink(ctx context.Context, req MagicLinkRequest) error {
	tenantID, err := uuid.Parse(req.TenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %w", err)
	}

	// Get agent by email
	agent, err := s.agentRepo.GetByEmail(ctx, tenantID, req.Email)
	if err != nil {
		// Don't reveal if email exists or not
		return nil
	}

	// Check if agent is active
	if agent.Status != "active" {
		return nil
	}

	// Generate magic link token
	token, err := s.authService.GenerateMagicLinkToken(
		agent.Email,
	)
	if err != nil {
		return fmt.Errorf("failed to generate magic link token: %w", err)
	}

	// TODO: Send email with magic link
	// For now, just log the token (in production, this should send an email)
	_ = token

	return nil
}

// ConsumeMagicLinkRequest represents a magic link consumption request
type ConsumeMagicLinkRequest struct {
	Token string `json:"token" validate:"required"`
}

// ConsumeMagicLink exchanges magic link token for access token
func (s *AuthService) ConsumeMagicLink(ctx context.Context, req ConsumeMagicLinkRequest) (*LoginResponse, error) {
	// Validate magic link token
	claims, err := s.authService.ValidateToken(req.Token)
	if err != nil {
		return nil, fmt.Errorf("invalid magic link token: %w", err)
	}

	if claims.TokenType != "magic_link" {
		return nil, fmt.Errorf("invalid token type")
	}

	// Get agent
	agentID, err := uuid.Parse(claims.AgentID)
	if err != nil {
		return nil, fmt.Errorf("invalid agent ID in token")
	}

	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant ID in token")
	}

	agent, err := s.agentRepo.GetByID(ctx, tenantID, agentID)
	if err != nil {
		return nil, fmt.Errorf("agent not found")
	}

	// Check if agent is active
	if agent.Status != "active" {
		return nil, fmt.Errorf("account is not active")
	}

	// Get role bindings
	roleBindings, err := s.rbacService.GetAgentRoleBindings(ctx, agent.ID, agent.TenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role bindings: %w", err)
	}

	// Generate tokens
	accessToken, err := s.authService.GenerateAccessToken(
		agent.ID.String(),
		agent.TenantID.String(),
		agent.Email,
		s.convertRoleBindings(roleBindings),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.authService.GenerateRefreshToken(
		agent.ID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Remove password hash from response
	agent.PasswordHash = nil

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Agent:        agent,
		RoleBindings: s.convertRoleBindings(roleBindings),
	}, nil
}

// HashPassword hashes a password using bcrypt
func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}
