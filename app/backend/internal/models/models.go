package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Tenant represents a tenant in the system
type Tenant struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Status    string    `db:"status" json:"status"`
	Region    string    `db:"region" json:"region"`
	KMSKeyID  *string   `db:"kms_key_id" json:"kms_key_id,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Project represents a project within a tenant
type Project struct {
	ID        uuid.UUID `db:"id" json:"id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Key       string    `db:"key" json:"key"`
	Name      string    `db:"name" json:"name"`
	Status    string    `db:"status" json:"status"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Agent represents an agent (user) in the system
type Agent struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	Email        string     `db:"email" json:"email"`
	Name         string     `db:"name" json:"name"`
	Status       string     `db:"status" json:"status"`
	PasswordHash *string    `db:"password_hash" json:"-"`
	LastLoginAt  *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at" json:"updated_at"`
}

// AgentProjectRole represents the role of an agent in a project
type AgentProjectRole struct {
	AgentID   uuid.UUID `db:"agent_id" json:"agent_id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID uuid.UUID `db:"project_id" json:"project_id"`
	Role      string    `db:"role" json:"role"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// Role represents a role in the system
type Role struct {
	Role        string `db:"role" json:"role"`
	Description string `db:"description" json:"description"`
}

// RolePermission represents a permission for a role
type RolePermission struct {
	Role       string `db:"role" json:"role"`
	Permission string `db:"perm" json:"permission"`
}

// Customer represents a customer
type Customer struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	TenantID  uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	Email     string     `db:"email" json:"email"`
	Name      string     `db:"name" json:"name"`
	OrgID     *uuid.UUID `db:"org_id" json:"org_id,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
}

// Organization represents an organization
type Organization struct {
	ID          uuid.UUID `db:"id" json:"id"`
	TenantID    uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name        string    `db:"name" json:"name"`
	ExternalRef *string   `db:"external_ref" json:"external_ref,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// Ticket represents a support ticket
type Ticket struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID       uuid.UUID  `db:"project_id" json:"project_id"`
	Number          int        `db:"number" json:"number"`
	Subject         string     `db:"subject" json:"subject"`
	Status          string     `db:"status" json:"status"`
	Priority        string     `db:"priority" json:"priority"`
	Type            string     `db:"type" json:"type"`
	Source          string     `db:"source" json:"source"`
	RequesterID     uuid.UUID  `db:"requester_id" json:"requester_id"`
	AssigneeAgentID *uuid.UUID `db:"assignee_agent_id" json:"assignee_agent_id,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`

	// Joined fields
	RequesterName  string `db:"requester_name" json:"requester_name,omitempty"`
	RequesterEmail string `db:"requester_email" json:"requester_email,omitempty"`
	AssigneeName   string `db:"assignee_name" json:"assignee_name,omitempty"`
	ProjectKey     string `db:"project_key" json:"project_key,omitempty"`
	ProjectName    string `db:"project_name" json:"project_name,omitempty"`
}

// TicketMessage represents a message in a ticket
type TicketMessage struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	TenantID   uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID  uuid.UUID  `db:"project_id" json:"project_id"`
	TicketID   uuid.UUID  `db:"ticket_id" json:"ticket_id"`
	AuthorType string     `db:"author_type" json:"author_type"`
	AuthorID   *uuid.UUID `db:"author_id" json:"author_id,omitempty"`
	Body       string     `db:"body" json:"body"`
	IsPrivate  bool       `db:"is_private" json:"is_private"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`

	// Joined fields
	AuthorName  string `db:"author_name" json:"author_name,omitempty"`
	AuthorEmail string `db:"author_email" json:"author_email,omitempty"`
}

