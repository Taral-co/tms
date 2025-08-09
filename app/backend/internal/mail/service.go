package mail

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Service handles email operations
type Service struct {
	logger      zerolog.Logger
	smtpClient  *SMTPClient
	imapClient  *IMAPClient
	templates   map[string]*EmailTemplate
}

// NewService creates a new email service
func NewService(logger zerolog.Logger) *Service {
	return &Service{
		logger:     logger,
		smtpClient: NewSMTPClient(logger),
		imapClient: NewIMAPClient(logger),
		templates:  make(map[string]*EmailTemplate),
	}
}

// ProcessInboundEmail processes an inbound email and determines what to do with it
func (s *Service) ProcessInboundEmail(ctx context.Context, msg *ParsedMessage, mailbox *models.EmailMailbox) (*InboundResult, error) {
	result := &InboundResult{
		MessageID: msg.MessageID,
		From:      msg.From,
		Subject:   msg.Subject,
	}

	// Check if this is an auto-reply (loop prevention)
	if s.isAutoReply(msg) {
		result.Action = "ignore"
		result.Reason = "auto-reply detected"
		return result, nil
	}

	// Try to find existing ticket by threading
	ticketID, err := s.findTicketByThreading(ctx, msg, mailbox.TenantID)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to find ticket by threading")
	}

	if ticketID != nil {
		// Reply to existing ticket
		result.Action = "reply"
		result.TicketID = *ticketID
		result.ProjectID = mailbox.DefaultProjectID // TODO: Get actual project from ticket
	} else if mailbox.AllowNewTicket {
		// Create new ticket
		projectID, err := s.routeToProject(msg, mailbox)
		if err != nil {
			return nil, fmt.Errorf("failed to route to project: %w", err)
		}

		result.Action = "create"
		result.ProjectID = projectID
		result.Subject = s.cleanSubject(msg.Subject)
	} else {
		result.Action = "reject"
		result.Reason = "new tickets not allowed for this mailbox"
	}

	// Extract message content
	result.TextBody = msg.TextBody
	result.HTMLBody = msg.HTMLBody
	result.Attachments = msg.Attachments

	return result, nil
}

// SendTicketReply sends a reply email for a ticket
func (s *Service) SendTicketReply(ctx context.Context, req *SendTicketReplyRequest) error {
	// Generate VERP reply address if not exists
	routing, err := s.ensureTicketRouting(ctx, req.TenantID, req.ProjectID, req.TicketID)
	if err != nil {
		return fmt.Errorf("failed to ensure ticket routing: %w", err)
	}

	// Build message
	msg := &Message{
		From:      req.FromAddress,
		To:        req.ToAddresses,
		CC:        req.CCAddresses,
		Subject:   req.Subject,
		TextBody:  req.TextBody,
		HTMLBody:  req.HTMLBody,
		Headers:   make(map[string]string),
	}

	// Add threading headers
	msg.MessageID = s.generateMessageID(req.TenantID)
	msg.InReplyTo = routing.MessageIDRoot
	msg.References = routing.MessageIDRoot
	
	// Set Reply-To to VERP address for proper threading
	msg.Headers["Reply-To"] = routing.ReplyAddress
	msg.Headers["X-Ticket-ID"] = req.TicketID.String()
	msg.Headers["X-Tenant-ID"] = req.TenantID.String()
	msg.Headers["X-Project-ID"] = req.ProjectID.String()

	// Anti-loop headers
	msg.Headers["Auto-Submitted"] = "auto-replied"
	msg.Headers["X-Auto-Response-Suppress"] = "All"

	// Add attachments
	msg.Attachments = req.Attachments

	// Send via SMTP (TODO: get transport for tenant/project)
	connector := &models.EmailConnector{} // TODO: Load from database
	return s.smtpClient.SendMessage(ctx, connector, msg)
}

