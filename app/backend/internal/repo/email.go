package repo

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/bareuptime/tms/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
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
func (r *EmailRepo) CreateConnector(ctx context.Context, connector *models.EmailConnector) (int, error) {
	query := `
		INSERT INTO email_connectors (
			id, tenant_id, project_id, type, name, is_active, is_validated, validation_status,
			imap_host, imap_port, imap_use_tls, imap_username, imap_password_enc, imap_folder, imap_seen_strategy,
			smtp_host, smtp_port, smtp_use_tls, smtp_username, smtp_password_enc,
			oauth_provider, oauth_account_email, oauth_token_ref,
			dkim_selector, dkim_public_key, dkim_private_key_enc, return_path_domain,
			provider_webhook_secret, last_health, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :project_id, :type, :name, :is_active, :is_validated, :validation_status,
			:imap_host, :imap_port, :imap_use_tls, :imap_username, :imap_password_enc, :imap_folder, :imap_seen_strategy,
			:smtp_host, :smtp_port, :smtp_use_tls, :smtp_username, :smtp_password_enc,
			:oauth_provider, :oauth_account_email, :oauth_token_ref,
			:dkim_selector, :dkim_public_key, :dkim_private_key_enc, :return_path_domain,
			:provider_webhook_secret, :last_health, :created_at, :updated_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, connector)

	// Check for unique constraint violation
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			// Check if it's a unique constraint violation
			if pqErr.Code == "23505" {
				// Check which constraint was violated
				if strings.Contains(pqErr.Detail, "tenant_id") && strings.Contains(pqErr.Detail, "project_id") {
					return http.StatusConflict, errors.New("email connector with these details already exists")
				}
				return http.StatusConflict, errors.New("email connector with these details already exists")
			}
		}
	}

	return http.StatusInternalServerError, err
}

// GetConnector retrieves an email connector by ID
func (r *EmailRepo) GetConnector(ctx context.Context, tenantID, projectID, connectorID uuid.UUID) (*models.EmailConnector, error) {
	var connector models.EmailConnector
	query := `
		SELECT * FROM email_connectors 
		WHERE tenant_id = $1 AND project_id = $2 AND id = $3`

	err := r.db.GetContext(ctx, &connector, query, tenantID, projectID, connectorID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &connector, err
}

// ListConnectors retrieves all email connectors for a tenant and project
func (r *EmailRepo) ListConnectors(ctx context.Context, tenantID, projectID uuid.UUID, connectorType *models.EmailConnectorType) ([]*models.EmailConnector, error) {
	var connectors []*models.EmailConnector

	query := `SELECT * FROM email_connectors WHERE tenant_id = $1 AND project_id = $2`
	args := []interface{}{tenantID, projectID}

	if connectorType != nil {
		query += ` AND type = $3`
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
			name = :name, is_active = :is_active, is_validated = :is_validated,
			validation_status = :validation_status, validation_error = :validation_error,
			last_validation_at = :last_validation_at,
			imap_host = :imap_host, imap_port = :imap_port, imap_use_tls = :imap_use_tls, 
			imap_username = :imap_username, imap_password_enc = :imap_password_enc, 
			imap_folder = :imap_folder, imap_seen_strategy = :imap_seen_strategy,
			smtp_host = :smtp_host, smtp_port = :smtp_port, smtp_use_tls = :smtp_use_tls,
			smtp_username = :smtp_username, smtp_password_enc = :smtp_password_enc,
			oauth_provider = :oauth_provider, oauth_account_email = :oauth_account_email, oauth_token_ref = :oauth_token_ref,
			dkim_selector = :dkim_selector, dkim_public_key = :dkim_public_key, dkim_private_key_enc = :dkim_private_key_enc,
			return_path_domain = :return_path_domain, provider_webhook_secret = :provider_webhook_secret,
			last_health = :last_health, updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, connector)

	// Check for unique constraint violation
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			// Check if it's a unique constraint violation
			if pqErr.Code == "23505" {
				// Check which constraint was violated
				if strings.Contains(pqErr.Detail, "tenant_id") && strings.Contains(pqErr.Detail, "project_id") {
					return errors.New("email connector with these details already exists")
				}
				return errors.New("email connector with these details already exists")
			}
		}
	}

	return err
}

// DeleteConnector deletes an email connector
func (r *EmailRepo) DeleteConnector(ctx context.Context, tenantID, projectID, connectorID uuid.UUID) error {
	query := `DELETE FROM email_connectors WHERE tenant_id = $1 AND project_id = $2 AND id = $3`
	_, err := r.db.ExecContext(ctx, query, tenantID, projectID, connectorID)
	return err
}

// CreateMailbox creates a new email mailbox
func (r *EmailRepo) CreateMailbox(ctx context.Context, mailbox *models.EmailMailbox) error {
	query := `
		INSERT INTO email_mailboxes (
			id, tenant_id, project_id, address, inbound_connector_id,
			routing_rules, allow_new_ticket, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :project_id, :address, :inbound_connector_id,
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
func (r *EmailRepo) ListMailboxes(ctx context.Context, tenantID, projectID uuid.UUID) ([]*models.EmailMailbox, error) {
	var mailboxes []*models.EmailMailbox

	query := `SELECT * FROM email_mailboxes WHERE tenant_id = $1 AND project_id = $2 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &mailboxes, query, tenantID, projectID)
	return mailboxes, err
}

// UpdateMailbox updates a mailbox
func (r *EmailRepo) UpdateMailbox(ctx context.Context, mailbox *models.EmailMailbox) error {
	query := `
		UPDATE email_mailboxes SET
			inbound_connector_id = :inbound_connector_id,
			routing_rules = :routing_rules,
			allow_new_ticket = :allow_new_ticket,
			updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, mailbox)
	return err
}

// GetMailboxByID retrieves a mailbox by ID
func (r *EmailRepo) GetMailboxByID(ctx context.Context, tenantID, mailboxID uuid.UUID) (*models.EmailMailbox, error) {
	var mailbox models.EmailMailbox
	query := `
		SELECT * FROM email_mailboxes 
		WHERE tenant_id = $1 AND id = $2`

	err := r.db.GetContext(ctx, &mailbox, query, tenantID, mailboxID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &mailbox, err
}

// DeleteMailbox deletes a mailbox
func (r *EmailRepo) DeleteMailbox(ctx context.Context, tenantID, mailboxID uuid.UUID) error {
	query := `DELETE FROM email_mailboxes WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, mailboxID)
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

// ListMailboxesByProject lists all email mailboxes for a tenant and project
func (r *EmailRepo) ListMailboxesByProject(ctx context.Context, tenantID, projectID uuid.UUID) ([]*models.EmailMailbox, error) {
	var mailboxes []*models.EmailMailbox
	query := `
		SELECT id, tenant_id, project_id, address, inbound_connector_id,
			   routing_rules, allow_new_ticket, created_at, updated_at
		FROM email_mailboxes 
		WHERE tenant_id = $1 AND (project_id = $2 OR project_id IS NULL)
		ORDER BY created_at DESC`

	err := r.db.SelectContext(ctx, &mailboxes, query, tenantID, projectID)
	return mailboxes, err
}

// ListConnectorsByProject lists all email connectors for a tenant and project
func (r *EmailRepo) ListConnectorsByProject(ctx context.Context, tenantID, projectID uuid.UUID, connectorType *models.EmailConnectorType) ([]*models.EmailConnector, error) {
	var connectors []*models.EmailConnector

	query := `
		SELECT id, tenant_id, project_id, type, name, is_active, is_validated, validation_status,
			   validation_error, last_validation_at,
			   imap_host, imap_port, imap_use_tls, imap_username, imap_folder, imap_seen_strategy,
			   smtp_host, smtp_port, smtp_use_tls, smtp_username,
			   oauth_provider, oauth_account_email, oauth_token_ref,
			   from_name, from_address, reply_to_address,
			   dkim_selector, dkim_public_key, return_path_domain,
			   provider_webhook_secret, last_health, created_at, updated_at
		FROM email_connectors 
		WHERE tenant_id = $1 AND project_id = $2`

	args := []interface{}{tenantID, projectID}

	if connectorType != nil {
		query += ` AND type = $3`
		args = append(args, *connectorType)
	}

	query += ` ORDER BY created_at DESC`

	err := r.db.SelectContext(ctx, &connectors, query, args...)
	return connectors, err
}
