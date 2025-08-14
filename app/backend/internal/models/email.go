package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// EmailConnectorType represents the type of email connector
type EmailConnectorType string

const (
	ConnectorTypeInboundIMAP      EmailConnectorType = "inbound_imap"
	ConnectorTypeOutboundSMTP     EmailConnectorType = "outbound_smtp"
	ConnectorTypeOutboundProvider EmailConnectorType = "outbound_provider"
)

// EmailProvider represents OAuth providers
type EmailProvider string

const (
	ProviderGoogle    EmailProvider = "google"
	ProviderMicrosoft EmailProvider = "microsoft"
)

// IMAPSeenStrategy represents how to handle IMAP message seen status
type IMAPSeenStrategy string

const (
	SeenStrategyMarkAfterParse IMAPSeenStrategy = "mark_seen_after_parse"
	SeenStrategyNever          IMAPSeenStrategy = "never"
	SeenStrategyImmediate      IMAPSeenStrategy = "immediate"
)

// EmailStatus represents email processing status
type EmailStatus string

const (
	EmailStatusQueued   EmailStatus = "queued"
	EmailStatusSent     EmailStatus = "sent"
	EmailStatusBounced  EmailStatus = "bounced"
	EmailStatusDeferred EmailStatus = "deferred"
	EmailStatusError    EmailStatus = "error"
	EmailStatusAccepted EmailStatus = "accepted"
	EmailStatusRejected EmailStatus = "rejected"
)

// BounceType represents the type of email bounce
type BounceType string

const (
	BounceTypeHard      BounceType = "hard"
	BounceTypeSoft      BounceType = "soft"
	BounceTypeComplaint BounceType = "complaint"
)

// JSONMap represents a JSON object stored in the database
type JSONMap map[string]interface{}

// Scan implements the sql.Scanner interface
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, j)
}

// Value implements the driver.Valuer interface
func (j JSONMap) Value() (driver.Value, error) {
	return json.Marshal(j)
}

// OAuthToken represents OAuth tokens for email providers
type OAuthToken struct {
	ID              uuid.UUID      `json:"id" db:"id"`
	TenantID        uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	Provider        EmailProvider  `json:"provider" db:"provider"`
	AccountEmail    string         `json:"account_email" db:"account_email"`
	AccessTokenEnc  []byte         `json:"-" db:"access_token_enc"`
	RefreshTokenEnc []byte         `json:"-" db:"refresh_token_enc"`
	ExpiresAt       time.Time      `json:"expires_at" db:"expires_at"`
	Scopes          pq.StringArray `json:"scopes" db:"scopes"`
	CreatedAt       time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at" db:"updated_at"`
}