// SendMagicLinkEmail sends a magic link email
func (s *Service) SendMagicLinkEmail(ctx context.Context, req *SendMagicLinkRequest) error {
	template, ok := s.templates["magic_link"]
	if !ok {
		return fmt.Errorf("magic link template not found")
	}

	// Render template
	subject, textBody, htmlBody, err := s.renderTemplate(template, req.Variables)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	msg := &Message{
		From:     req.FromAddress,
		To:       []string{req.ToAddress},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody,
		Headers:  make(map[string]string),
	}

	msg.MessageID = s.generateMessageID(req.TenantID)
	msg.Headers["X-Tenant-ID"] = req.TenantID.String()

	// Send via SMTP (TODO: get transport for tenant)
	connector := &models.EmailConnector{} // TODO: Load from database
	return s.smtpClient.SendMessage(ctx, connector, msg)
}

// isAutoReply checks if the message is an auto-reply to prevent loops
func (s *Service) isAutoReply(msg *ParsedMessage) bool {
	// Check for common auto-reply headers
	for key, values := range msg.Headers {
		key = strings.ToLower(key)
		for _, value := range values {
			value = strings.ToLower(value)
			
			switch key {
			case "auto-submitted":
				if value != "no" {
					return true
				}
			case "x-auto-response-suppress":
				return true
			case "precedence":
				if value == "bulk" || value == "list" || value == "junk" {
					return true
				}
			case "x-autoreply":
				return true
			case "x-autorespond":
				return true
			}
		}
	}

	// Check subject for common auto-reply patterns
	subject := strings.ToLower(msg.Subject)
	autoReplyPatterns := []string{
		"out of office",
		"automatic reply",
		"auto-reply",
		"vacation",
		"away message",
		"delivery status notification",
		"undelivered mail returned",
		"mail delivery failed",
	}

	for _, pattern := range autoReplyPatterns {
		if strings.Contains(subject, pattern) {
			return true
		}
	}

	return false
}

// findTicketByThreading attempts to find an existing ticket by email threading
func (s *Service) findTicketByThreading(ctx context.Context, msg *ParsedMessage, tenantID uuid.UUID) (*uuid.UUID, error) {
	// Check for VERP token in To/CC addresses
	for _, addr := range append(msg.To, msg.CC...) {
		if ticketID := s.extractVERPTicket(addr); ticketID != nil {
			return ticketID, nil
		}
	}

	// Check Message-ID threading
	if msg.InReplyTo != "" {
		// TODO: Query database for ticket with this message ID root
	}

	// Check References header
	for _, ref := range msg.References {
		// TODO: Query database for ticket with this message ID root
		_ = ref // Avoid unused variable warning
	}

	// Check X-Ticket-ID header
	if ticketIDHeaders, ok := msg.Headers["x-ticket-id"]; ok && len(ticketIDHeaders) > 0 {
		if ticketID, err := uuid.Parse(ticketIDHeaders[0]); err == nil {
			return &ticketID, nil
		}
	}

	return nil, nil
}

// extractVERPTicket extracts ticket ID from VERP address
func (s *Service) extractVERPTicket(address string) *uuid.UUID {
	// Parse addresses like t+{token}@reply.domain.com
	re := regexp.MustCompile(`^t\+([a-zA-Z0-9]+)@`)
	matches := re.FindStringSubmatch(address)
	if len(matches) < 2 {
		return nil
	}

	token := matches[1]
	// TODO: Query database to find ticket by token
	// For now, return nil
	_ = token
	return nil
}

// routeToProject determines which project to route the email to
func (s *Service) routeToProject(msg *ParsedMessage, mailbox *models.EmailMailbox) (uuid.UUID, error) {
	// Apply routing rules
	for _, rule := range mailbox.RoutingRules {
		if ruleObj, ok := rule.(map[string]interface{}); ok {
			if match, ok := ruleObj["match"].(string); ok {
				if projectIDStr, ok := ruleObj["project_id"].(string); ok {
					if s.matchesRule(msg, match) {
						if projectID, err := uuid.Parse(projectIDStr); err == nil {
							return projectID, nil
						}
					}
				}
			}
		}
	}

	// Default to mailbox default project
	return mailbox.DefaultProjectID, nil
}

