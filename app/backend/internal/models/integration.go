package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Integration types
type IntegrationType string

const (
	// Communication
	IntegrationTypeSlack          IntegrationType = "slack"
	IntegrationTypeMicrosoftTeams IntegrationType = "microsoft_teams"
	IntegrationTypeDiscord        IntegrationType = "discord"
	IntegrationTypeTelegram       IntegrationType = "telegram"
	IntegrationTypeWhatsApp       IntegrationType = "whatsapp"

	// Project Management
	IntegrationTypeJira     IntegrationType = "jira"
	IntegrationTypeLinear   IntegrationType = "linear"
	IntegrationTypeAsana    IntegrationType = "asana"
	IntegrationTypeTrello   IntegrationType = "trello"
	IntegrationTypeMonday   IntegrationType = "monday"
	IntegrationTypeNotion   IntegrationType = "notion"
	IntegrationTypeAirtable IntegrationType = "airtable"

	// CRM & Sales
	IntegrationTypeHubSpot    IntegrationType = "hubspot"
	IntegrationTypeSalesforce IntegrationType = "salesforce"

	// Support & Helpdesk
	IntegrationTypeZendesk   IntegrationType = "zendesk"
	IntegrationTypeFreshdesk IntegrationType = "freshdesk"
	IntegrationTypeIntercom  IntegrationType = "intercom"
	IntegrationTypeCrisp     IntegrationType = "crisp"

	// Calendar & Scheduling
	IntegrationTypeCalendly        IntegrationType = "calendly"
	IntegrationTypeGoogleCalendar  IntegrationType = "google_calendar"
	IntegrationTypeOutlookCalendar IntegrationType = "outlook_calendar"
	IntegrationTypeZoom            IntegrationType = "zoom"
	IntegrationTypeGoogleMeet      IntegrationType = "google_meet"
	IntegrationTypeTeamsMeeting    IntegrationType = "microsoft_teams_meeting"

	// File Storage
	IntegrationTypeGoogleDrive        IntegrationType = "google_drive"
	IntegrationTypeDropbox            IntegrationType = "dropbox"
	IntegrationTypeBox                IntegrationType = "box"
	IntegrationTypeOneDrive           IntegrationType = "onedrive"
	IntegrationTypeAWSS3              IntegrationType = "aws_s3"
	IntegrationTypeAzureStorage       IntegrationType = "azure_storage"
	IntegrationTypeGoogleCloudStorage IntegrationType = "google_cloud_storage"

	// Payment & Billing
	IntegrationTypeStripe IntegrationType = "stripe"
	IntegrationTypePayPal IntegrationType = "paypal"
	IntegrationTypeSquare IntegrationType = "square"

	// Email & Marketing
	IntegrationTypeTwilio          IntegrationType = "twilio"
	IntegrationTypeSendGrid        IntegrationType = "sendgrid"
	IntegrationTypeMailchimp       IntegrationType = "mailchimp"
	IntegrationTypeConstantContact IntegrationType = "constant_contact"

	// Development
	IntegrationTypeGitHub IntegrationType = "github"

	// E-commerce
	IntegrationTypeShopify     IntegrationType = "shopify"
	IntegrationTypeWooCommerce IntegrationType = "woocommerce"
	IntegrationTypeMagento     IntegrationType = "magento"
	IntegrationTypeBigCommerce IntegrationType = "bigcommerce"

	// Automation & Custom
	IntegrationTypeZapier  IntegrationType = "zapier"
	IntegrationTypeWebhook IntegrationType = "webhook"
	IntegrationTypeCustom  IntegrationType = "custom"
)

type OAuthProvider string