// TicketTag represents a tag for a ticket
type TicketTag struct {
	TicketID  uuid.UUID `db:"ticket_id" json:"ticket_id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID uuid.UUID `db:"project_id" json:"project_id"`
	Tag       string    `db:"tag" json:"tag"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// Attachment represents a file attachment
type Attachment struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	TenantID    uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID   uuid.UUID  `db:"project_id" json:"project_id"`
	TicketID    uuid.UUID  `db:"ticket_id" json:"ticket_id"`
	MessageID   *uuid.UUID `db:"message_id" json:"message_id,omitempty"`
	BlobKey     string     `db:"blob_key" json:"blob_key"`
	Filename    string     `db:"filename" json:"filename"`
	ContentType string     `db:"content_type" json:"content_type"`
	SizeBytes   int64      `db:"size_bytes" json:"size_bytes"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

// SLAPolicy represents an SLA policy
type SLAPolicy struct {
	ID                   uuid.UUID `db:"id" json:"id"`
	TenantID             uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID            uuid.UUID `db:"project_id" json:"project_id"`
	Name                 string    `db:"name" json:"name"`
	FirstResponseMinutes int       `db:"first_response_minutes" json:"first_response_minutes"`
	ResolutionMinutes    int       `db:"resolution_minutes" json:"resolution_minutes"`
	BusinessHoursRef     *string   `db:"business_hours_ref" json:"business_hours_ref,omitempty"`
	CreatedAt            time.Time `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time `db:"updated_at" json:"updated_at"`
}

// UnauthToken represents an unauthenticated token for magic links
type UnauthToken struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	TenantID   uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID  uuid.UUID  `db:"project_id" json:"project_id"`
	TicketID   uuid.UUID  `db:"ticket_id" json:"ticket_id"`
	JTI        string     `db:"jti" json:"jti"`
	Scope      string     `db:"scope" json:"scope"`
	Exp        time.Time  `db:"exp" json:"exp"`
	ConsumedAt *time.Time `db:"consumed_at" json:"consumed_at,omitempty"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
}

// Webhook represents a webhook configuration
type Webhook struct {
	ID        uuid.UUID `db:"id" json:"id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID uuid.UUID `db:"project_id" json:"project_id"`
	URL       string    `db:"url" json:"url"`
	Secret    string    `db:"secret" json:"secret"`
	EventMask []string  `db:"event_mask" json:"event_mask"`
	IsActive  bool      `db:"is_active" json:"is_active"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ProjectID    *uuid.UUID `db:"project_id" json:"project_id,omitempty"`
	ActorType    string     `db:"actor_type" json:"actor_type"`
	ActorID      *uuid.UUID `db:"actor_id" json:"actor_id,omitempty"`
	Action       string     `db:"action" json:"action"`
	ResourceType string     `db:"resource_type" json:"resource_type"`
	ResourceID   uuid.UUID  `db:"resource_id" json:"resource_id"`
	Meta         *string    `db:"meta" json:"meta,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
}

// JWT Claims
type JWTClaims struct {
	Sub          string              `json:"sub"`
	TenantID     string              `json:"tenant_id"`
	AgentID      string              `json:"agent_id"`
	Email        string              `json:"email"`
	RoleBindings map[string][]string `json:"role_bindings"`
	TokenType    string              `json:"token_type"`
	JTI          string              `json:"jti"`
	Exp          int64               `json:"exp"`
	Iat          int64               `json:"iat"`
	Subject      string              `json:"subject"` // Alias for Sub for backward compatibility
}

// GetExpirationTime implements jwt.Claims
func (c *JWTClaims) GetExpirationTime() (*jwt.NumericDate, error) {
	return jwt.NewNumericDate(time.Unix(c.Exp, 0)), nil
}

// GetIssuedAt implements jwt.Claims
func (c *JWTClaims) GetIssuedAt() (*jwt.NumericDate, error) {
	return jwt.NewNumericDate(time.Unix(c.Iat, 0)), nil
}

// GetNotBefore implements jwt.Claims
func (c *JWTClaims) GetNotBefore() (*jwt.NumericDate, error) {
	return nil, nil
}

// GetIssuer implements jwt.Claims
func (c *JWTClaims) GetIssuer() (string, error) {
	return "tms", nil
}

// GetSubject implements jwt.Claims
func (c *JWTClaims) GetSubject() (string, error) {
	return c.Sub, nil
}

