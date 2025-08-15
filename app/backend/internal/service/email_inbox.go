package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/mail"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// EmailInboxService handles email inbox operations
type EmailInboxService struct {
	emailInboxRepo repo.EmailInboxRepository
	ticketRepo     repo.TicketRepository
	messageRepo    repo.TicketMessageRepository
	customerRepo   repo.CustomerRepository
	emailRepo      *repo.EmailRepo
	mailService    *mail.Service
	logger         zerolog.Logger
}

// NewEmailInboxService creates a new email inbox service
func NewEmailInboxService(
	emailInboxRepo repo.EmailInboxRepository,
	ticketRepo repo.TicketRepository,
	messageRepo repo.TicketMessageRepository,
	customerRepo repo.CustomerRepository,
	emailRepo *repo.EmailRepo,
	mailService *mail.Service,
	logger zerolog.Logger,
) *EmailInboxService {
	return &EmailInboxService{
		emailInboxRepo: emailInboxRepo,
		ticketRepo:     ticketRepo,
		messageRepo:    messageRepo,
		customerRepo:   customerRepo,
		emailRepo:      emailRepo,
		mailService:    mailService,
		logger:         logger,
	}
}

// ListEmails lists emails in the inbox with filtering
func (s *EmailInboxService) ListEmails(ctx context.Context, tenantID uuid.UUID, filter repo.EmailFilter) ([]*models.EmailInbox, int, error) {
	emails, err := s.emailInboxRepo.ListEmails(ctx, tenantID, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list emails: %w", err)
	}

	count, err := s.emailInboxRepo.CountEmails(ctx, tenantID, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count emails: %w", err)
	}

	return emails, count, nil
}

// GetEmail retrieves a single email by ID
func (s *EmailInboxService) GetEmail(ctx context.Context, tenantID, emailID uuid.UUID) (*models.EmailInbox, error) {
	email, err := s.emailInboxRepo.GetEmailByID(ctx, tenantID, emailID)
	if err != nil {
		return nil, fmt.Errorf("failed to get email: %w", err)
	}

	return email, nil
}

// GetEmailWithAttachments retrieves an email with its attachments
func (s *EmailInboxService) GetEmailWithAttachments(ctx context.Context, tenantID, emailID uuid.UUID) (*models.EmailInbox, []*models.EmailAttachment, error) {
	email, err := s.emailInboxRepo.GetEmailByID(ctx, tenantID, emailID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get email: %w", err)
	}

	attachments, err := s.emailInboxRepo.GetEmailAttachments(ctx, tenantID, emailID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get attachments: %w", err)
	}

	return email, attachments, nil
}

// MarkEmailAsRead marks an email as read
func (s *EmailInboxService) MarkEmailAsRead(ctx context.Context, tenantID, emailID uuid.UUID) error {
	email, err := s.emailInboxRepo.GetEmailByID(ctx, tenantID, emailID)
	if err != nil {
		return fmt.Errorf("failed to get email: %w", err)
	}

	if email.IsRead {
		return nil // Already read
	}

	email.IsRead = true
	email.UpdatedAt = time.Now()

	return s.emailInboxRepo.UpdateEmail(ctx, email)
}

// MarkEmailsAsRead marks multiple emails as read
func (s *EmailInboxService) MarkEmailsAsRead(ctx context.Context, tenantID uuid.UUID, emailIDs []uuid.UUID) error {
	return s.emailInboxRepo.MarkEmailsAsRead(ctx, tenantID, emailIDs)
}