// EmailConnector represents email connector configuration
type EmailConnector struct {
	ID        uuid.UUID          `json:"id" db:"id"`
	TenantID  uuid.UUID          `json:"tenant_id" db:"tenant_id"`
	ProjectID *uuid.UUID         `json:"project_id,omitempty" db:"project_id"`
	Type      EmailConnectorType `json:"type" db:"type"`
	Name      string             `json:"name" db:"name"`
	IsActive  bool               `json:"is_active" db:"is_active"`

	// Validation fields
	IsValidated      bool       `json:"is_validated" db:"is_validated"`
	ValidationStatus string     `json:"validation_status" db:"validation_status"`
	ValidationError  *string    `json:"validation_error,omitempty" db:"validation_error"`
	LastValidationAt *time.Time `json:"last_validation_at,omitempty" db:"last_validation_at"`

	// IMAP settings
	IMAPHost         *string          `json:"imap_host,omitempty" db:"imap_host"`
	IMAPPort         *int             `json:"imap_port,omitempty" db:"imap_port"`
	IMAPUseTLS       *bool            `json:"imap_use_tls,omitempty" db:"imap_use_tls"`
	IMAPUsername     *string          `json:"imap_username,omitempty" db:"imap_username"`
	IMAPPasswordEnc  []byte           `json:"-" db:"imap_password_enc"`
	IMAPFolder       string           `json:"imap_folder" db:"imap_folder"`
	IMAPSeenStrategy IMAPSeenStrategy `json:"imap_seen_strategy" db:"imap_seen_strategy"`

	// SMTP settings
	SMTPHost        *string `json:"smtp_host,omitempty" db:"smtp_host"`
	SMTPPort        *int    `json:"smtp_port,omitempty" db:"smtp_port"`
	SMTPUseTLS      *bool   `json:"smtp_use_tls,omitempty" db:"smtp_use_tls"`
	SMTPUsername    *string `json:"smtp_username,omitempty" db:"smtp_username"`
	SMTPPasswordEnc []byte  `json:"-" db:"smtp_password_enc"`

	// OAuth reference
	OAuthProvider     *EmailProvider `json:"oauth_provider,omitempty" db:"oauth_provider"`
	OAuthAccountEmail *string        `json:"oauth_account_email,omitempty" db:"oauth_account_email"`
	OAuthTokenRef     *uuid.UUID     `json:"oauth_token_ref,omitempty" db:"oauth_token_ref"`

	// DKIM settings
	DKIMSelector      *string `json:"dkim_selector,omitempty" db:"dkim_selector"`
	DKIMPublicKey     *string `json:"dkim_public_key,omitempty" db:"dkim_public_key"`
	DKIMPrivateKeyEnc []byte  `json:"-" db:"dkim_private_key_enc"`
	ReturnPathDomain  *string `json:"return_path_domain,omitempty" db:"return_path_domain"`

	// Provider webhook
	ProviderWebhookSecret *string `json:"provider_webhook_secret,omitempty" db:"provider_webhook_secret"`
	LastHealth            JSONMap `json:"last_health" db:"last_health"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// EmailMailbox represents logical inbound email addresses
type EmailMailbox struct {
	ID                 uuid.UUID  `json:"id" db:"id"`
	TenantID           uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	ProjectID          *uuid.UUID `json:"project_id,omitempty" db:"project_id"`
	Address            string     `json:"address" db:"address"`
	DisplayName        *string    `json:"display_name,omitempty" db:"display_name"`
	InboundConnectorID uuid.UUID  `json:"inbound_connector_id" db:"inbound_connector_id"`
	DefaultProjectID   uuid.UUID  `json:"default_project_id" db:"default_project_id"`
	RoutingRules       JSONMap    `json:"routing_rules" db:"routing_rules"`
	AllowNewTicket     bool       `json:"allow_new_ticket" db:"allow_new_ticket"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
}

// EmailTransport represents outbound email configuration
type EmailTransport struct {
	ID                  uuid.UUID `json:"id" db:"id"`
	TenantID            uuid.UUID `json:"tenant_id" db:"tenant_id"`
	OutboundConnectorID uuid.UUID `json:"outbound_connector_id" db:"outbound_connector_id"`
	EnvelopeFromDomain  *string   `json:"envelope_from_domain,omitempty" db:"envelope_from_domain"`
	DKIMSelector        *string   `json:"dkim_selector,omitempty" db:"dkim_selector"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// EmailInboundLog represents inbound email processing log
type EmailInboundLog struct {
	ID             uuid.UUID      `json:"id" db:"id"`
	TenantID       uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	MailboxAddress *string        `json:"mailbox_address,omitempty" db:"mailbox_address"`
	MessageID      *string        `json:"message_id,omitempty" db:"message_id"`
	ThreadRef      *string        `json:"thread_ref,omitempty" db:"thread_ref"`
	FromAddress    *string        `json:"from_address,omitempty" db:"from_address"`
	ToAddresses    pq.StringArray `json:"to_addresses" db:"to_addresses"`
	CCAddresses    pq.StringArray `json:"cc_addresses" db:"cc_addresses"`
	Subject        *string        `json:"subject,omitempty" db:"subject"`
	ReceivedAt     *time.Time     `json:"received_at,omitempty" db:"received_at"`
	ProcessedAt    *time.Time     `json:"processed_at,omitempty" db:"processed_at"`
	Status         EmailStatus    `json:"status" db:"status"`
	Reason         *string        `json:"reason,omitempty" db:"reason"`
	TicketID       *uuid.UUID     `json:"ticket_id,omitempty" db:"ticket_id"`
	ProjectID      *uuid.UUID     `json:"project_id,omitempty" db:"project_id"`
	RawHeaders     []byte         `json:"-" db:"raw_headers"`
	RawSnippet     *string        `json:"raw_snippet,omitempty" db:"raw_snippet"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
}

