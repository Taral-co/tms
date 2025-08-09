package mail

import (
	"io"
	"time"
)

// Message represents an email message
type Message struct {
	From        string
	To          []string
	CC          []string
	BCC         []string
	Subject     string
	TextBody    string
	HTMLBody    string
	Headers     map[string]string
	Attachments []Attachment
	MessageID   string
	InReplyTo   string
	References  string
}

// Attachment represents an email attachment
type Attachment struct {
	Filename    string
	ContentType string
	Content     []byte
	Reader      io.Reader
}

// ParsedMessage represents a parsed inbound email
type ParsedMessage struct {
	MessageID    string
	InReplyTo    string
	References   []string
	From         string
	To           []string
	CC           []string
	Subject      string
	Date         time.Time
	TextBody     string
	HTMLBody     string
	Attachments  []Attachment
	Headers      map[string][]string
	RawMessage   []byte
}

// ThreadReference represents email threading information
type ThreadReference struct {
	MessageID     string
	InReplyTo     string
	References    []string
	Subject       string
	NormalizedRef string // Computed thread reference
}

// EmailTemplate represents an email template
type EmailTemplate struct {
	Name        string
	Subject     string
	TextBody    string
	HTMLBody    string
	Variables   map[string]interface{}
}

// SendRequest represents a request to send an email
type SendRequest struct {
	TenantID     string
	ProjectID    string
	TicketID     string
	Template     string
	To           []string
	CC           []string
	BCC          []string
	Variables    map[string]interface{}
	Attachments  []Attachment
	ReplyTo      string
	MessageID    string
	InReplyTo    string
	References   string
}

// DeliveryResult represents the result of an email delivery attempt
type DeliveryResult struct {
	MessageID    string
	Status       string
	Error        error
	SentAt       time.Time
	Recipients   []string
	ProviderID   string
}

// BounceEvent represents an email bounce event
type BounceEvent struct {
	MessageID    string
	Recipient    string
	BounceType   string
	Reason       string
	Timestamp    time.Time
	RawData      map[string]interface{}
}

// VERPAddress represents a Variable Envelope Return Path address
type VERPAddress struct {
	LocalPart    string
	Domain       string
	Token        string
	TicketID     string
	Type         string // "reply" or "bounce"
}

// ParseVERPAddress parses a VERP address
func ParseVERPAddress(address string) (*VERPAddress, error) {
	// Implementation for parsing VERP addresses like t+{token}@reply.domain.com
	// This would parse the token and type from the email address
	return nil, nil
}

// GenerateVERPAddress generates a VERP address for a ticket
func GenerateVERPAddress(ticketID, token, addressType, domain string) string {
	switch addressType {
	case "reply":
		return "t+" + token + "@reply." + domain
	case "bounce":
		return "b+" + token + "@bounce." + domain
	default:
		return "t+" + token + "@" + domain
	}
}
