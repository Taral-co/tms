package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	TenantID     string            `json:"tenant_id"`
	AgentID      string            `json:"agent_id"`
	Email        string            `json:"email"`
	RoleBindings map[string]string `json:"role_bindings"` // project_id -> role
	TokenType    string            `json:"token_type"`    // access, refresh, magic_link, unauth
	// Magic link specific fields
	ProjectID  string `json:"project_id,omitempty"`  // for magic links
	TicketID   string `json:"ticket_id,omitempty"`   // for magic links
	CustomerID string `json:"customer_id,omitempty"` // for magic links
	jwt.RegisteredClaims
}

type Service struct {
	secretKey          string
	accessTokenExpiry  time.Duration
	refreshTokenExpiry time.Duration
	magicLinkExpiry    time.Duration
	unauthTokenExpiry  time.Duration
}

func NewService(secretKey string, accessExpiry, refreshExpiry, magicLinkExpiry, unauthTokenExpiry int) *Service {
	return &Service{
		secretKey:          secretKey,
		accessTokenExpiry:  time.Duration(accessExpiry) * time.Second,
		refreshTokenExpiry: time.Duration(refreshExpiry) * time.Second,
		magicLinkExpiry:    time.Duration(magicLinkExpiry) * time.Second,
		unauthTokenExpiry:  time.Duration(unauthTokenExpiry) * time.Second,
	}
}

// GenerateAccessToken creates a JWT access token for an agent
func (s *Service) GenerateAccessToken(agentID, tenantID, email string, roleBindings map[string]string) (string, error) {
	now := time.Now()
	claims := Claims{
		TenantID:     tenantID,
		AgentID:      agentID,
		Email:        email,
		RoleBindings: roleBindings,
		TokenType:    "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   agentID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTokenExpiry)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tms",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secretKey))
}

// GenerateRefreshToken creates a JWT refresh token
func (s *Service) GenerateRefreshToken(agentID, tenantID string) (string, error) {
	now := time.Now()
	claims := Claims{
		TenantID:  tenantID,
		AgentID:   agentID,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   agentID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshTokenExpiry)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tms",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secretKey))
}

// GenerateMagicLinkToken creates a token for passwordless login
func (s *Service) GenerateMagicLinkToken(agentID, tenantID, email string) (string, error) {
	now := time.Now()
	claims := Claims{
		TenantID:  tenantID,
		AgentID:   agentID,
		Email:     email,
		TokenType: "magic_link",
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   agentID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.magicLinkExpiry)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tms",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secretKey))
}

// GenerateTicketMagicLinkToken creates a magic link token for ticket access
func (s *Service) GenerateTicketMagicLinkToken(tenantID, projectID, ticketID, customerID string) (string, error) {
	now := time.Now()
	claims := Claims{
		TenantID:   tenantID,
		ProjectID:  projectID,
		TicketID:   ticketID,
		CustomerID: customerID,
		TokenType:  "magic_link",
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   customerID, // Use customer ID as subject for ticket magic links
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.magicLinkExpiry)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tms",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secretKey))
}

// GenerateUnauthToken creates a token for unauthenticated ticket access
func (s *Service) GenerateUnauthToken(tenantID, projectID, ticketID string, scope string) (string, string, error) {
	now := time.Now()
	jti := uuid.New().String()

	claims := Claims{
		TenantID:  tenantID,
		TokenType: "unauth",
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   fmt.Sprintf("%s:%s:%s", tenantID, projectID, ticketID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.unauthTokenExpiry)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "tms",
			Audience:  []string{scope}, // Use audience for scope
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.secretKey))
	return signed, jti, err
}

// ValidateToken validates and parses a JWT token
func (s *Service) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.secretKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// ValidateUnauthToken validates an unauthenticated access token and extracts ticket info
func (s *Service) ValidateUnauthToken(tokenString string) (tenantID, projectID, ticketID, scope string, jti string, err error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return "", "", "", "", "", err
	}

	if claims.TokenType != "unauth" {
		return "", "", "", "", "", fmt.Errorf("invalid token type: %s", claims.TokenType)
	}

	// Parse subject: tenant_id:project_id:ticket_id
	parts, err := parseSubject(claims.Subject)
	if err != nil {
		return "", "", "", "", "", err
	}

	scope = ""
	if len(claims.Audience) > 0 {
		scope = claims.Audience[0]
	}

	return parts[0], parts[1], parts[2], scope, claims.ID, nil
}

func parseSubject(subject string) ([]string, error) {
	// Simple split on ":"
	parts := make([]string, 0, 3)
	current := ""

	for _, char := range subject {
		if char == ':' {
			if current == "" {
				return nil, fmt.Errorf("invalid subject format")
			}
			parts = append(parts, current)
			current = ""
		} else {
			current += string(char)
		}
	}

	if current != "" {
		parts = append(parts, current)
	}

	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid subject format: expected 3 parts, got %d", len(parts))
	}

	return parts, nil
}