// EmailOutboundLog represents outbound email log
type EmailOutboundLog struct {
	ID           uuid.UUID      `json:"id" db:"id"`
	TenantID     uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	TransportID  uuid.UUID      `json:"transport_id" db:"transport_id"`
	MessageID    *string        `json:"message_id,omitempty" db:"message_id"`
	ToAddresses  pq.StringArray `json:"to_addresses" db:"to_addresses"`
	Subject      *string        `json:"subject,omitempty" db:"subject"`
	SentAt       *time.Time     `json:"sent_at,omitempty" db:"sent_at"`
	Status       EmailStatus    `json:"status" db:"status"`
	BounceReason *string        `json:"bounce_reason,omitempty" db:"bounce_reason"`
	TicketID     *uuid.UUID     `json:"ticket_id,omitempty" db:"ticket_id"`
	ProjectID    *uuid.UUID     `json:"project_id,omitempty" db:"project_id"`
	CreatedAt    time.Time      `json:"created_at" db:"created_at"`
}

// EmailBounce represents email bounce information
type EmailBounce struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	TenantID   uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	MessageID  *string    `json:"message_id,omitempty" db:"message_id"`
	Recipient  *string    `json:"recipient,omitempty" db:"recipient"`
	BounceType BounceType `json:"bounce_type" db:"bounce_type"`
	BounceRaw  JSONMap    `json:"bounce_raw" db:"bounce_raw"`
	OccurredAt time.Time  `json:"occurred_at" db:"occurred_at"`
	TicketID   *uuid.UUID `json:"ticket_id,omitempty" db:"ticket_id"`
	ProjectID  *uuid.UUID `json:"project_id,omitempty" db:"project_id"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
}

// EmailSuppression represents suppressed email addresses
type EmailSuppression struct {
	TenantID  uuid.UUID `json:"tenant_id" db:"tenant_id"`
	Address   string    `json:"address" db:"address"`
	Reason    string    `json:"reason" db:"reason"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// TicketMailRouting represents VERP token routing
type TicketMailRouting struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	TenantID      uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	ProjectID     uuid.UUID  `json:"project_id" db:"project_id"`
	TicketID      uuid.UUID  `json:"ticket_id" db:"ticket_id"`
	PublicToken   string     `json:"public_token" db:"public_token"`
	ReplyAddress  string     `json:"reply_address" db:"reply_address"`
	MessageIDRoot string     `json:"message_id_root" db:"message_id_root"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
}

// RoutingRule represents email routing configuration
type RoutingRule struct {
	Match     string    `json:"match"`
	ProjectID uuid.UUID `json:"project_id"`
}

// EmailInbox represents an email in the inbox
type EmailInbox struct {
	ID                  uuid.UUID         `json:"id" db:"id"`
	TenantID            uuid.UUID         `json:"tenant_id" db:"tenant_id"`
	ProjectID           *uuid.UUID        `json:"project_id,omitempty" db:"project_id"`
	MessageID           string            `json:"message_id" db:"message_id"`
	ThreadID            *string           `json:"thread_id,omitempty" db:"thread_id"`
	UID                 *int              `json:"uid,omitempty" db:"uid"`
	MailboxAddress      string            `json:"mailbox_address" db:"mailbox_address"`
	FromAddress         string            `json:"from_address" db:"from_address"`
	FromName            *string           `json:"from_name,omitempty" db:"from_name"`
	ToAddresses         pq.StringArray    `json:"to_addresses" db:"to_addresses"`
	CcAddresses         pq.StringArray    `json:"cc_addresses,omitempty" db:"cc_addresses"`
	BccAddresses        pq.StringArray    `json:"bcc_addresses,omitempty" db:"bcc_addresses"`
	ReplyToAddresses    pq.StringArray    `json:"reply_to_addresses,omitempty" db:"reply_to_addresses"`
	Subject             string            `json:"subject" db:"subject"`
	BodyText            *string           `json:"body_text,omitempty" db:"body_text"`
	BodyHTML            *string           `json:"body_html,omitempty" db:"body_html"`
	Snippet             *string           `json:"snippet,omitempty" db:"snippet"`
	IsRead              bool              `json:"is_read" db:"is_read"`
	IsReply             bool              `json:"is_reply" db:"is_reply"`
	HasAttachments      bool              `json:"has_attachments" db:"has_attachments"`
	AttachmentCount     int               `json:"attachment_count" db:"attachment_count"`
	SizeBytes           *int              `json:"size_bytes,omitempty" db:"size_bytes"`
	SentAt              *time.Time        `json:"sent_at,omitempty" db:"sent_at"`
	ReceivedAt          time.Time         `json:"received_at" db:"received_at"`
	SyncStatus          string            `json:"sync_status" db:"sync_status"`
	ProcessingError     *string           `json:"processing_error,omitempty" db:"processing_error"`
	TicketID            *uuid.UUID        `json:"ticket_id,omitempty" db:"ticket_id"`
	IsConvertedToTicket bool              `json:"is_converted_to_ticket" db:"is_converted_to_ticket"`
	ConnectorID         uuid.UUID         `json:"connector_id" db:"connector_id"`
	Headers             map[string]string `json:"headers,omitempty" db:"headers"`
	RawEmail            []byte            `json:"raw_email,omitempty" db:"raw_email"`
	CreatedAt           time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time         `json:"updated_at" db:"updated_at"`
}

// EmailAttachment represents an email attachment
type EmailAttachment struct {
	ID          uuid.UUID `json:"id" db:"id"`
	EmailID     uuid.UUID `json:"email_id" db:"email_id"`
	TenantID    uuid.UUID `json:"tenant_id" db:"tenant_id"`
	Filename    string    `json:"filename" db:"filename"`
	ContentType string    `json:"content_type" db:"content_type"`
	SizeBytes   int       `json:"size_bytes" db:"size_bytes"`
	ContentID   *string   `json:"content_id,omitempty" db:"content_id"`
	IsInline    bool      `json:"is_inline" db:"is_inline"`
	StoragePath *string   `json:"storage_path,omitempty" db:"storage_path"`
	StorageURL  *string   `json:"storage_url,omitempty" db:"storage_url"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// EmailSyncStatus represents sync status for a mailbox
