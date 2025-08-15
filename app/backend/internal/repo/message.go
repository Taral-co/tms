package repo

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/bareuptime/tms/internal/db"
	"github.com/google/uuid"
)

// ticketMessageRepository implements TicketMessageRepository interface
type ticketMessageRepository struct {
	db *sql.DB
}

// NewTicketMessageRepository creates a new ticket message repository
func NewTicketMessageRepository(database *sql.DB) TicketMessageRepository {
	return &ticketMessageRepository{
		db: database,
	}
}

// Create creates a new ticket message
func (r *ticketMessageRepository) Create(ctx context.Context, message *db.TicketMessage) error {
	query := `
		INSERT INTO ticket_messages (id, tenant_id, project_id, ticket_id, author_type, author_id, body, is_private, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.db.ExecContext(ctx, query,
		message.ID,
		message.TenantID,
		message.ProjectID,
		message.TicketID,
		message.AuthorType,
		message.AuthorID,
		message.Body,
		message.IsPrivate,
		message.CreatedAt,
	)

	return err
}

// GetByID retrieves a message by ID
func (r *ticketMessageRepository) GetByID(ctx context.Context, tenantID, projectID, ticketID, messageID uuid.UUID) (*db.TicketMessage, error) {
	query := `
		SELECT id, tenant_id, project_id, ticket_id, author_type, author_id, body, is_private, created_at
		FROM ticket_messages
		WHERE tenant_id = $1 AND project_id = $2 AND ticket_id = $3 AND id = $4
	`

	message := &db.TicketMessage{}

	err := r.db.QueryRowContext(ctx, query, tenantID, projectID, ticketID, messageID).Scan(
		&message.ID,
		&message.TenantID,
		&message.ProjectID,
		&message.TicketID,
		&message.AuthorType,
		&message.AuthorID,
		&message.Body,
		&message.IsPrivate,
		&message.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return message, nil
}

// GetByTicketID retrieves messages for a ticket with pagination
func (r *ticketMessageRepository) GetByTicketID(ctx context.Context, tenantID, projectID, ticketID uuid.UUID, includePrivate bool, pagination PaginationParams) ([]*db.TicketMessage, string, error) {
	baseQuery := `
		SELECT id, tenant_id, project_id, ticket_id, author_type, author_id, body, is_private, created_at
		FROM ticket_messages
		WHERE tenant_id = $1 AND project_id = $2 AND ticket_id = $3
	`

	args := []interface{}{tenantID, projectID, ticketID}
	argIndex := 4

	// Filter private messages if not included
	if !includePrivate {
		baseQuery += " AND is_private = false"
	}

	// Add cursor-based pagination
	if pagination.Cursor != "" {
		baseQuery += fmt.Sprintf(" AND id > $%d", argIndex)
		cursorID, err := uuid.Parse(pagination.Cursor)
		if err != nil {
			return nil, "", fmt.Errorf("invalid cursor: %w", err)
		}
		args = append(args, cursorID)
		argIndex++
	}

	// Add ordering and limit
	baseQuery += " ORDER BY created_at ASC"

	limit := pagination.Limit
	if limit <= 0 || limit > 100 {
		limit = 50 // Default limit
	}

	baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
	args = append(args, limit+1) // Fetch one extra to determine if there's a next page

	rows, err := r.db.QueryContext(ctx, baseQuery, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var messages []*db.TicketMessage
	for rows.Next() {
		message := &db.TicketMessage{}

		err := rows.Scan(
			&message.ID,
			&message.TenantID,
			&message.ProjectID,
			&message.TicketID,
			&message.AuthorType,
			&message.AuthorID,
			&message.Body,
			&message.IsPrivate,
			&message.CreatedAt,
		)
		if err != nil {
			return nil, "", err
		}

		messages = append(messages, message)
	}

	// Determine next cursor
	var nextCursor string
	if len(messages) > limit {
		nextCursor = messages[limit-1].ID.String()
		messages = messages[:limit] // Remove the extra record
	}

	return messages, nextCursor, nil
}

// Update updates an existing message
func (r *ticketMessageRepository) Update(ctx context.Context, message *db.TicketMessage) error {
	query := `
		UPDATE ticket_messages
		SET body = $5, is_private = $6
		WHERE tenant_id = $1 AND project_id = $2 AND ticket_id = $3 AND id = $4
	`

	_, err := r.db.ExecContext(ctx, query,
		message.TenantID,
		message.ProjectID,
		message.TicketID,
		message.ID,
		message.Body,
		message.IsPrivate,
	)

	return err
}

// Delete deletes a message
func (r *ticketMessageRepository) Delete(ctx context.Context, tenantID, projectID, ticketID, messageID uuid.UUID) error {
	query := `DELETE FROM ticket_messages WHERE tenant_id = $1 AND project_id = $2 AND ticket_id = $3 AND id = $4`
	_, err := r.db.ExecContext(ctx, query, tenantID, projectID, ticketID, messageID)
	return err
}
