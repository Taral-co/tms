package repo

import (
	"context"
	"database/sql"

	"github.com/bareuptime/tms/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// EmailRepo handles email-related database operations
type EmailRepo struct {
	db *sqlx.DB
}

// NewEmailRepo creates a new email repository
func NewEmailRepo(db *sqlx.DB) *EmailRepo {
	return &EmailRepo{db: db}
}

// CreateConnector creates a new email connector
func (r *EmailRepo) CreateConnector(ctx context.Context, connector *models.EmailConnector) error {
	query := `
		INSERT INTO email_connectors (
			id, tenant_id, type, name, is_active,
			imap_host, imap_port, imap_use_tls, imap_username, imap_password_enc, imap_folder, imap_seen_strategy,
			smtp_host, smtp_port, smtp_use_tls, smtp_username, smtp_password_enc,
			oauth_provider, oauth_account_email, oauth_token_ref,
			from_name, from_address, reply_to_address,
			dkim_selector, dkim_public_key, dkim_private_key_enc, return_path_domain,
			provider_webhook_secret, last_health, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :type, :name, :is_active,
			:imap_host, :imap_port, :imap_use_tls, :imap_username, :imap_password_enc, :imap_folder, :imap_seen_strategy,
			:smtp_host, :smtp_port, :smtp_use_tls, :smtp_username, :smtp_password_enc,
			:oauth_provider, :oauth_account_email, :oauth_token_ref,
			:from_name, :from_address, :reply_to_address,
			:dkim_selector, :dkim_public_key, :dkim_private_key_enc, :return_path_domain,
			:provider_webhook_secret, :last_health, :created_at, :updated_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, connector)
	return err
}

// GetConnector retrieves an email connector by ID
func (r *EmailRepo) GetConnector(ctx context.Context, tenantID, connectorID uuid.UUID) (*models.EmailConnector, error) {
	var connector models.EmailConnector
	query := `
		SELECT * FROM email_connectors 
		WHERE tenant_id = $1 AND id = $2`

	err := r.db.GetContext(ctx, &connector, query, tenantID, connectorID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &connector, err
}

// ListConnectors retrieves all email connectors for a tenant
func (r *EmailRepo) ListConnectors(ctx context.Context, tenantID uuid.UUID, connectorType *models.EmailConnectorType) ([]*models.EmailConnector, error) {
	var connectors []*models.EmailConnector
	
	query := `SELECT * FROM email_connectors WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	
	if connectorType != nil {
		query += ` AND type = $2`
		args = append(args, *connectorType)
	}
	
	query += ` ORDER BY created_at DESC`

	err := r.db.SelectContext(ctx, &connectors, query, args...)
	return connectors, err
}

// UpdateConnector updates an email connector
func (r *EmailRepo) UpdateConnector(ctx context.Context, connector *models.EmailConnector) error {
	query := `
		UPDATE email_connectors SET
			name = :name, is_active = :is_active,
			imap_host = :imap_host, imap_port = :imap_port, imap_use_tls = :imap_use_tls, 
			imap_username = :imap_username, imap_password_enc = :imap_password_enc, 
			imap_folder = :imap_folder, imap_seen_strategy = :imap_seen_strategy,
			smtp_host = :smtp_host, smtp_port = :smtp_port, smtp_use_tls = :smtp_use_tls,
			smtp_username = :smtp_username, smtp_password_enc = :smtp_password_enc,
			oauth_provider = :oauth_provider, oauth_account_email = :oauth_account_email, oauth_token_ref = :oauth_token_ref,
			from_name = :from_name, from_address = :from_address, reply_to_address = :reply_to_address,
			dkim_selector = :dkim_selector, dkim_public_key = :dkim_public_key, dkim_private_key_enc = :dkim_private_key_enc,
			return_path_domain = :return_path_domain, provider_webhook_secret = :provider_webhook_secret,
			last_health = :last_health, updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, connector)
	return err
}

// DeleteConnector deletes an email connector
func (r *EmailRepo) DeleteConnector(ctx context.Context, tenantID, connectorID uuid.UUID) error {
	query := `DELETE FROM email_connectors WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, connectorID)
	return err
}

// CreateMailbox creates a new email mailbox
func (r *EmailRepo) CreateMailbox(ctx context.Context, mailbox *models.EmailMailbox) error {
	query := `
		INSERT INTO email_mailboxes (
			id, tenant_id, address, inbound_connector_id, default_project_id,
			routing_rules, allow_new_ticket, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :address, :inbound_connector_id, :default_project_id,
			:routing_rules, :allow_new_ticket, :created_at, :updated_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, mailbox)
	return err
}

// GetMailbox retrieves a mailbox by address
func (r *EmailRepo) GetMailbox(ctx context.Context, tenantID uuid.UUID, address string) (*models.EmailMailbox, error) {
	var mailbox models.EmailMailbox
	query := `
		SELECT * FROM email_mailboxes 
		WHERE tenant_id = $1 AND address = $2`

	err := r.db.GetContext(ctx, &mailbox, query, tenantID, address)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &mailbox, err
}

// ListMailboxes retrieves all mailboxes for a tenant
func (r *EmailRepo) ListMailboxes(ctx context.Context, tenantID uuid.UUID) ([]*models.EmailMailbox, error) {
	var mailboxes []*models.EmailMailbox
	
	query := `SELECT * FROM email_mailboxes WHERE tenant_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &mailboxes, query, tenantID)
	return mailboxes, err
}

