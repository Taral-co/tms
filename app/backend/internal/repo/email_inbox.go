package repo

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/bareuptime/tms/internal/models"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// EmailInboxRepository defines the interface for email inbox operations
type EmailInboxRepository interface {
	// Email CRUD operations
	CreateEmail(ctx context.Context, email *models.EmailInbox) error
	GetEmailByID(ctx context.Context, tenantID, projectID, emailID uuid.UUID) (*models.EmailInbox, error)
	GetEmailByMessageID(ctx context.Context, tenantID uuid.UUID, messageID, mailboxAddress string) (*models.EmailInbox, error)
	UpdateEmail(ctx context.Context, email *models.EmailInbox) error
	DeleteEmail(ctx context.Context, tenantID, emailID uuid.UUID) error

	// Email listing and filtering
	ListEmails(ctx context.Context, tenantID uuid.UUID, filter EmailFilter) ([]*models.EmailInbox, error)
	CountEmails(ctx context.Context, tenantID uuid.UUID, filter EmailFilter) (int, error)

	// Email threading
	GetEmailThread(ctx context.Context, tenantID uuid.UUID, threadID string) ([]*models.EmailInbox, error)
	UpdateEmailThreadID(ctx context.Context, tenantID, emailID uuid.UUID, threadID string) error

	// Attachment operations
	CreateAttachment(ctx context.Context, attachment *models.EmailAttachment) error
	GetEmailAttachments(ctx context.Context, tenantID, projectID, emailID uuid.UUID) ([]*models.EmailAttachment, error)
	DeleteAttachment(ctx context.Context, tenantID, attachmentID uuid.UUID) error

	// Sync status operations
	GetSyncStatus(ctx context.Context, tenantID, connectorID uuid.UUID, mailboxAddress string) (*models.EmailSyncStatus, error)
	CreateOrUpdateSyncStatus(ctx context.Context, syncStatus *models.EmailSyncStatus) error

	// Ticket conversion
	ConvertEmailToTicket(ctx context.Context, tenantID, emailID, ticketID uuid.UUID) error
	GetEmailsForTicket(ctx context.Context, tenantID, ticketID uuid.UUID) ([]*models.EmailInbox, error)

	// Bulk operations
	MarkEmailsAsRead(ctx context.Context, tenantID uuid.UUID, emailIDs []uuid.UUID) error
	BulkCreateEmails(ctx context.Context, emails []*models.EmailInbox) error
}

// EmailFilter represents filtering options for email listing
type EmailFilter struct {
	ProjectID      *uuid.UUID
	MailboxAddress *string
	IsRead         *bool
	IsReply        *bool
	HasTicket      *bool
	ThreadID       *string
	FromAddress    *string
	Subject        *string
	Search         *string // Global search across subject, from_address, from_name, and snippet
	StartDate      *time.Time
	EndDate        *time.Time
	Limit          int
	Offset         int
	OrderBy        string // "received_at", "sent_at", "subject"
	OrderDir       string // "ASC", "DESC"
}

// emailInboxRepository implements EmailInboxRepository
type emailInboxRepository struct {
	db *sql.DB
}

// NewEmailInboxRepository creates a new email inbox repository
func NewEmailInboxRepository(db *sql.DB) EmailInboxRepository {
	return &emailInboxRepository{db: db}
}

// CreateEmail creates a new email in the inbox
func (r *emailInboxRepository) CreateEmail(ctx context.Context, email *models.EmailInbox) error {
	query := `
		INSERT INTO email_inbox (
			id, tenant_id, project_id, message_id, thread_id, uid, mailbox_address,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			reply_to_addresses, subject, body_text, body_html, snippet,
			is_read, is_reply, has_attachments, attachment_count, size_bytes,
			sent_at, received_at, sync_status, processing_error, ticket_id,
			is_converted_to_ticket, connector_id, headers, raw_email,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
			$29, $30, $31, $32, $33
		)`

	_, err := r.db.ExecContext(ctx, query,
		email.ID, email.TenantID, email.ProjectID, email.MessageID, email.ThreadID,
		email.UID, email.MailboxAddress, email.FromAddress, email.FromName,
		email.ToAddresses, email.CcAddresses, email.BccAddresses, email.ReplyToAddresses,
		email.Subject, email.BodyText, email.BodyHTML, email.Snippet,
		email.IsRead, email.IsReply, email.HasAttachments, email.AttachmentCount,
		email.SizeBytes, email.SentAt, email.ReceivedAt, email.SyncStatus,
		email.ProcessingError, email.TicketID, email.IsConvertedToTicket,
		email.ConnectorID, email.Headers, email.RawEmail, email.CreatedAt, email.UpdatedAt,
	)

	return err
}

