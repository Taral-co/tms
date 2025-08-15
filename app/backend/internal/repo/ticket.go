package repo

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/bareuptime/tms/internal/db"
	"github.com/google/uuid"
)

type ticketRepository struct {
	db *sql.DB
}

// NewTicketRepository creates a new ticket repository
func NewTicketRepository(database *sql.DB) TicketRepository {
	return &ticketRepository{db: database}
}

// Create creates a new ticket
func (r *ticketRepository) Create(ctx context.Context, ticket *db.Ticket) error {
	query := `
		INSERT INTO tickets (id, tenant_id, project_id, number, subject, status, priority, type, source, customer_id, assignee_agent_id, created_at, updated_at)
		VALUES ($1, $2, $3, (SELECT COALESCE(MAX(number), 0) + 1 FROM tickets WHERE tenant_id = $2 AND project_id = $3), $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
	`

	_, err := r.db.ExecContext(ctx, query,
		ticket.ID, ticket.TenantID, ticket.ProjectID, ticket.Subject,
		ticket.Status, ticket.Priority, ticket.Type, ticket.Source,
		ticket.CustomerID, ticket.AssigneeAgentID)
	if err != nil {
		return fmt.Errorf("failed to create ticket: %w", err)
	}

	return nil
}

// GetByID retrieves a ticket by ID
func (r *ticketRepository) GetByID(ctx context.Context, tenantID, projectID, ticketID uuid.UUID) (*db.Ticket, error) {
	query := `
		SELECT id, tenant_id, project_id, number, subject, status, priority, type, source, customer_id, assignee_agent_id, created_at, updated_at
		FROM tickets
		WHERE tenant_id = $1 AND project_id = $2 AND id = $3
	`

	var ticket db.Ticket
	err := r.db.QueryRowContext(ctx, query, tenantID, projectID, ticketID).Scan(
		&ticket.ID, &ticket.TenantID, &ticket.ProjectID, &ticket.Number,
		&ticket.Subject, &ticket.Status, &ticket.Priority, &ticket.Type,
		&ticket.Source, &ticket.CustomerID, &ticket.AssigneeAgentID,
		&ticket.CreatedAt, &ticket.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ticket not found")
		}
		return nil, fmt.Errorf("failed to get ticket: %w", err)
	}

	return &ticket, nil
}

// GetByNumber retrieves a ticket by number
func (r *ticketRepository) GetByNumber(ctx context.Context, tenantID uuid.UUID, number int) (*db.Ticket, error) {
	query := `
		SELECT id, tenant_id, project_id, number, subject, status, priority, type, source, customer_id, assignee_agent_id, created_at, updated_at
		FROM tickets
		WHERE tenant_id = $1 AND number = $2
	`

	var ticket db.Ticket
	err := r.db.QueryRowContext(ctx, query, tenantID, number).Scan(
		&ticket.ID, &ticket.TenantID, &ticket.ProjectID, &ticket.Number,
		&ticket.Subject, &ticket.Status, &ticket.Priority, &ticket.Type,
		&ticket.Source, &ticket.CustomerID, &ticket.AssigneeAgentID,
		&ticket.CreatedAt, &ticket.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("ticket not found")
		}
		return nil, fmt.Errorf("failed to get ticket: %w", err)
	}

	return &ticket, nil
}

