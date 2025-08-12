package service

import (
	"context"
	"fmt"
	"time"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
)

// EmailInboxService handles email inbox operations
type EmailInboxService struct {
	emailInboxRepo repo.EmailInboxRepository
	ticketRepo     repo.TicketRepository
	messageRepo    repo.TicketMessageRepository
	customerRepo   repo.CustomerRepository
}

// NewEmailInboxService creates a new email inbox service
func NewEmailInboxService(
	emailInboxRepo repo.EmailInboxRepository,
	ticketRepo repo.TicketRepository,
	messageRepo repo.TicketMessageRepository,
	customerRepo repo.CustomerRepository,
) *EmailInboxService {
	return &EmailInboxService{
		emailInboxRepo: emailInboxRepo,
		ticketRepo:     ticketRepo,
		messageRepo:    messageRepo,
		customerRepo:   customerRepo,
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

// SyncEmails performs email synchronization (placeholder implementation)
func (s *EmailInboxService) SyncEmails(ctx context.Context, tenantID uuid.UUID) error {
	// TODO: Implement actual email sync logic
	// For now, this is a placeholder
	return nil
}

// ForceSyncEmails forces email synchronization for a specific connector (placeholder implementation)
func (s *EmailInboxService) ForceSyncEmails(ctx context.Context, tenantID, connectorID uuid.UUID) error {
	// TODO: Implement actual email sync logic
	// For now, this is a placeholder
	return nil
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
		ID:          uuid.New(),
		TenantID:    tenantID,
		ProjectID:   projectID,
		Subject:     email.Subject,
		Status:      "new",
		Priority:    priority,
		Type:        ticketType,
		Source:      "email",
		RequesterID: customer.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
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

// GetSyncStatus retrieves sync status for mailboxes (placeholder implementation)
func (s *EmailInboxService) GetSyncStatus(ctx context.Context, tenantID uuid.UUID) ([]*models.EmailSyncStatus, error) {
	// TODO: Implement actual sync status retrieval
	return []*models.EmailSyncStatus{}, nil
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