const (
	OAuthProviderGoogle     OAuthProvider = "google"
	OAuthProviderMicrosoft  OAuthProvider = "microsoft"
	OAuthProviderSlack      OAuthProvider = "slack"
	OAuthProviderJira       OAuthProvider = "jira"
	OAuthProviderGitHub     OAuthProvider = "github"
	OAuthProviderLinear     OAuthProvider = "linear"
	OAuthProviderAsana      OAuthProvider = "asana"
	OAuthProviderTrello     OAuthProvider = "trello"
	OAuthProviderNotion     OAuthProvider = "notion"
	OAuthProviderHubSpot    OAuthProvider = "hubspot"
	OAuthProviderSalesforce OAuthProvider = "salesforce"
	OAuthProviderZendesk    OAuthProvider = "zendesk"
	OAuthProviderFreshdesk  OAuthProvider = "freshdesk"
	OAuthProviderIntercom   OAuthProvider = "intercom"
	OAuthProviderDiscord    OAuthProvider = "discord"
	OAuthProviderStripe     OAuthProvider = "stripe"
	OAuthProviderShopify    OAuthProvider = "shopify"
	OAuthProviderZoom       OAuthProvider = "zoom"
	OAuthProviderCalendly   OAuthProvider = "calendly"
	OAuthProviderCustom     OAuthProvider = "custom"
)

type AuthMethod string

const (
	AuthMethodOAuth  AuthMethod = "oauth"
	AuthMethodAPIKey AuthMethod = "api_key"
	AuthMethodNone   AuthMethod = "none"
)

type IntegrationStatus string

const (
	IntegrationStatusActive      IntegrationStatus = "active"
	IntegrationStatusInactive    IntegrationStatus = "inactive"
	IntegrationStatusError       IntegrationStatus = "error"
	IntegrationStatusConfiguring IntegrationStatus = "configuring"
)

type WebhookEvent string

const (
	WebhookEventTicketCreated       WebhookEvent = "ticket.created"
	WebhookEventTicketUpdated       WebhookEvent = "ticket.updated"
	WebhookEventTicketStatusChanged WebhookEvent = "ticket.status_changed"
	WebhookEventMessageCreated      WebhookEvent = "message.created"
	WebhookEventMessageUpdated      WebhookEvent = "message.updated"
	WebhookEventAgentAssigned       WebhookEvent = "agent.assigned"
	WebhookEventAgentUnassigned     WebhookEvent = "agent.unassigned"
	WebhookEventEscalationTriggered WebhookEvent = "escalation.triggered"
	WebhookEventSLABreached         WebhookEvent = "sla.breached"
)

// Core integration models
type Integration struct {
	ID            uuid.UUID         `json:"id" db:"id"`
	TenantID      uuid.UUID         `json:"tenant_id" db:"tenant_id"`
	ProjectID     uuid.UUID         `json:"project_id" db:"project_id"`
	Type          IntegrationType   `json:"type" db:"type"`
	Name          string            `json:"name" db:"name"`
	Status        IntegrationStatus `json:"status" db:"status"`
	Config        JSONMap           `json:"config" db:"config"`
	AuthMethod    AuthMethod        `json:"auth_method" db:"auth_method"`
	AuthData      JSONMap           `json:"auth_data" db:"auth_data"`
	OAuthTokenID  *uuid.UUID        `json:"oauth_token_id,omitempty" db:"oauth_token_id"`
	WebhookURL    *string           `json:"webhook_url,omitempty" db:"webhook_url"`
	WebhookSecret *string           `json:"webhook_secret,omitempty" db:"webhook_secret"`
	LastSyncAt    *time.Time        `json:"last_sync_at,omitempty" db:"last_sync_at"`
	LastError     *string           `json:"last_error,omitempty" db:"last_error"`
	RetryCount    int               `json:"retry_count" db:"retry_count"`
	CreatedAt     time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at" db:"updated_at"`
}

// Integration OAuth tokens are shared with the email subsystem
// The OAuthToken is already defined in email.go

type WebhookSubscription struct {
	ID             uuid.UUID      `json:"id" db:"id"`
	TenantID       uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	ProjectID      uuid.UUID      `json:"project_id" db:"project_id"`
	IntegrationID  uuid.UUID      `json:"integration_id" db:"integration_id"`
	WebhookURL     string         `json:"webhook_url" db:"webhook_url"`
	Events         pq.StringArray `json:"events" db:"events"`
	Secret         string         `json:"secret" db:"secret"`
	IsActive       bool           `json:"is_active" db:"is_active"`
	RetryCount     int            `json:"retry_count" db:"retry_count"`
	MaxRetries     int            `json:"max_retries" db:"max_retries"`
	TimeoutSeconds int            `json:"timeout_seconds" db:"timeout_seconds"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" db:"updated_at"`
}