// SyncEmails performs email synchronization for all IMAP connectors
func (s *EmailInboxService) SyncEmails(ctx context.Context, tenantID, projectID uuid.UUID) error {
	s.logger.Info().
		Str("tenant_id", tenantID.String()).
		Str("project_id", projectID.String()).
		Msg("Starting manual email synchronization")

	// Get all active IMAP connectors for the tenant
	imapType := models.ConnectorTypeInboundIMAP
	connectors, err := s.emailRepo.ListConnectorsByTenant(ctx, tenantID, projectID, &imapType)
	if err != nil {
		s.logger.Error().Err(err).Msg("Failed to get IMAP connectors")
		return fmt.Errorf("failed to get IMAP connectors: %w", err)
	}

	if len(connectors) == 0 {
		s.logger.Info().Msg("No IMAP connectors found for tenant")
		return nil
	}

	s.logger.Info().
		Int("connector_count", len(connectors)).
		Msg("Found IMAP connectors for sync")

	// Sync each active connector
	var syncErrors []error
	for _, connector := range connectors {
		if !connector.IsActive || !connector.IsValidated {
			s.logger.Debug().
				Str("connector_id", connector.ID.String()).
				Str("connector_name", connector.Name).
				Bool("is_active", connector.IsActive).
				Bool("is_validated", connector.IsValidated).
				Msg("Skipping inactive or unvalidated connector")
			continue
		}

		s.logger.Info().
			Str("connector_id", connector.ID.String()).
			Str("connector_name", connector.Name).
			Msg("Starting sync for connector")

		if err := s.syncConnector(ctx, connector, projectID); err != nil {
			s.logger.Error().
				Err(err).
				Str("connector_id", connector.ID.String()).
				Str("connector_name", connector.Name).
				Msg("Failed to sync connector")
			syncErrors = append(syncErrors, fmt.Errorf("connector %s: %w", connector.Name, err))
		} else {
			s.logger.Info().
				Str("connector_id", connector.ID.String()).
				Str("connector_name", connector.Name).
				Msg("Successfully synced connector")
		}
	}

	if len(syncErrors) > 0 {
		return fmt.Errorf("sync completed with errors: %v", syncErrors)
	}

	s.logger.Info().
		Str("tenant_id", tenantID.String()).
		Msg("Manual email synchronization completed successfully")

	return nil
}

// syncConnector performs email synchronization for a single IMAP connector
func (s *EmailInboxService) syncConnector(ctx context.Context, connector *models.EmailConnector, projectID uuid.UUID) error {
	// Get mailboxes for this connector
	mailboxes, err := s.emailRepo.ListMailboxes(ctx, connector.TenantID, projectID)
	if err != nil {
		return fmt.Errorf("failed to get mailboxes: %w", err)
	}

	// Filter mailboxes that use this connector
	var connectorMailboxes []*models.EmailMailbox
	for _, mailbox := range mailboxes {
		if mailbox.InboundConnectorID == connector.ID {
			connectorMailboxes = append(connectorMailboxes, mailbox)
		}
	}

	if len(connectorMailboxes) == 0 {
		s.logger.Debug().
			Str("connector_id", connector.ID.String()).
			Msg("No mailboxes found for connector")
		return nil
	}

	// Create IMAP client for syncing
	imapClient := s.mailService.GetIMAPClient()

	// Test connection first
	if err := imapClient.TestConnection(ctx, connector); err != nil {
		return fmt.Errorf("IMAP connection test failed: %w", err)
	}

	// For each mailbox, update sync status and fetch new messages
	var mailboxAddresses []string
	for _, mailbox := range connectorMailboxes {
		mailboxAddresses = append(mailboxAddresses, mailbox.Address)
	}

	// Process messages for each mailbox
	for _, mailbox := range connectorMailboxes {
		if err := s.syncMailbox(ctx, connector, mailbox, imapClient); err != nil {
			s.logger.Error().
				Err(err).
				Str("mailbox_address", mailbox.Address).
				Msg("Failed to sync mailbox")
			// Continue with other mailboxes even if one fails
		}
	}

	return nil
}