// GetEmailByID retrieves an email by ID
func (r *emailInboxRepository) GetEmailByID(ctx context.Context, tenantID, projectID, emailID uuid.UUID) (*models.EmailInbox, error) {
	query := `
		SELECT id, tenant_id, project_id, message_id, thread_id, uid, mailbox_address,
			   from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			   reply_to_addresses, subject, body_text, body_html, snippet,
			   is_read, is_reply, has_attachments, attachment_count, size_bytes,
			   sent_at, received_at, sync_status, processing_error, ticket_id,
			   is_converted_to_ticket, connector_id, headers, raw_email,
			   created_at, updated_at
		FROM email_inbox
		WHERE tenant_id = $1 AND project_id = $2 AND id = $3`

	email := &models.EmailInbox{}
	err := r.db.QueryRowContext(ctx, query, tenantID, projectID, emailID).Scan(
		&email.ID, &email.TenantID, &email.ProjectID, &email.MessageID, &email.ThreadID,
		&email.UID, &email.MailboxAddress, &email.FromAddress, &email.FromName,
		&email.ToAddresses, &email.CcAddresses, &email.BccAddresses, &email.ReplyToAddresses,
		&email.Subject, &email.BodyText, &email.BodyHTML, &email.Snippet,
		&email.IsRead, &email.IsReply, &email.HasAttachments, &email.AttachmentCount,
		&email.SizeBytes, &email.SentAt, &email.ReceivedAt, &email.SyncStatus,
		&email.ProcessingError, &email.TicketID, &email.IsConvertedToTicket,
		&email.ConnectorID, &email.Headers, &email.RawEmail, &email.CreatedAt, &email.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return email, nil
}

// GetEmailByMessageID retrieves an email by message ID and mailbox address
func (r *emailInboxRepository) GetEmailByMessageID(ctx context.Context, tenantID uuid.UUID, messageID, mailboxAddress string) (*models.EmailInbox, error) {
	query := `
		SELECT id, tenant_id, project_id, message_id, thread_id, uid, mailbox_address,
			   from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			   reply_to_addresses, subject, body_text, body_html, snippet,
			   is_read, is_reply, has_attachments, attachment_count, size_bytes,
			   sent_at, received_at, sync_status, processing_error, ticket_id,
			   is_converted_to_ticket, connector_id, headers, raw_email,
			   created_at, updated_at
		FROM email_inbox
		WHERE tenant_id = $1 AND message_id = $2 AND mailbox_address = $3`

	email := &models.EmailInbox{}
	err := r.db.QueryRowContext(ctx, query, tenantID, messageID, mailboxAddress).Scan(
		&email.ID, &email.TenantID, &email.ProjectID, &email.MessageID, &email.ThreadID,
		&email.UID, &email.MailboxAddress, &email.FromAddress, &email.FromName,
		&email.ToAddresses, &email.CcAddresses, &email.BccAddresses, &email.ReplyToAddresses,
		&email.Subject, &email.BodyText, &email.BodyHTML, &email.Snippet,
		&email.IsRead, &email.IsReply, &email.HasAttachments, &email.AttachmentCount,
		&email.SizeBytes, &email.SentAt, &email.ReceivedAt, &email.SyncStatus,
		&email.ProcessingError, &email.TicketID, &email.IsConvertedToTicket,
		&email.ConnectorID, &email.Headers, &email.RawEmail, &email.CreatedAt, &email.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return email, nil
}

// UpdateEmail updates an existing email
func (r *emailInboxRepository) UpdateEmail(ctx context.Context, email *models.EmailInbox) error {
	query := `
		UPDATE email_inbox SET
			project_id = $3, thread_id = $4, is_read = $5, is_reply = $6,
			has_attachments = $7, attachment_count = $8, sync_status = $9,
			processing_error = $10, ticket_id = $11, is_converted_to_ticket = $12,
			headers = $13, updated_at = $14
		WHERE tenant_id = $1 AND id = $2`

	_, err := r.db.ExecContext(ctx, query,
		email.TenantID, email.ID, email.ProjectID, email.ThreadID,
		email.IsRead, email.IsReply, email.HasAttachments, email.AttachmentCount,
		email.SyncStatus, email.ProcessingError, email.TicketID,
		email.IsConvertedToTicket, email.Headers, email.UpdatedAt,
	)

	return err
}

// UpdateEmailThreadID updates just the thread_id for an email
func (r *emailInboxRepository) UpdateEmailThreadID(ctx context.Context, tenantID, emailID uuid.UUID, threadID string) error {
	query := `UPDATE email_inbox SET thread_id = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, emailID, threadID)
	return err
}

// DeleteEmail deletes an email
func (r *emailInboxRepository) DeleteEmail(ctx context.Context, tenantID, emailID uuid.UUID) error {
	query := `DELETE FROM email_inbox WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, emailID)
	return err
}

// ListEmails lists emails with filtering
func (r *emailInboxRepository) ListEmails(ctx context.Context, tenantID uuid.UUID, filter EmailFilter) ([]*models.EmailInbox, error) {
	query := `
		SELECT id, tenant_id, project_id, message_id, thread_id, uid, mailbox_address,
			   from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			   reply_to_addresses, subject, body_text, body_html, snippet,
			   is_read, is_reply, has_attachments, attachment_count, size_bytes,
			   sent_at, received_at, sync_status, processing_error, ticket_id,
			   is_converted_to_ticket, connector_id, headers, raw_email,
			   created_at, updated_at
		FROM email_inbox
		WHERE tenant_id = $1`

	args := []interface{}{tenantID}
	argCount := 1

	// Apply filters
	if filter.ProjectID != nil {
		argCount++
		query += ` AND project_id = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.ProjectID)
	}

	if filter.MailboxAddress != nil {
		argCount++
		query += ` AND mailbox_address = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.MailboxAddress)
	}

	if filter.IsRead != nil {
		argCount++
		query += ` AND is_read = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.IsRead)
	}

	if filter.IsReply != nil {
		argCount++
		query += ` AND is_reply = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.IsReply)
	}

	if filter.HasTicket != nil {
		if *filter.HasTicket {
			query += ` AND ticket_id IS NOT NULL`
		} else {
			query += ` AND ticket_id IS NULL`
		}
	}

	if filter.ThreadID != nil {
		argCount++
		query += ` AND thread_id = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.ThreadID)
	}

	if filter.FromAddress != nil {
		argCount++
		query += ` AND from_address ILIKE $` + fmt.Sprintf("%d", argCount)
		args = append(args, "%"+*filter.FromAddress+"%")
	}

	if filter.Subject != nil {
		argCount++
		query += ` AND subject ILIKE $` + fmt.Sprintf("%d", argCount)
		args = append(args, "%"+*filter.Subject+"%")
	}

	// Global search across multiple fields
	if filter.Search != nil {
		argCount++
		searchTerm := "%" + *filter.Search + "%"
		query += ` AND (subject ILIKE $` + fmt.Sprintf("%d", argCount) +
			` OR from_address ILIKE $` + fmt.Sprintf("%d", argCount) +
			` OR from_name ILIKE $` + fmt.Sprintf("%d", argCount) +
			` OR snippet ILIKE $` + fmt.Sprintf("%d", argCount) + `)`
		args = append(args, searchTerm)
	}

	if filter.StartDate != nil {
		argCount++
		query += ` AND received_at >= $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		query += ` AND received_at <= $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.EndDate)
	}

	// Order by
	orderBy := "received_at"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "DESC"
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	query += ` ORDER BY ` + orderBy + ` ` + orderDir

	// Limit and offset
	if filter.Limit > 0 {
		argCount++
		query += ` LIMIT $` + fmt.Sprintf("%d", argCount)
		args = append(args, filter.Limit)
	}

	if filter.Offset > 0 {
		argCount++
		query += ` OFFSET $` + fmt.Sprintf("%d", argCount)
		args = append(args, filter.Offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []*models.EmailInbox
	for rows.Next() {
		email := &models.EmailInbox{}
		err := rows.Scan(
			&email.ID, &email.TenantID, &email.ProjectID, &email.MessageID, &email.ThreadID,
			&email.UID, &email.MailboxAddress, &email.FromAddress, &email.FromName,
			&email.ToAddresses, &email.CcAddresses, &email.BccAddresses, &email.ReplyToAddresses,
			&email.Subject, &email.BodyText, &email.BodyHTML, &email.Snippet,
			&email.IsRead, &email.IsReply, &email.HasAttachments, &email.AttachmentCount,
			&email.SizeBytes, &email.SentAt, &email.ReceivedAt, &email.SyncStatus,
			&email.ProcessingError, &email.TicketID, &email.IsConvertedToTicket,
			&email.ConnectorID, &email.Headers, &email.RawEmail, &email.CreatedAt, &email.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		emails = append(emails, email)
	}

	return emails, nil
}

// CountEmails counts emails with filtering
func (r *emailInboxRepository) CountEmails(ctx context.Context, tenantID uuid.UUID, filter EmailFilter) (int, error) {
	query := `SELECT COUNT(*) FROM email_inbox WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argCount := 1

	// Apply same filters as ListEmails (without ORDER BY, LIMIT, OFFSET)
	if filter.ProjectID != nil {
		argCount++
		query += ` AND project_id = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.ProjectID)
	}

	if filter.MailboxAddress != nil {
		argCount++
		query += ` AND mailbox_address = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.MailboxAddress)
	}

	if filter.IsRead != nil {
		argCount++
		query += ` AND is_read = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.IsRead)
	}

	if filter.IsReply != nil {
		argCount++
		query += ` AND is_reply = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.IsReply)
	}

	if filter.HasTicket != nil {
		if *filter.HasTicket {
			query += ` AND ticket_id IS NOT NULL`
		} else {
			query += ` AND ticket_id IS NULL`
		}
	}

	if filter.ThreadID != nil {
		argCount++
		query += ` AND thread_id = $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.ThreadID)
	}

	if filter.FromAddress != nil {
		argCount++
		query += ` AND from_address ILIKE $` + fmt.Sprintf("%d", argCount)
		args = append(args, "%"+*filter.FromAddress+"%")
	}

	if filter.Subject != nil {
		argCount++
		query += ` AND subject ILIKE $` + fmt.Sprintf("%d", argCount)
		args = append(args, "%"+*filter.Subject+"%")
	}

	// Global search across multiple fields
	if filter.Search != nil {
		argCount++
		searchTerm := "%" + *filter.Search + "%"
		query += ` AND (subject ILIKE $` + fmt.Sprintf("%d", argCount) +
			` OR from_address ILIKE $` + fmt.Sprintf("%d", argCount) +
			` OR from_name ILIKE $` + fmt.Sprintf("%d", argCount) +
			` OR snippet ILIKE $` + fmt.Sprintf("%d", argCount) + `)`
		args = append(args, searchTerm)
	}

	if filter.StartDate != nil {
		argCount++
		query += ` AND received_at >= $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.StartDate)
	}

	if filter.EndDate != nil {
		argCount++
		query += ` AND received_at <= $` + fmt.Sprintf("%d", argCount)
		args = append(args, *filter.EndDate)
	}

	var count int
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	return count, err
}