type EmailSyncStatus struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	TenantID          uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	ConnectorID       uuid.UUID  `json:"connector_id" db:"connector_id"`
	MailboxAddress    string     `json:"mailbox_address" db:"mailbox_address"`
	LastSyncAt        *time.Time `json:"last_sync_at,omitempty" db:"last_sync_at"`
	LastUID           int        `json:"last_uid" db:"last_uid"`
	LastMessageDate   *time.Time `json:"last_message_date,omitempty" db:"last_message_date"`
	SyncStatus        string     `json:"sync_status" db:"sync_status"`
	SyncError         *string    `json:"sync_error,omitempty" db:"sync_error"`
	EmailsSyncedCount int        `json:"emails_synced_count" db:"emails_synced_count"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// EmailDomain represents domain ownership validation
type EmailDomain struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	TenantID        uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	ProjectID       uuid.UUID  `json:"project_id" db:"project_id"`
	Domain          string     `json:"domain" db:"domain"`
	ValidationToken string     `json:"validation_token" db:"validation_token"`
	Status          string     `json:"status" db:"status"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty" db:"verified_at"`
	ExpiresAt       time.Time  `json:"expires_at" db:"expires_at"`
	Metadata        JSONMap    `json:"metadata" db:"metadata"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// SyncStatus constants
const (
	SyncStatusIdle    = "idle"
	SyncStatusSyncing = "syncing"
	SyncStatusError   = "error"
	SyncStatusPaused  = "paused"
)

// ValidationStatus constants
const (
	ValidationStatusPending    = "pending"
	ValidationStatusValidating = "validating"
	ValidationStatusValidated  = "validated"
	ValidationStatusFailed     = "failed"
)

// DomainValidationStatus constants
const (
	DomainValidationStatusPending  = "pending"
	DomainValidationStatusVerified = "verified"
	DomainValidationStatusFailed   = "failed"
	DomainValidationStatusExpired  = "expired"
)

// EmailSyncStatus constants
const (
	EmailSyncStatusSynced     = "synced"
	EmailSyncStatusProcessing = "processing"
	EmailSyncStatusError      = "error"
)