// GetAudience implements jwt.Claims
func (c *JWTClaims) GetAudience() (jwt.ClaimStrings, error) {
	return nil, nil
}

// Public Token Claims for unauthenticated access
type PublicTokenClaims struct {
	Sub       string    `json:"sub"`
	TenantID  uuid.UUID `json:"tenant_id"`
	ProjectID uuid.UUID `json:"project_id"`
	TicketID  uuid.UUID `json:"ticket_id"`
	Scope     []string  `json:"scope"`
	Exp       int64     `json:"exp"`
	JTI       string    `json:"jti"`
}

// GetExpirationTime implements jwt.Claims
func (c *PublicTokenClaims) GetExpirationTime() (*jwt.NumericDate, error) {
	return jwt.NewNumericDate(time.Unix(c.Exp, 0)), nil
}

// GetIssuedAt implements jwt.Claims
func (c *PublicTokenClaims) GetIssuedAt() (*jwt.NumericDate, error) {
	return nil, nil
}

// GetNotBefore implements jwt.Claims
func (c *PublicTokenClaims) GetNotBefore() (*jwt.NumericDate, error) {
	return nil, nil
}

// GetIssuer implements jwt.Claims
func (c *PublicTokenClaims) GetIssuer() (string, error) {
	return "tms", nil
}

// GetSubject implements jwt.Claims
func (c *PublicTokenClaims) GetSubject() (string, error) {
	return c.Sub, nil
}

// GetAudience implements jwt.Claims
func (c *PublicTokenClaims) GetAudience() (jwt.ClaimStrings, error) {
	return nil, nil
}

// Request/Response DTOs

// CreateTicketRequest represents a request to create a ticket
type CreateTicketRequest struct {
	Subject         string     `json:"subject" binding:"required,max=500"`
	Priority        string     `json:"priority" binding:"required,oneof=low normal high urgent"`
	Type            string     `json:"type" binding:"required,oneof=question incident problem task"`
	Source          string     `json:"source" binding:"required,oneof=web email api phone chat"`
	RequesterEmail  string     `json:"requester_email" binding:"required,email"`
	RequesterName   string     `json:"requester_name" binding:"required,max=255"`
	Body            string     `json:"body" binding:"required"`
	Tags            []string   `json:"tags,omitempty"`
	AssigneeAgentID *uuid.UUID `json:"assignee_agent_id,omitempty"`
}

// UpdateTicketRequest represents a request to update a ticket
type UpdateTicketRequest struct {
	Subject         *string    `json:"subject,omitempty" binding:"omitempty,max=500"`
	Status          *string    `json:"status,omitempty" binding:"omitempty,oneof=new open pending resolved closed"`
	Priority        *string    `json:"priority,omitempty" binding:"omitempty,oneof=low normal high urgent"`
	Type            *string    `json:"type,omitempty" binding:"omitempty,oneof=question incident problem task"`
	AssigneeAgentID *uuid.UUID `json:"assignee_agent_id,omitempty"`
	Tags            []string   `json:"tags,omitempty"`
}

// CreateMessageRequest represents a request to create a message
type CreateMessageRequest struct {
	Body      string `json:"body" binding:"required"`
	IsPrivate bool   `json:"is_private"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// MagicLinkRequest represents a request for a magic link
type MagicLinkRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// TicketListResponse represents a paginated list of tickets
type TicketListResponse struct {
	Tickets []Ticket `json:"tickets"`
	Meta    PageMeta `json:"meta"`
}

// PageMeta represents pagination metadata
type PageMeta struct {
	Total       int    `json:"total"`
	Page        int    `json:"page"`
	PerPage     int    `json:"per_page"`
	HasNext     bool   `json:"has_next"`
	HasPrevious bool   `json:"has_previous"`
	NextCursor  string `json:"next_cursor,omitempty"`
}

// TicketWithMessages represents a ticket with its messages
type TicketWithMessages struct {
	Ticket      Ticket          `json:"ticket"`
	Messages    []TicketMessage `json:"messages"`
	Attachments []Attachment    `json:"attachments"`
	Tags        []string        `json:"tags"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