// GetEmailThread retrieves all emails in a thread
func (r *emailInboxRepository) GetEmailThread(ctx context.Context, tenantID uuid.UUID, threadID string) ([]*models.EmailInbox, error) {
	filter := EmailFilter{
		ThreadID: &threadID,
		OrderBy:  "received_at",
		OrderDir: "ASC",
	}
	return r.ListEmails(ctx, tenantID, filter)
}

// CreateAttachment creates a new email attachment
func (r *emailInboxRepository) CreateAttachment(ctx context.Context, attachment *models.EmailAttachment) error {
	query := `
		INSERT INTO email_attachments (
			id, email_id, tenant_id, filename, content_type, size_bytes,
			content_id, is_inline, storage_path, storage_url, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := r.db.ExecContext(ctx, query,
		attachment.ID, attachment.EmailID, attachment.TenantID, attachment.Filename,
		attachment.ContentType, attachment.SizeBytes, attachment.ContentID,
		attachment.IsInline, attachment.StoragePath, attachment.StorageURL, attachment.CreatedAt,
	)

	return err
}

// GetEmailAttachments retrieves all attachments for an email
func (r *emailInboxRepository) GetEmailAttachments(ctx context.Context, tenantID, projectID, emailID uuid.UUID) ([]*models.EmailAttachment, error) {
	query := `
		SELECT id, email_id, tenant_id, filename, content_type, size_bytes,
			   content_id, is_inline, storage_path, storage_url, created_at
		FROM email_attachments
		WHERE tenant_id = $1 AND project_id = $2 AND email_id = $3
		ORDER BY created_at ASC`

	rows, err := r.db.QueryContext(ctx, query, tenantID, projectID, emailID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []*models.EmailAttachment
	for rows.Next() {
		attachment := &models.EmailAttachment{}
		err := rows.Scan(
			&attachment.ID, &attachment.EmailID, &attachment.TenantID, &attachment.Filename,
			&attachment.ContentType, &attachment.SizeBytes, &attachment.ContentID,
			&attachment.IsInline, &attachment.StoragePath, &attachment.StorageURL, &attachment.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		attachments = append(attachments, attachment)
	}

	return attachments, nil
}

// DeleteAttachment deletes an attachment
func (r *emailInboxRepository) DeleteAttachment(ctx context.Context, tenantID, attachmentID uuid.UUID) error {
	query := `DELETE FROM email_attachments WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, attachmentID)
	return err
}