// matchesRule checks if a message matches a routing rule
func (s *Service) matchesRule(msg *ParsedMessage, rule string) bool {
	// Simple rule matching - can be enhanced
	if strings.HasPrefix(rule, "subject:") {
		pattern := strings.TrimPrefix(rule, "subject:")
		return strings.Contains(strings.ToLower(msg.Subject), strings.ToLower(pattern))
	}
	
	if strings.HasPrefix(rule, "from:") {
		pattern := strings.TrimPrefix(rule, "from:")
		return strings.Contains(strings.ToLower(msg.From), strings.ToLower(pattern))
	}

	return false
}

// cleanSubject removes Re:, Fwd: prefixes from subject
func (s *Service) cleanSubject(subject string) string {
	re := regexp.MustCompile(`^(?i)(re|fwd?):\s*`)
	return re.ReplaceAllString(strings.TrimSpace(subject), "")
}

// ensureTicketRouting ensures VERP routing exists for a ticket
func (s *Service) ensureTicketRouting(ctx context.Context, tenantID, projectID, ticketID uuid.UUID) (*models.TicketMailRouting, error) {
	// TODO: Check database for existing routing
	// TODO: Create if not exists
	
	// For now, return a mock routing
	token := s.generateToken()
	return &models.TicketMailRouting{
		ID:            uuid.New(),
		TenantID:      tenantID,
		ProjectID:     projectID,
		TicketID:      ticketID,
		PublicToken:   token,
		ReplyAddress:  fmt.Sprintf("t+%s@reply.example.com", token),
		MessageIDRoot: fmt.Sprintf("<%s@example.com>", uuid.New().String()),
		CreatedAt:     time.Now(),
	}, nil
}

// generateToken generates a random token for VERP
func (s *Service) generateToken() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)
}

// generateMessageID generates a unique Message-ID
func (s *Service) generateMessageID(tenantID uuid.UUID) string {
	return fmt.Sprintf("<%s.%d@tms.example.com>", uuid.New().String(), time.Now().Unix())
}

// renderTemplate renders an email template with variables
func (s *Service) renderTemplate(template *EmailTemplate, variables map[string]interface{}) (subject, textBody, htmlBody string, err error) {
	// Simple template rendering - can be enhanced with proper template engine
	subject = s.replaceVariables(template.Subject, variables)
	textBody = s.replaceVariables(template.TextBody, variables)
	htmlBody = s.replaceVariables(template.HTMLBody, variables)
	return
}

// replaceVariables performs simple variable replacement
func (s *Service) replaceVariables(text string, variables map[string]interface{}) string {
	result := text
	for key, value := range variables {
		placeholder := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder, fmt.Sprintf("%v", value))
	}
	return result
}

// InboundResult represents the result of processing an inbound email
type InboundResult struct {
	MessageID   string
	From        string
	Subject     string
	Action      string // "create", "reply", "ignore", "reject"
	Reason      string
	TicketID    uuid.UUID
	ProjectID   uuid.UUID
	TextBody    string
	HTMLBody    string
	Attachments []Attachment
}

// SendTicketReplyRequest represents a request to send a ticket reply
type SendTicketReplyRequest struct {
	TenantID     uuid.UUID
	ProjectID    uuid.UUID
	TicketID     uuid.UUID
	FromAddress  string
	ToAddresses  []string
	CCAddresses  []string
	Subject      string
	TextBody     string
	HTMLBody     string
	Attachments  []Attachment
}

// SendMagicLinkRequest represents a request to send a magic link
type SendMagicLinkRequest struct {
	TenantID    uuid.UUID
	ToAddress   string
	FromAddress string
	Variables   map[string]interface{}
}