type WebhookDelivery struct {
	ID              uuid.UUID    `json:"id" db:"id"`
	TenantID        uuid.UUID    `json:"tenant_id" db:"tenant_id"`
	ProjectID       uuid.UUID    `json:"project_id" db:"project_id"`
	SubscriptionID  uuid.UUID    `json:"subscription_id" db:"subscription_id"`
	EventType       WebhookEvent `json:"event_type" db:"event_type"`
	Payload         JSONMap      `json:"payload" db:"payload"`
	RequestHeaders  JSONMap      `json:"request_headers,omitempty" db:"request_headers"`
	ResponseStatus  *int         `json:"response_status,omitempty" db:"response_status"`
	ResponseHeaders JSONMap      `json:"response_headers,omitempty" db:"response_headers"`
	ResponseBody    *string      `json:"response_body,omitempty" db:"response_body"`
	DeliveryAttempt int          `json:"delivery_attempt" db:"delivery_attempt"`
	DeliveredAt     *time.Time   `json:"delivered_at,omitempty" db:"delivered_at"`
	NextRetryAt     *time.Time   `json:"next_retry_at,omitempty" db:"next_retry_at"`
	CreatedAt       time.Time    `json:"created_at" db:"created_at"`
}

type IntegrationSyncLog struct {
	ID              uuid.UUID `json:"id" db:"id"`
	TenantID        uuid.UUID `json:"tenant_id" db:"tenant_id"`
	ProjectID       uuid.UUID `json:"project_id" db:"project_id"`
	IntegrationID   uuid.UUID `json:"integration_id" db:"integration_id"`
	Operation       string    `json:"operation" db:"operation"`
	Status          string    `json:"status" db:"status"`
	ExternalID      *string   `json:"external_id,omitempty" db:"external_id"`
	RequestPayload  JSONMap   `json:"request_payload,omitempty" db:"request_payload"`
	ResponsePayload JSONMap   `json:"response_payload,omitempty" db:"response_payload"`
	ErrorMessage    *string   `json:"error_message,omitempty" db:"error_message"`
	DurationMs      *int      `json:"duration_ms,omitempty" db:"duration_ms"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// Slack integration models
type SlackConfiguration struct {
	ID                   uuid.UUID `json:"id" db:"id"`
	IntegrationID        uuid.UUID `json:"integration_id" db:"integration_id"`
	TenantID             uuid.UUID `json:"tenant_id" db:"tenant_id"`
	BotToken             string    `json:"bot_token" db:"bot_token"`
	TeamID               string    `json:"team_id" db:"team_id"`
	TeamName             *string   `json:"team_name,omitempty" db:"team_name"`
	BotUserID            *string   `json:"bot_user_id,omitempty" db:"bot_user_id"`
	DefaultChannel       *string   `json:"default_channel,omitempty" db:"default_channel"`
	NotificationSettings JSONMap   `json:"notification_settings" db:"notification_settings"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

type SlackChannelMapping struct {
	SlackConfigID uuid.UUID      `json:"slack_config_id" db:"slack_config_id"`
	TenantID      uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	ProjectID     uuid.UUID      `json:"project_id" db:"project_id"`
	ChannelID     string         `json:"channel_id" db:"channel_id"`
	ChannelName   *string        `json:"channel_name,omitempty" db:"channel_name"`
	Events        pq.StringArray `json:"events" db:"events"`
	IsActive      bool           `json:"is_active" db:"is_active"`
	CreatedAt     time.Time      `json:"created_at" db:"created_at"`
}

// JIRA integration models
type JiraConfiguration struct {
	ID            uuid.UUID `json:"id" db:"id"`
	IntegrationID uuid.UUID `json:"integration_id" db:"integration_id"`
	TenantID      uuid.UUID `json:"tenant_id" db:"tenant_id"`
	InstanceURL   string    `json:"instance_url" db:"instance_url"`
	ProjectKey    string    `json:"project_key" db:"project_key"`
	IssueType     string    `json:"issue_type" db:"issue_type"`
	FieldMappings JSONMap   `json:"field_mappings" db:"field_mappings"`
	SyncSettings  JSONMap   `json:"sync_settings" db:"sync_settings"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type JiraIssueMapping struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	JiraConfigID  uuid.UUID  `json:"jira_config_id" db:"jira_config_id"`
	TenantID      uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	ProjectID     uuid.UUID  `json:"project_id" db:"project_id"`
	TicketID      uuid.UUID  `json:"ticket_id" db:"ticket_id"`
	JiraIssueKey  string     `json:"jira_issue_key" db:"jira_issue_key"`
	JiraIssueID   string     `json:"jira_issue_id" db:"jira_issue_id"`
	SyncDirection string     `json:"sync_direction" db:"sync_direction"`
	LastSyncedAt  *time.Time `json:"last_synced_at,omitempty" db:"last_synced_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}

// Calendly integration models
type CalendlyConfiguration struct {
	ID                uuid.UUID `json:"id" db:"id"`
	IntegrationID     uuid.UUID `json:"integration_id" db:"integration_id"`
	TenantID          uuid.UUID `json:"tenant_id" db:"tenant_id"`
	OrganizationURI   string    `json:"organization_uri" db:"organization_uri"`
	UserURI           *string   `json:"user_uri,omitempty" db:"user_uri"`
	WebhookSigningKey *string   `json:"webhook_signing_key,omitempty" db:"webhook_signing_key"`
	AutoCreateTickets bool      `json:"auto_create_tickets" db:"auto_create_tickets"`
	DefaultTicketType string    `json:"default_ticket_type" db:"default_ticket_type"`
	DefaultPriority   string    `json:"default_priority" db:"default_priority"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}

type CalendlyEventMapping struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	CalendlyConfigID  uuid.UUID  `json:"calendly_config_id" db:"calendly_config_id"`
	TenantID          uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	ProjectID         uuid.UUID  `json:"project_id" db:"project_id"`
	TicketID          *uuid.UUID `json:"ticket_id,omitempty" db:"ticket_id"`
	CalendlyEventUUID string     `json:"calendly_event_uuid" db:"calendly_event_uuid"`
	EventTypeUUID     *string    `json:"event_type_uuid,omitempty" db:"event_type_uuid"`
	MeetingStartTime  *time.Time `json:"meeting_start_time,omitempty" db:"meeting_start_time"`
	MeetingEndTime    *time.Time `json:"meeting_end_time,omitempty" db:"meeting_end_time"`
	InviteeEmail      *string    `json:"invitee_email,omitempty" db:"invitee_email"`
	InviteeName       *string    `json:"invitee_name,omitempty" db:"invitee_name"`
	MeetingStatus     *string    `json:"meeting_status,omitempty" db:"meeting_status"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
}

// Zapier integration models
type ZapierConfiguration struct {
	ID                uuid.UUID      `json:"id" db:"id"`
	IntegrationID     uuid.UUID      `json:"integration_id" db:"integration_id"`
	TenantID          uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	WebhookURL        string         `json:"webhook_url" db:"webhook_url"`
	AuthMethod        string         `json:"auth_method" db:"auth_method"`
	AuthConfig        JSONMap        `json:"auth_config" db:"auth_config"`
	TriggerEvents     pq.StringArray `json:"trigger_events" db:"trigger_events"`
	FieldMappings     JSONMap        `json:"field_mappings" db:"field_mappings"`
	TransformSettings JSONMap        `json:"transform_settings" db:"transform_settings"`
	CreatedAt         time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at" db:"updated_at"`
}

// Rate limiting model
type IntegrationRateLimit struct {
	ID                 uuid.UUID `json:"id" db:"id"`
	IntegrationID      uuid.UUID `json:"integration_id" db:"integration_id"`
	TenantID           uuid.UUID `json:"tenant_id" db:"tenant_id"`
	Operation          string    `json:"operation" db:"operation"`
	RequestsPerMinute  int       `json:"requests_per_minute" db:"requests_per_minute"`
	RequestsPerHour    int       `json:"requests_per_hour" db:"requests_per_hour"`
	CurrentMinuteCount int       `json:"current_minute_count" db:"current_minute_count"`
	CurrentHourCount   int       `json:"current_hour_count" db:"current_hour_count"`
	MinuteResetAt      time.Time `json:"minute_reset_at" db:"minute_reset_at"`
	HourResetAt        time.Time `json:"hour_reset_at" db:"hour_reset_at"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

// Request/Response models for API
type CreateIntegrationRequest struct {
	Type          IntegrationType `json:"type" validate:"required,oneof=slack jira calendly zapier webhook custom"`
	Name          string          `json:"name" validate:"required,max=255"`
	Config        JSONMap         `json:"config"`
	WebhookURL    *string         `json:"webhook_url,omitempty" validate:"omitempty,url"`
	WebhookSecret *string         `json:"webhook_secret,omitempty"`
}

type UpdateIntegrationRequest struct {
	Name          *string            `json:"name,omitempty" validate:"omitempty,max=255"`
	Status        *IntegrationStatus `json:"status,omitempty" validate:"omitempty,oneof=active inactive error configuring"`
	Config        JSONMap            `json:"config,omitempty"`
	WebhookURL    *string            `json:"webhook_url,omitempty" validate:"omitempty,url"`
	WebhookSecret *string            `json:"webhook_secret,omitempty"`
}

type CreateWebhookSubscriptionRequest struct {
	IntegrationID  uuid.UUID `json:"integration_id" validate:"required"`
	WebhookURL     string    `json:"webhook_url" validate:"required,url"`
	Events         []string  `json:"events" validate:"required,min=1"`
	MaxRetries     int       `json:"max_retries,omitempty" validate:"omitempty,min=0,max=10"`
	TimeoutSeconds int       `json:"timeout_seconds,omitempty" validate:"omitempty,min=1,max=300"`
}

type CreateSlackConfigurationRequest struct {
	IntegrationID        uuid.UUID `json:"integration_id" validate:"required"`
	BotToken             string    `json:"bot_token" validate:"required"`
	TeamID               string    `json:"team_id" validate:"required"`
	TeamName             *string   `json:"team_name,omitempty"`
	BotUserID            *string   `json:"bot_user_id,omitempty"`
	DefaultChannel       *string   `json:"default_channel,omitempty"`
	NotificationSettings JSONMap   `json:"notification_settings"`
}

type CreateJiraConfigurationRequest struct {
	IntegrationID uuid.UUID `json:"integration_id" validate:"required"`
	InstanceURL   string    `json:"instance_url" validate:"required,url"`
	ProjectKey    string    `json:"project_key" validate:"required"`
	IssueType     string    `json:"issue_type" validate:"required"`
	FieldMappings JSONMap   `json:"field_mappings"`
	SyncSettings  JSONMap   `json:"sync_settings"`
}

type CreateCalendlyConfigurationRequest struct {
	IntegrationID     uuid.UUID `json:"integration_id" validate:"required"`
	OrganizationURI   string    `json:"organization_uri" validate:"required,url"`
	UserURI           *string   `json:"user_uri,omitempty" validate:"omitempty,url"`
	WebhookSigningKey *string   `json:"webhook_signing_key,omitempty"`
	AutoCreateTickets bool      `json:"auto_create_tickets"`
	DefaultTicketType string    `json:"default_ticket_type" validate:"omitempty,oneof=question incident problem task"`
	DefaultPriority   string    `json:"default_priority" validate:"omitempty,oneof=low normal high urgent"`
}

type CreateZapierConfigurationRequest struct {
	IntegrationID     uuid.UUID `json:"integration_id" validate:"required"`
	WebhookURL        string    `json:"webhook_url" validate:"required,url"`
	AuthMethod        string    `json:"auth_method" validate:"oneof=api_key basic oauth"`
	AuthConfig        JSONMap   `json:"auth_config"`
	TriggerEvents     []string  `json:"trigger_events" validate:"required,min=1"`
	FieldMappings     JSONMap   `json:"field_mappings"`
	TransformSettings JSONMap   `json:"transform_settings"`
}

// New models for enhanced integration system
type IntegrationCategory struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	DisplayName string    `json:"display_name" db:"display_name"`
	Description *string   `json:"description,omitempty" db:"description"`
	Icon        *string   `json:"icon,omitempty" db:"icon"`
	SortOrder   int       `json:"sort_order" db:"sort_order"`
	IsActive    bool      `json:"is_active" db:"is_active"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type IntegrationTemplate struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	CategoryID       uuid.UUID       `json:"category_id" db:"category_id"`
	Type             IntegrationType `json:"type" db:"type"`
	Name             string          `json:"name" db:"name"`
	DisplayName      string          `json:"display_name" db:"display_name"`
	Description      *string         `json:"description,omitempty" db:"description"`
	LogoURL          *string         `json:"logo_url,omitempty" db:"logo_url"`
	WebsiteURL       *string         `json:"website_url,omitempty" db:"website_url"`
	DocumentationURL *string         `json:"documentation_url,omitempty" db:"documentation_url"`
	AuthMethod       AuthMethod      `json:"auth_method" db:"auth_method"`
	ConfigSchema     JSONMap         `json:"config_schema" db:"config_schema"`
	DefaultConfig    JSONMap         `json:"default_config" db:"default_config"`
	SupportedEvents  pq.StringArray  `json:"supported_events" db:"supported_events"`
	IsFeatured       bool            `json:"is_featured" db:"is_featured"`
	IsActive         bool            `json:"is_active" db:"is_active"`
	SortOrder        int             `json:"sort_order" db:"sort_order"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
}

type IntegrationCategoryWithTemplates struct {
	IntegrationCategory
	Templates []IntegrationTemplate `json:"templates"`
}

type OAuthFlow struct {
	ID              uuid.UUID       `json:"id" db:"id"`
	TenantID        uuid.UUID       `json:"tenant_id" db:"tenant_id"`
	ProjectID       uuid.UUID       `json:"project_id" db:"project_id"`
	IntegrationType IntegrationType `json:"integration_type" db:"integration_type"`
	StateToken      string          `json:"state_token" db:"state_token"`
	RedirectURL     *string         `json:"redirect_url,omitempty" db:"redirect_url"`
	ExpiresAt       time.Time       `json:"expires_at" db:"expires_at"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
}

// Enhanced Integration model with template relationship
type IntegrationWithTemplate struct {
	Integration
	Template *IntegrationTemplate `json:"template,omitempty"`
	Category *IntegrationCategory `json:"category,omitempty"`
}

// OAuth start request
type OAuthStartRequest struct {
	IntegrationType IntegrationType `json:"integration_type" validate:"required"`
	RedirectURL     *string         `json:"redirect_url,omitempty"`
}

// OAuth callback request
type OAuthCallbackRequest struct {
	Code  string `json:"code" validate:"required"`
	State string `json:"state" validate:"required"`
}

// Integration connection test request
type TestIntegrationRequest struct {
	Action string  `json:"action" validate:"required"` // "test_connection", "send_test_message", etc.
	Config JSONMap `json:"config,omitempty"`
}

// Integration metrics for monitoring
type IntegrationMetrics struct {
	IntegrationID      uuid.UUID  `json:"integration_id"`
	TotalRequests      int64      `json:"total_requests"`
	SuccessfulRequests int64      `json:"successful_requests"`
	FailedRequests     int64      `json:"failed_requests"`
	AverageLatencyMs   float64    `json:"average_latency_ms"`
	LastRequestAt      *time.Time `json:"last_request_at,omitempty"`
	ErrorRate          float64    `json:"error_rate"`
}