// GetSyncStatus retrieves sync status for a mailbox
func (r *emailInboxRepository) GetSyncStatus(ctx context.Context, tenantID, connectorID uuid.UUID, mailboxAddress string) (*models.EmailSyncStatus, error) {
	query := `
		SELECT id, tenant_id, connector_id, mailbox_address, last_sync_at,
			   last_uid, last_message_date, sync_status, sync_error,
			   emails_synced_count, created_at, updated_at
		FROM email_sync_status
		WHERE tenant_id = $1 AND connector_id = $2 AND mailbox_address = $3`

	status := &models.EmailSyncStatus{}
	err := r.db.QueryRowContext(ctx, query, tenantID, connectorID, mailboxAddress).Scan(
		&status.ID, &status.TenantID, &status.ConnectorID, &status.MailboxAddress,
		&status.LastSyncAt, &status.LastUID, &status.LastMessageDate, &status.SyncStatus,
		&status.SyncError, &status.EmailsSyncedCount, &status.CreatedAt, &status.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return status, nil
}

// CreateOrUpdateSyncStatus creates or updates sync status
func (r *emailInboxRepository) CreateOrUpdateSyncStatus(ctx context.Context, syncStatus *models.EmailSyncStatus) error {
	query := `
		INSERT INTO email_sync_status (
			id, tenant_id, connector_id, mailbox_address, last_sync_at,
			last_uid, last_message_date, sync_status, sync_error,
			emails_synced_count, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (tenant_id, connector_id, mailbox_address)
		DO UPDATE SET
			last_sync_at = EXCLUDED.last_sync_at,
			last_uid = EXCLUDED.last_uid,
			last_message_date = EXCLUDED.last_message_date,
			sync_status = EXCLUDED.sync_status,
			sync_error = EXCLUDED.sync_error,
			emails_synced_count = EXCLUDED.emails_synced_count,
			updated_at = EXCLUDED.updated_at`

	_, err := r.db.ExecContext(ctx, query,
		syncStatus.ID, syncStatus.TenantID, syncStatus.ConnectorID, syncStatus.MailboxAddress,
		syncStatus.LastSyncAt, syncStatus.LastUID, syncStatus.LastMessageDate,
		syncStatus.SyncStatus, syncStatus.SyncError, syncStatus.EmailsSyncedCount,
		syncStatus.CreatedAt, syncStatus.UpdatedAt,
	)

	return err
}

// ConvertEmailToTicket marks an email as converted to a ticket
func (r *emailInboxRepository) ConvertEmailToTicket(ctx context.Context, tenantID, emailID, ticketID uuid.UUID) error {
	query := `
		UPDATE email_inbox SET
			ticket_id = $3, is_converted_to_ticket = true, updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2`

	_, err := r.db.ExecContext(ctx, query, tenantID, emailID, ticketID)
	return err
}

// GetEmailsForTicket retrieves all emails associated with a ticket
func (r *emailInboxRepository) GetEmailsForTicket(ctx context.Context, tenantID, ticketID uuid.UUID) ([]*models.EmailInbox, error) {
	query := `
		SELECT id, tenant_id, project_id, message_id, thread_id, uid, mailbox_address,
			   from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			   reply_to_addresses, subject, body_text, body_html, snippet,
			   is_read, is_reply, has_attachments, attachment_count, size_bytes,
			   sent_at, received_at, sync_status, processing_error, ticket_id,
			   is_converted_to_ticket, connector_id, headers, raw_email,
			   created_at, updated_at
		FROM email_inbox
		WHERE tenant_id = $1 AND ticket_id = $2
		ORDER BY received_at ASC`

	rows, err := r.db.QueryContext(ctx, query, tenantID, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []*models.EmailInbox
	for rows.Next() {
		email := &models.EmailInbox{}
		err := rows.Scan(
			&email.ID, &email.TenantID, &email.ProjectID, &email.MessageID, &email.ThreadID,
			&email.UID, &email.MailboxAddress, &email.FromAddress, &email.FromName,
			&email.ToAddresses, &email.CcAddresses, &email.BccAddresses, &email.ReplyToAddresses,
			&email.Subject, &email.BodyText, &email.BodyHTML, &email.Snippet,
			&email.IsRead, &email.IsReply, &email.HasAttachments, &email.AttachmentCount,
			&email.SizeBytes, &email.SentAt, &email.ReceivedAt, &email.SyncStatus,
			&email.ProcessingError, &email.TicketID, &email.IsConvertedToTicket,
			&email.ConnectorID, &email.Headers, &email.RawEmail, &email.CreatedAt, &email.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		emails = append(emails, email)
	}

	return emails, nil
}

// MarkEmailsAsRead marks multiple emails as read
func (r *emailInboxRepository) MarkEmailsAsRead(ctx context.Context, tenantID uuid.UUID, emailIDs []uuid.UUID) error {
	if len(emailIDs) == 0 {
		return nil
	}

	query := `UPDATE email_inbox SET is_read = true, updated_at = NOW() WHERE tenant_id = $1 AND id = ANY($2)`
	_, err := r.db.ExecContext(ctx, query, tenantID, pq.Array(emailIDs))
	return err
}

// BulkCreateEmails creates multiple emails in a transaction
func (r *emailInboxRepository) BulkCreateEmails(ctx context.Context, emails []*models.EmailInbox) error {
	if len(emails) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO email_inbox (
			id, tenant_id, project_id, message_id, thread_id, uid, mailbox_address,
			from_address, from_name, to_addresses, cc_addresses, bcc_addresses,
			reply_to_addresses, subject, body_text, body_html, snippet,
			is_read, is_reply, has_attachments, attachment_count, size_bytes,
			sent_at, received_at, sync_status, processing_error, ticket_id,
			is_converted_to_ticket, connector_id, headers, raw_email,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
			$29, $30, $31, $32, $33
		) ON CONFLICT (tenant_id, message_id, mailbox_address) DO NOTHING`)

	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, email := range emails {
		_, err := stmt.ExecContext(ctx,
			email.ID, email.TenantID, email.ProjectID, email.MessageID, email.ThreadID,
			email.UID, email.MailboxAddress, email.FromAddress, email.FromName,
			email.ToAddresses, email.CcAddresses, email.BccAddresses, email.ReplyToAddresses,
			email.Subject, email.BodyText, email.BodyHTML, email.Snippet,
			email.IsRead, email.IsReply, email.HasAttachments, email.AttachmentCount,
			email.SizeBytes, email.SentAt, email.ReceivedAt, email.SyncStatus,
			email.ProcessingError, email.TicketID, email.IsConvertedToTicket,
			email.ConnectorID, email.Headers, email.RawEmail, email.CreatedAt, email.UpdatedAt,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
