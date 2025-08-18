package models

import (
	"fmt"
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
	Role      RoleType  `db:"role" json:"role"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// RoleType represents a system role enum
type RoleType string

// Define all system roles as constants
const (
	RoleTenantAdmin  RoleType = "tenant_admin"
	RoleProjectAdmin RoleType = "project_admin"
	RoleSupervisor   RoleType = "supervisor"
	RoleAgent        RoleType = "agent"
	RoleReadOnly     RoleType = "read_only"
)

// AllRoles returns all valid roles
func AllRoles() []RoleType {
	return []RoleType{
		RoleTenantAdmin,
		RoleProjectAdmin,
		RoleSupervisor,
		RoleAgent,
		RoleReadOnly,
	}
}

// String returns the string representation of the role
func (r RoleType) String() string {
	return string(r)
}

// IsValid checks if the role is valid
func (r RoleType) IsValid() bool {
	switch r {
	case RoleTenantAdmin, RoleProjectAdmin, RoleSupervisor, RoleAgent, RoleReadOnly:
		return true
	default:
		return false
	}
}

// ParseRole parses a string into a RoleType
func ParseRole(s string) (RoleType, error) {
	r := RoleType(s)
	if !r.IsValid() {
		return "", fmt.Errorf("invalid role: %s", s)
	}
	return r, nil
}

// Role represents a role in the system
type Role struct {
	Role        RoleType `db:"role" json:"role"`
	Description string   `db:"description" json:"description"`
}

// RolePermission represents a permission for a role
type RolePermission struct {
	Role       RoleType `db:"role" json:"role"`
	Permission string   `db:"perm" json:"permission"`
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
	RequesterID     uuid.UUID  `db:"customer_id" json:"customer_id"`
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
	Sub           string              `json:"sub"`
	TenantID      string              `json:"tenant_id"`
	AgentID       string              `json:"agent_id"`
	Email         string              `json:"email"`
	RoleBindings  map[string][]string `json:"role_bindings"`
	TokenType     string              `json:"token_type"`
	JTI           string              `json:"jti"`
	Exp           int64               `json:"exp"`
	Iat           int64               `json:"iat"`
	Subject       string              `json:"subject"` // Alias for Sub for backward compatibility
	IsTenantAdmin bool                `json:"is_tenant_admin"`
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
	Sub        string    `json:"sub"`
	CustomerID uuid.UUID `json:"customer_id"`
	TicketID   uuid.UUID `json:"ticket_id"`
	Scope      []string  `json:"scope"`
	Exp        int64     `json:"exp"`
	JTI        string    `json:"jti"`
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

// Chat System Models

// ChatWidget represents a chat widget configuration
type ChatWidget struct {
	ID        uuid.UUID `db:"id" json:"id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID uuid.UUID `db:"project_id" json:"project_id"`
	DomainID  uuid.UUID `db:"domain_id" json:"domain_id"`

	// Widget configuration
	Name     string `db:"name" json:"name"`
	IsActive bool   `db:"is_active" json:"is_active"`

	// Appearance settings
	PrimaryColor    string  `db:"primary_color" json:"primary_color"`
	SecondaryColor  string  `db:"secondary_color" json:"secondary_color"`
	Position        string  `db:"position" json:"position"`
	WidgetShape     string  `db:"widget_shape" json:"widget_shape"`
	ChatBubbleStyle string  `db:"chat_bubble_style" json:"chat_bubble_style"`
	WidgetSize      string  `db:"widget_size" json:"widget_size"`
	AnimationStyle  string  `db:"animation_style" json:"animation_style"`
	CustomCSS       *string `db:"custom_css" json:"custom_css,omitempty"`

	// Messaging settings
	WelcomeMessage string  `db:"welcome_message" json:"welcome_message"`
	OfflineMessage string  `db:"offline_message" json:"offline_message"`
	CustomGreeting *string `db:"custom_greeting" json:"custom_greeting,omitempty"`
	AwayMessage    string  `db:"away_message" json:"away_message"`

	// Agent personalization
	AgentName      string  `db:"agent_name" json:"agent_name"`
	AgentAvatarURL *string `db:"agent_avatar_url" json:"agent_avatar_url,omitempty"`

	// Behavior settings
	AutoOpenDelay    int  `db:"auto_open_delay" json:"auto_open_delay"`
	ShowAgentAvatars bool `db:"show_agent_avatars" json:"show_agent_avatars"`
	AllowFileUploads bool `db:"allow_file_uploads" json:"allow_file_uploads"`
	RequireEmail     bool `db:"require_email" json:"require_email"`
	SoundEnabled     bool `db:"sound_enabled" json:"sound_enabled"`
	ShowPoweredBy    bool `db:"show_powered_by" json:"show_powered_by"`

	// AI and advanced features
	UseAI bool `db:"use_ai" json:"use_ai"`

	// Business hours and embed settings
	BusinessHours JSONMap `db:"business_hours" json:"business_hours"`
	EmbedCode     *string `db:"embed_code" json:"embed_code,omitempty"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`

	// Joined fields
	DomainName string `db:"domain_name" json:"domain_name,omitempty"`
}