// UpdateMailbox updates a mailbox
func (r *EmailRepo) UpdateMailbox(ctx context.Context, mailbox *models.EmailMailbox) error {
	query := `
		UPDATE email_mailboxes SET
			inbound_connector_id = :inbound_connector_id,
			default_project_id = :default_project_id,
			routing_rules = :routing_rules,
			allow_new_ticket = :allow_new_ticket,
			updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, mailbox)
	return err
}

// CreateTicketRouting creates ticket mail routing
func (r *EmailRepo) CreateTicketRouting(ctx context.Context, routing *models.TicketMailRouting) error {
	query := `
		INSERT INTO ticket_mail_routing (
			id, tenant_id, project_id, ticket_id, public_token,
			reply_address, message_id_root, created_at
		) VALUES (
			:id, :tenant_id, :project_id, :ticket_id, :public_token,
			:reply_address, :message_id_root, :created_at
		)
		ON CONFLICT (tenant_id, ticket_id) 
		DO UPDATE SET 
			public_token = EXCLUDED.public_token,
			reply_address = EXCLUDED.reply_address,
			revoked_at = NULL`

	_, err := r.db.NamedExecContext(ctx, query, routing)
	return err
}

// GetTicketRouting retrieves ticket routing by ticket ID
func (r *EmailRepo) GetTicketRouting(ctx context.Context, tenantID, ticketID uuid.UUID) (*models.TicketMailRouting, error) {
	var routing models.TicketMailRouting
	query := `
		SELECT * FROM ticket_mail_routing 
		WHERE tenant_id = $1 AND ticket_id = $2 AND revoked_at IS NULL`

	err := r.db.GetContext(ctx, &routing, query, tenantID, ticketID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &routing, err
}

// GetTicketRoutingByToken retrieves ticket routing by public token
func (r *EmailRepo) GetTicketRoutingByToken(ctx context.Context, tenantID uuid.UUID, token string) (*models.TicketMailRouting, error) {
	var routing models.TicketMailRouting
	query := `
		SELECT * FROM ticket_mail_routing 
		WHERE tenant_id = $1 AND public_token = $2 AND revoked_at IS NULL`

	err := r.db.GetContext(ctx, &routing, query, tenantID, token)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &routing, err
}

// FindTicketByMessageID finds a ticket by message ID root
func (r *EmailRepo) FindTicketByMessageID(ctx context.Context, tenantID uuid.UUID, messageIDRoot string) (*uuid.UUID, error) {
	var ticketID uuid.UUID
	query := `
		SELECT ticket_id FROM ticket_mail_routing 
		WHERE tenant_id = $1 AND message_id_root = $2 AND revoked_at IS NULL
		LIMIT 1`

	err := r.db.GetContext(ctx, &ticketID, query, tenantID, messageIDRoot)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &ticketID, err
}

// LogInboundEmail logs an inbound email processing attempt
func (r *EmailRepo) LogInboundEmail(ctx context.Context, log *models.EmailInboundLog) error {
	query := `
		INSERT INTO email_inbound_log (
			id, tenant_id, mailbox_address, message_id, thread_ref,
			from_address, to_addresses, cc_addresses, subject,
			received_at, processed_at, status, reason,
			ticket_id, project_id, raw_headers, raw_snippet, created_at
		) VALUES (
			:id, :tenant_id, :mailbox_address, :message_id, :thread_ref,
			:from_address, :to_addresses, :cc_addresses, :subject,
			:received_at, :processed_at, :status, :reason,
			:ticket_id, :project_id, :raw_headers, :raw_snippet, :created_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, log)
	return err
}

// LogOutboundEmail logs an outbound email sending attempt
func (r *EmailRepo) LogOutboundEmail(ctx context.Context, log *models.EmailOutboundLog) error {
	query := `
		INSERT INTO email_outbound_log (
			id, tenant_id, transport_id, message_id, to_addresses,
			subject, sent_at, status, bounce_reason,
			ticket_id, project_id, created_at
		) VALUES (
			:id, :tenant_id, :transport_id, :message_id, :to_addresses,
			:subject, :sent_at, :status, :bounce_reason,
			:ticket_id, :project_id, :created_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, log)
	return err
}

// CreateEmailBounce records an email bounce
func (r *EmailRepo) CreateEmailBounce(ctx context.Context, bounce *models.EmailBounce) error {
	query := `
		INSERT INTO email_bounces (
			id, tenant_id, message_id, recipient, bounce_type,
			bounce_raw, occurred_at, ticket_id, project_id, created_at
		) VALUES (
			:id, :tenant_id, :message_id, :recipient, :bounce_type,
			:bounce_raw, :occurred_at, :ticket_id, :project_id, :created_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, bounce)
	return err
}

// AddEmailSuppression adds an email to the suppression list
func (r *EmailRepo) AddEmailSuppression(ctx context.Context, suppression *models.EmailSuppression) error {
	query := `
		INSERT INTO email_suppressions (tenant_id, address, reason, created_at)
		VALUES (:tenant_id, :address, :reason, :created_at)
		ON CONFLICT (tenant_id, address) DO NOTHING`

	_, err := r.db.NamedExecContext(ctx, query, suppression)
	return err
}

// IsEmailSuppressed checks if an email address is suppressed
func (r *EmailRepo) IsEmailSuppressed(ctx context.Context, tenantID uuid.UUID, address string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM email_suppressions WHERE tenant_id = $1 AND address = $2`
	
	err := r.db.GetContext(ctx, &count, query, tenantID, address)
	return count > 0, err
}