// syncMailbox syncs a single mailbox
func (s *EmailInboxService) syncMailbox(ctx context.Context, connector *models.EmailConnector, mailbox *models.EmailMailbox, imapClient *mail.IMAPClient) error {
	s.logger.Debug().
		Str("connector_id", connector.ID.String()).
		Str("mailbox_address", mailbox.Address).
		Msg("Starting mailbox sync")

	// Get current sync status
	syncStatus, err := s.emailInboxRepo.GetSyncStatus(ctx, connector.TenantID, connector.ID, mailbox.Address)
	if err != nil {
		// Create new sync status if not found
		syncStatus = &models.EmailSyncStatus{
			ID:             uuid.New(),
			TenantID:       connector.TenantID,
			ConnectorID:    connector.ID,
			MailboxAddress: mailbox.Address,
			LastUID:        0,
			SyncStatus:     "idle",
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
	}

	// Update sync status to indicate we're syncing
	syncStatus.SyncStatus = "syncing"
	syncStatus.SyncError = nil
	syncStatus.UpdatedAt = time.Now()

	if err := s.emailInboxRepo.CreateOrUpdateSyncStatus(ctx, syncStatus); err != nil {
		return fmt.Errorf("failed to update sync status: %w", err)
	}

	defer func() {
		// Always update sync status when done (success or failure)
		syncStatus.LastSyncAt = &[]time.Time{time.Now()}[0]
		syncStatus.UpdatedAt = time.Now()
		if err := s.emailInboxRepo.CreateOrUpdateSyncStatus(ctx, syncStatus); err != nil {
			s.logger.Error().Err(err).Msg("Failed to update final sync status")
		}
	}()

	// Fetch new messages since last UID (unseen only)
	messages, err := imapClient.FetchMessagesForMailboxes(ctx, connector, uint32(syncStatus.LastUID), true, []string{mailbox.Address})
	if err != nil {
		syncStatus.SyncStatus = "error"
		errorMsg := err.Error()
		syncStatus.SyncError = &errorMsg
		return fmt.Errorf("failed to fetch messages: %w", err)
	}

	if len(messages) == 0 {
		s.logger.Debug().
			Str("mailbox_address", mailbox.Address).
			Msg("No new messages found12")
		syncStatus.SyncStatus = "idle"
		return nil
	}

	s.logger.Info().
		Str("mailbox_address", mailbox.Address).
		Int("message_count", len(messages)).
		Msg("Processing new messages")

	// Process each message
	newEmailsCount := 0
	for _, msg := range messages {
		// Check if email already exists
		existingEmail, err := s.emailInboxRepo.GetEmailByMessageID(ctx, connector.TenantID, msg.MessageID, mailbox.Address)
		if err == nil && existingEmail != nil {
			s.logger.Debug().
				Str("message_id", msg.MessageID).
				Msg("Email already exists, skipping")
			continue
		}

		// Process the message through the mail service
		result, err := s.mailService.ProcessInboundEmail(ctx, msg, mailbox)
		if err != nil {
			s.logger.Error().
				Err(err).
				Str("message_id", msg.MessageID).
				Msg("Failed to process message")
			continue
		}

		// Create email inbox record
		emailRecord := s.convertMessageToEmailInbox(msg, mailbox, connector, result)
		if err := s.emailInboxRepo.CreateEmail(ctx, emailRecord); err != nil {
			s.logger.Error().
				Err(err).
				Str("message_id", msg.MessageID).
				Msg("Failed to create email record")
			continue
		}

		s.logger.Debug().
			Str("message_id", msg.MessageID).
			Str("action", result.Action).
			Msg("Processed and saved inbound message")

		newEmailsCount++
	}

	// Update sync status with success
	syncStatus.SyncStatus = "idle"
	syncStatus.EmailsSyncedCount += newEmailsCount
	if len(messages) > 0 {
		// Update last UID to the highest UID processed
		// Note: This is a simplified implementation. In a real system,
		// you'd track the actual IMAP UIDs properly
		syncStatus.LastUID = syncStatus.LastUID + len(messages)
		syncStatus.LastMessageDate = &messages[len(messages)-1].Date
	}

	s.logger.Info().
		Str("mailbox_address", mailbox.Address).
		Int("new_emails", newEmailsCount).
		Int("total_synced", syncStatus.EmailsSyncedCount).
		Msg("Mailbox sync completed")

	return nil
}

// convertMessageToEmailInbox converts a parsed message to an EmailInbox record
func (s *EmailInboxService) convertMessageToEmailInbox(msg *mail.ParsedMessage, mailbox *models.EmailMailbox, connector *models.EmailConnector, result *mail.InboundResult) *models.EmailInbox {
	now := time.Now()

	email := &models.EmailInbox{
		ID:              uuid.New(),
		TenantID:        connector.TenantID,
		ProjectID:       &mailbox.ProjectID,
		MessageID:       msg.MessageID,
		MailboxAddress:  mailbox.Address,
		FromAddress:     msg.From,
		ToAddresses:     msg.To,
		CcAddresses:     msg.CC,
		Subject:         msg.Subject,
		BodyText:        &msg.TextBody,
		BodyHTML:        &msg.HTMLBody,
		IsRead:          false,
		IsReply:         s.isReplyMessage(msg),
		HasAttachments:  len(msg.Attachments) > 0,
		AttachmentCount: len(msg.Attachments),
		SentAt:          &msg.Date,
		ReceivedAt:      now,
		SyncStatus:      "synced",
		ConnectorID:     connector.ID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// Set thread ID if available (simplified implementation)
	if threadID := s.extractThreadID(msg); threadID != "" {
		email.ThreadID = &threadID
	}

	// Set from name if available
	if fromName := s.extractFromName(msg.From); fromName != "" {
		email.FromName = &fromName
	}

	// Create snippet from text body
	if snippet := s.createSnippet(msg.TextBody); snippet != "" {
		email.Snippet = &snippet
	}

	// Convert headers from map[string][]string to JSONMap for JSONB storage
	if msg.Headers != nil {
		h := models.JSONMap{}
		for key, values := range msg.Headers {
			if len(values) == 1 {
				h[key] = values[0]
			} else if len(values) > 1 {
				h[key] = values
			}
		}
		email.Headers = h
	}

	return email
}

// isReplyMessage determines if this message is a reply
func (s *EmailInboxService) isReplyMessage(msg *mail.ParsedMessage) bool {
	// Simple heuristics for detecting replies
	subject := strings.ToLower(msg.Subject)
	return strings.HasPrefix(subject, "re:") ||
		strings.HasPrefix(subject, "fwd:") ||
		strings.Contains(subject, "reply")
}

// extractThreadID extracts thread ID from message headers
func (s *EmailInboxService) extractThreadID(msg *mail.ParsedMessage) string {
	// Look for common thread identification headers
	if inReplyTo := msg.InReplyTo; inReplyTo != "" {
		return inReplyTo
	}
	if len(msg.References) > 0 {
		// Take the first reference as thread ID
		return msg.References[0]
	}
	return ""
}

// extractFromName extracts the display name from an email address
func (s *EmailInboxService) extractFromName(fromAddress string) string {
	// Simple extraction - in a real implementation you'd use proper email parsing
	if strings.Contains(fromAddress, "<") {
		parts := strings.Split(fromAddress, "<")
		if len(parts) > 0 {
			name := strings.TrimSpace(parts[0])
			name = strings.Trim(name, `"`)
			return name
		}
	}
	return ""
}

// createSnippet creates a preview snippet from email content
func (s *EmailInboxService) createSnippet(textBody string) string {
	const maxSnippetLength = 150

	// Clean up the text
	text := strings.TrimSpace(textBody)
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.ReplaceAll(text, "\r", " ")
	text = strings.ReplaceAll(text, "\t", " ")

	// Remove multiple spaces
	for strings.Contains(text, "  ") {
		text = strings.ReplaceAll(text, "  ", " ")
	}

	// Truncate if too long
	if len(text) > maxSnippetLength {
		text = text[:maxSnippetLength] + "..."
	}

	return text
}

// ConvertEmailToTicket converts an email to a ticket
func (s *EmailInboxService) ConvertEmailToTicket(ctx context.Context, tenantID, emailID, projectID uuid.UUID, ticketType, priority string) (*db.Ticket, error) {
	email, err := s.emailInboxRepo.GetEmailByID(ctx, tenantID, emailID)
	if err != nil {
		return nil, fmt.Errorf("failed to get email: %w", err)
	}

	if email.IsConvertedToTicket {
		return nil, fmt.Errorf("email is already converted to a ticket")
	}

	// Find or create customer
	customer, err := s.findOrCreateCustomer(ctx, tenantID, email.FromAddress, email.FromName)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create customer: %w", err)
	}

	// Create ticket
	ticket := &db.Ticket{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		Subject:    email.Subject,
		Status:     "new",
		Priority:   priority,
		Type:       ticketType,
		Source:     "email",
		CustomerID: customer.ID,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err = s.ticketRepo.Create(ctx, ticket)
	if err != nil {
		return nil, fmt.Errorf("failed to create ticket: %w", err)
	}

	// Update email to reference the ticket
	err = s.emailInboxRepo.ConvertEmailToTicket(ctx, tenantID, emailID, ticket.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to link email to ticket: %w", err)
	}

	// Create initial message from email content
	body := ""
	if email.BodyText != nil {
		body = *email.BodyText
	} else if email.BodyHTML != nil {
		body = *email.BodyHTML
	}

	message := &db.TicketMessage{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		TicketID:   ticket.ID,
		AuthorType: "customer",
		AuthorID:   &customer.ID,
		Body:       body,
		IsPrivate:  false,
		CreatedAt:  email.ReceivedAt,
	}

	err = s.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to create ticket message: %w", err)
	}

	return ticket, nil
}

// ReplyToEmail sends a reply to an email (placeholder implementation)
func (s *EmailInboxService) ReplyToEmail(ctx context.Context, tenantID, emailID uuid.UUID, replyBody string, isPrivate bool) error {
	// TODO: Implement actual email reply logic
	// This would need SMTP configuration and email sending
	return nil
}

// GetSyncStatus retrieves sync status for mailboxes
func (s *EmailInboxService) GetSyncStatus(ctx context.Context, tenantID, projectID uuid.UUID) ([]*models.EmailSyncStatus, error) {
	// Get all IMAP connectors for the tenant
	imapType := models.ConnectorTypeInboundIMAP
	connectors, err := s.emailRepo.ListConnectorsByTenant(ctx, tenantID, projectID, &imapType)
	if err != nil {
		return nil, fmt.Errorf("failed to get IMAP connectors: %w", err)
	}

	var allStatuses []*models.EmailSyncStatus

	// For each connector, get sync statuses for its mailboxes
	for _, connector := range connectors {
		// Get mailboxes for this connector
		mailboxes, err := s.emailRepo.ListMailboxes(ctx, connector.TenantID, projectID)
		if err != nil {
			s.logger.Error().
				Err(err).
				Str("connector_id", connector.ID.String()).
				Msg("Failed to get mailboxes for connector")
			continue
		}

		// Get sync status for each mailbox that uses this connector
		for _, mailbox := range mailboxes {
			if mailbox.InboundConnectorID == connector.ID {
				syncStatus, err := s.emailInboxRepo.GetSyncStatus(ctx, connector.TenantID, connector.ID, mailbox.Address)
				if err != nil {
					// If no sync status exists, create a default one
					syncStatus = &models.EmailSyncStatus{
						ID:             uuid.New(),
						TenantID:       connector.TenantID,
						ConnectorID:    connector.ID,
						MailboxAddress: mailbox.Address,
						LastUID:        0,
						SyncStatus:     "idle",
						CreatedAt:      time.Now(),
						UpdatedAt:      time.Now(),
					}
				}
				allStatuses = append(allStatuses, syncStatus)
			}
		}
	}

	return allStatuses, nil
}

// findOrCreateCustomer finds an existing customer by email or creates a new one
func (s *EmailInboxService) findOrCreateCustomer(ctx context.Context, tenantID uuid.UUID, email string, name *string) (*db.Customer, error) {
	// Try to find existing customer
	customer, err := s.customerRepo.GetByEmail(ctx, tenantID, email)
	if err == nil {
		return customer, nil
	}

	// Create new customer
	customerName := email
	if name != nil && *name != "" {
		customerName = *name
	}

	newCustomer := &db.Customer{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Email:     email,
		Name:      customerName,
		Metadata:  make(map[string]string),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = s.customerRepo.Create(ctx, newCustomer)
	if err != nil {
		return nil, fmt.Errorf("failed to create customer: %w", err)
	}

	return newCustomer, nil
}