// ChatSession represents a chat conversation session
type ChatSession struct {
	ID        uuid.UUID `db:"id" json:"id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID uuid.UUID `db:"project_id" json:"project_id"`
	WidgetID  uuid.UUID `db:"widget_id" json:"widget_id"`

	// Session identity
	SessionToken string     `db:"session_token" json:"session_token"`
	CustomerID   *uuid.UUID `db:"customer_id" json:"customer_id,omitempty"`
	TicketID     *uuid.UUID `db:"ticket_id" json:"ticket_id,omitempty"`

	// Session metadata
	Status      string  `db:"status" json:"status"`
	VisitorInfo JSONMap `db:"visitor_info" json:"visitor_info"`

	// Agent assignment
	AssignedAgentID *uuid.UUID `db:"assigned_agent_id" json:"assigned_agent_id,omitempty"`
	AssignedAt      *time.Time `db:"assigned_at" json:"assigned_at,omitempty"`

	// Timing
	StartedAt      time.Time  `db:"started_at" json:"started_at"`
	EndedAt        *time.Time `db:"ended_at" json:"ended_at,omitempty"`
	LastActivityAt time.Time  `db:"last_activity_at" json:"last_activity_at"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`

	// Joined fields
	AssignedAgentName *string `db:"assigned_agent_name" json:"assigned_agent_name,omitempty"`
	CustomerName      *string `db:"customer_name" json:"customer_name,omitempty"`
	CustomerEmail     *string `db:"customer_email" json:"customer_email,omitempty"`
	WidgetName        *string `db:"widget_name" json:"widget_name,omitempty"`
}

// ChatMessage represents a message in a chat session
type ChatMessage struct {
	ID        uuid.UUID `db:"id" json:"id"`
	TenantID  uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ProjectID uuid.UUID `db:"project_id" json:"project_id"`
	SessionID uuid.UUID `db:"session_id" json:"session_id"`

	// Message content
	MessageType string `db:"message_type" json:"message_type"`
	Content     string `db:"content" json:"content"`

	// Author information
	AuthorType string     `db:"author_type" json:"author_type"`
	AuthorID   *uuid.UUID `db:"author_id" json:"author_id,omitempty"`
	AuthorName string     `db:"author_name" json:"author_name"`

	// Message metadata
	Metadata  JSONMap `db:"metadata" json:"metadata"`
	IsPrivate bool    `db:"is_private" json:"is_private"`

	// Read tracking
	ReadByVisitor bool       `db:"read_by_visitor" json:"read_by_visitor"`
	ReadByAgent   bool       `db:"read_by_agent" json:"read_by_agent"`
	ReadAt        *time.Time `db:"read_at" json:"read_at,omitempty"`

	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// ChatSessionParticipant represents an agent participating in a chat session
type ChatSessionParticipant struct {
	SessionID uuid.UUID  `db:"session_id" json:"session_id"`
	AgentID   uuid.UUID  `db:"agent_id" json:"agent_id"`
	TenantID  uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	Role      string     `db:"role" json:"role"`
	JoinedAt  time.Time  `db:"joined_at" json:"joined_at"`
	LeftAt    *time.Time `db:"left_at" json:"left_at,omitempty"`

	// Joined fields
	AgentName  string `db:"agent_name" json:"agent_name,omitempty"`
	AgentEmail string `db:"agent_email" json:"agent_email,omitempty"`
}

// Chat Request/Response DTOs

// CreateChatWidgetRequest represents a request to create a chat widget
type CreateChatWidgetRequest struct {
	DomainID         uuid.UUID `json:"domain_id" binding:"required"`
	Name             string    `json:"name" binding:"required,max=255"`
	PrimaryColor     string    `json:"primary_color" binding:"omitempty,len=7"`
	SecondaryColor   string    `json:"secondary_color" binding:"omitempty,len=7"`
	Position         string    `json:"position" binding:"omitempty,oneof=bottom-right bottom-left"`
	WelcomeMessage   string    `json:"welcome_message" binding:"omitempty,max=500"`
	OfflineMessage   string    `json:"offline_message" binding:"omitempty,max=500"`
	AutoOpenDelay    int       `json:"auto_open_delay" binding:"omitempty,min=0,max=60"`
	ShowAgentAvatars bool      `json:"show_agent_avatars"`
	AllowFileUploads bool      `json:"allow_file_uploads"`
	RequireEmail     bool      `json:"require_email"`
	BusinessHours    JSONMap   `json:"business_hours"`
}

// UpdateChatWidgetRequest represents a request to update a chat widget
type UpdateChatWidgetRequest struct {
	Name             *string  `json:"name,omitempty" binding:"omitempty,max=255"`
	IsActive         *bool    `json:"is_active,omitempty"`
	PrimaryColor     *string  `json:"primary_color,omitempty" binding:"omitempty,len=7"`
	SecondaryColor   *string  `json:"secondary_color,omitempty" binding:"omitempty,len=7"`
	Position         *string  `json:"position,omitempty" binding:"omitempty,oneof=bottom-right bottom-left"`
	WelcomeMessage   *string  `json:"welcome_message,omitempty" binding:"omitempty,max=500"`
	OfflineMessage   *string  `json:"offline_message,omitempty" binding:"omitempty,max=500"`
	AutoOpenDelay    *int     `json:"auto_open_delay,omitempty" binding:"omitempty,min=0,max=60"`
	ShowAgentAvatars *bool    `json:"show_agent_avatars,omitempty"`
	AllowFileUploads *bool    `json:"allow_file_uploads,omitempty"`
	RequireEmail     *bool    `json:"require_email,omitempty"`
	BusinessHours    *JSONMap `json:"business_hours,omitempty"`
	ChatBubbleStyle  *string  `json:"chat_bubble_style,omitempty" binding:"omitempty,oneof=modern classic minimal bot"`
	WidgetShape      *string  `json:"widget_shape,omitempty" binding:"omitempty,oneof=rounded square"`
	AgentName        *string  `json:"agent_name,omitempty" binding:"omitempty,max=255"`
	AgentAvatarURL   *string  `json:"agent_avatar_url,omitempty" binding:"omitempty,url"`
	CustomGreeting   *string  `json:"custom_greeting,omitempty" binding:"omitempty,max=500"`
}

// InitiateChatRequest represents a request to start a chat session
type InitiateChatRequest struct {
	VisitorName    string  `json:"visitor_name" binding:"required,max=255"`
	VisitorEmail   string  `json:"visitor_email" binding:"omitempty,email"`
	InitialMessage string  `json:"initial_message" binding:"omitempty,max=1000"`
	VisitorInfo    JSONMap `json:"visitor_info"`
}

// SendChatMessageRequest represents a request to send a chat message
type SendChatMessageRequest struct {
	MessageType string  `json:"message_type" binding:"omitempty,oneof=text file image"`
	Content     string  `json:"content" binding:"required"`
	IsPrivate   bool    `json:"is_private"`
	Metadata    JSONMap `json:"metadata"`
	SenderName  string  `json:"sender_name" binding:"required,max=255"`
}

// AssignChatSessionRequest represents a request to assign an agent to a chat
type AssignChatSessionRequest struct {
	AgentID uuid.UUID `json:"agent_id" binding:"required"`
}

// ChatSessionWithMessages represents a chat session with its messages
type ChatSessionWithMessages struct {
	Session      ChatSession              `json:"session"`
	Messages     []ChatMessage            `json:"messages"`
	Participants []ChatSessionParticipant `json:"participants"`
}

// WebSocket Message Types for real-time chat
type WSMessageType string

const (
	WSMsgTypeChatMessage   WSMessageType = "chat_message"
	WSMsgTypeAgentJoined   WSMessageType = "agent_joined"
	WSMsgTypeAgentLeft     WSMessageType = "agent_left"
	WSMsgTypeSessionEnded  WSMessageType = "session_ended"
	WSMsgTypeTypingStart   WSMessageType = "typing_start"
	WSMsgTypeTypingStop    WSMessageType = "typing_stop"
	WSMsgTypeReadReceipt   WSMessageType = "read_receipt"
	WSMsgTypeSessionUpdate WSMessageType = "session_update"
)

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type      WSMessageType `json:"type"`
	SessionID uuid.UUID     `json:"session_id"`
	Data      interface{}   `json:"data"`
	Timestamp time.Time     `json:"timestamp"`
}