// Update updates an existing ticket
func (r *ticketRepository) Update(ctx context.Context, ticket *db.Ticket) error {
	query := `
		UPDATE tickets
		SET subject = $4, status = $5, priority = $6, type = $7, assignee_agent_id = $8, updated_at = NOW()
		WHERE tenant_id = $1 AND project_id = $2 AND id = $3
	`

	result, err := r.db.ExecContext(ctx, query,
		ticket.TenantID, ticket.ProjectID, ticket.ID, ticket.Subject,
		ticket.Status, ticket.Priority, ticket.Type, ticket.AssigneeAgentID)
	if err != nil {
		return fmt.Errorf("failed to update ticket: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("ticket not found")
	}

	return nil
}

// Delete deletes a ticket
func (r *ticketRepository) Delete(ctx context.Context, tenantID, projectID, ticketID uuid.UUID) error {
	query := `DELETE FROM tickets WHERE tenant_id = $1 AND project_id = $2 AND id = $3`

	result, err := r.db.ExecContext(ctx, query, tenantID, projectID, ticketID)
	if err != nil {
		return fmt.Errorf("failed to delete ticket: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("ticket not found")
	}

	return nil
}

// List retrieves a list of tickets with filtering and pagination
func (r *ticketRepository) List(ctx context.Context, tenantID, projectID uuid.UUID, filters TicketFilters, pagination PaginationParams) ([]*db.Ticket, string, error) {
	query := `
		SELECT id, tenant_id, project_id, number, subject, status, priority, type, source, customer_id, assignee_agent_id, created_at, updated_at
		FROM tickets
		WHERE tenant_id = $1 AND project_id = $2
	`
	args := []interface{}{tenantID, projectID}
	argCount := 2

	// Apply filters
	if len(filters.Status) > 0 {
		argCount++
		placeholders := make([]string, len(filters.Status))
		for i, status := range filters.Status {
			placeholders[i] = fmt.Sprintf("$%d", argCount)
			args = append(args, status)
			argCount++
		}
		argCount-- // Adjust since we added multiple in the loop
		query += fmt.Sprintf(" AND status IN (%s)", strings.Join(placeholders, ","))
	}

	if len(filters.Priority) > 0 {
		argCount++
		placeholders := make([]string, len(filters.Priority))
		for i, priority := range filters.Priority {
			placeholders[i] = fmt.Sprintf("$%d", argCount)
			args = append(args, priority)
			argCount++
		}
		argCount-- // Adjust since we added multiple in the loop
		query += fmt.Sprintf(" AND priority IN (%s)", strings.Join(placeholders, ","))
	}

	if filters.AssigneeID != nil {
		argCount++
		query += fmt.Sprintf(" AND assignee_agent_id = $%d", argCount)
		args = append(args, *filters.AssigneeID)
	}

	if filters.RequesterID != nil {
		argCount++
		query += fmt.Sprintf(" AND customer_id = $%d", argCount)
		args = append(args, *filters.RequesterID)
	}

	if filters.Search != "" {
		argCount++
		query += fmt.Sprintf(" AND subject ILIKE $%d", argCount)
		args = append(args, "%"+filters.Search+"%")
	}

	if len(filters.Source) > 0 {
		argCount++
		placeholders := make([]string, len(filters.Source))
		for i, source := range filters.Source {
			placeholders[i] = fmt.Sprintf("$%d", argCount)
			args = append(args, source)
			argCount++
		}
		argCount-- // Adjust since we added multiple in the loop
		query += fmt.Sprintf(" AND source IN (%s)", strings.Join(placeholders, ","))
	}

	if len(filters.Type) > 0 {
		argCount++
		placeholders := make([]string, len(filters.Type))
		for i, ticketType := range filters.Type {
			placeholders[i] = fmt.Sprintf("$%d", argCount)
			args = append(args, ticketType)
			argCount++
		}
		argCount-- // Adjust since we added multiple in the loop
		query += fmt.Sprintf(" AND type IN (%s)", strings.Join(placeholders, ","))
	}

	// Apply pagination
	if pagination.Cursor != "" {
		argCount++
		query += fmt.Sprintf(" AND id > $%d", argCount)
		cursorID, err := uuid.Parse(pagination.Cursor)
		if err != nil {
			return nil, "", fmt.Errorf("invalid cursor")
		}
		args = append(args, cursorID)
	}

	// Set default limit
	limit := pagination.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	argCount++
	query += fmt.Sprintf(" ORDER BY created_at DESC, id LIMIT $%d", argCount)
	args = append(args, limit+1) // Get one extra to determine if there's a next page

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("failed to list tickets: %w", err)
	}
	defer rows.Close()

	var tickets []*db.Ticket
	for rows.Next() {
		var ticket db.Ticket
		err := rows.Scan(
			&ticket.ID, &ticket.TenantID, &ticket.ProjectID, &ticket.Number,
			&ticket.Subject, &ticket.Status, &ticket.Priority, &ticket.Type,
			&ticket.Source, &ticket.CustomerID, &ticket.AssigneeAgentID,
			&ticket.CreatedAt, &ticket.UpdatedAt)
		if err != nil {
			return nil, "", fmt.Errorf("failed to scan ticket: %w", err)
		}
		tickets = append(tickets, &ticket)
	}

	// Determine next cursor
	var nextCursor string
	if len(tickets) > limit {
		// Remove the extra record and set the cursor
		tickets = tickets[:limit]
		nextCursor = tickets[len(tickets)-1].ID.String()
	}

	return tickets, nextCursor, nil
}
