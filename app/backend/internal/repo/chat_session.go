package repo

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/bareuptime/tms/internal/models"
)

type ChatSessionRepo struct {
	db *sqlx.DB
}

func NewChatSessionRepo(db *sqlx.DB) *ChatSessionRepo {
	return &ChatSessionRepo{db: db}
}

// CreateChatSession creates a new chat session
func (r *ChatSessionRepo) CreateChatSession(ctx context.Context, session *models.ChatSession) error {
	query := `
		INSERT INTO chat_sessions (
			id, tenant_id, project_id, widget_id, session_token, customer_id, ticket_id,
			status, visitor_info, assigned_agent_id, assigned_at, started_at, ended_at,
			last_activity_at, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :project_id, :widget_id, :session_token, :customer_id, :ticket_id,
			:status, :visitor_info, :assigned_agent_id, :assigned_at, :started_at, :ended_at,
			:last_activity_at, :created_at, :updated_at
		)
	`
	_, err := r.db.NamedExecContext(ctx, query, session)
	return err
}

// GetChatSession gets a chat session by ID
func (r *ChatSessionRepo) GetChatSession(ctx context.Context, tenantID, projectID, sessionID uuid.UUID) (*models.ChatSession, error) {
	query := `
		SELECT cs.id, cs.tenant_id, cs.project_id, cs.widget_id, cs.session_token, cs.customer_id, cs.ticket_id,
			   cs.status, cs.visitor_info, cs.assigned_agent_id, cs.assigned_at, cs.started_at, cs.ended_at,
			   cs.last_activity_at, cs.created_at, cs.updated_at,
			   a.name as assigned_agent_name, c.name as customer_name, c.email as customer_email,
			   cw.name as widget_name
		FROM chat_sessions cs
		LEFT JOIN agents a ON cs.assigned_agent_id = a.id
		LEFT JOIN customers c ON cs.customer_id = c.id
		LEFT JOIN chat_widgets cw ON cs.widget_id = cw.id
		WHERE cs.tenant_id = $1 AND cs.project_id = $2 AND cs.id = $3
	`
	
	var session models.ChatSession
	err := r.db.GetContext(ctx, &session, query, tenantID, projectID, sessionID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

// GetChatSessionByToken gets a chat session by session token (for public access)
func (r *ChatSessionRepo) GetChatSessionByToken(ctx context.Context, sessionToken string) (*models.ChatSession, error) {
	query := `
		SELECT cs.id, cs.tenant_id, cs.project_id, cs.widget_id, cs.session_token, cs.customer_id, cs.ticket_id,
			   cs.status, cs.visitor_info, cs.assigned_agent_id, cs.assigned_at, cs.started_at, cs.ended_at,
			   cs.last_activity_at, cs.created_at, cs.updated_at,
			   a.name as assigned_agent_name, c.name as customer_name, c.email as customer_email,
			   cw.name as widget_name
		FROM chat_sessions cs
		LEFT JOIN agents a ON cs.assigned_agent_id = a.id
		LEFT JOIN customers c ON cs.customer_id = c.id
		LEFT JOIN chat_widgets cw ON cs.widget_id = cw.id
		WHERE cs.session_token = $1
	`
	
	var session models.ChatSession
	err := r.db.GetContext(ctx, &session, query, sessionToken)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

// ListChatSessions lists chat sessions with filters
func (r *ChatSessionRepo) ListChatSessions(ctx context.Context, tenantID, projectID uuid.UUID, filters ChatSessionFilters) ([]*models.ChatSession, error) {
	baseQuery := `
		SELECT cs.id, cs.tenant_id, cs.project_id, cs.widget_id, cs.session_token, cs.customer_id, cs.ticket_id,
			   cs.status, cs.visitor_info, cs.assigned_agent_id, cs.assigned_at, cs.started_at, cs.ended_at,
			   cs.last_activity_at, cs.created_at, cs.updated_at,
			   a.name as assigned_agent_name, c.name as customer_name, c.email as customer_email,
			   cw.name as widget_name
		FROM chat_sessions cs
		LEFT JOIN agents a ON cs.assigned_agent_id = a.id
		LEFT JOIN customers c ON cs.customer_id = c.id
		LEFT JOIN chat_widgets cw ON cs.widget_id = cw.id
		WHERE cs.tenant_id = $1 AND cs.project_id = $2
	`

	args := []interface{}{tenantID, projectID}
	argIndex := 3

	if filters.Status != "" {
		baseQuery += " AND cs.status = $" + fmt.Sprintf("%d", argIndex)
		args = append(args, filters.Status)
		argIndex++
	}

	if filters.AssignedAgentID != nil {
		baseQuery += " AND cs.assigned_agent_id = $" + fmt.Sprintf("%d", argIndex)
		args = append(args, *filters.AssignedAgentID)
		argIndex++
	}

	if filters.WidgetID != nil {
		baseQuery += " AND cs.widget_id = $" + fmt.Sprintf("%d", argIndex)
		args = append(args, *filters.WidgetID)
		argIndex++
	}

	baseQuery += " ORDER BY cs.last_activity_at DESC"

	if filters.Limit > 0 {
		baseQuery += " LIMIT $" + fmt.Sprintf("%d", argIndex)
		args = append(args, filters.Limit)
	}

	var sessions []*models.ChatSession
	err := r.db.SelectContext(ctx, &sessions, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

// UpdateChatSession updates a chat session
func (r *ChatSessionRepo) UpdateChatSession(ctx context.Context, session *models.ChatSession) error {
	session.UpdatedAt = time.Now()
	
	query := `
		UPDATE chat_sessions SET
			customer_id = :customer_id,
			ticket_id = :ticket_id,
			status = :status,
			visitor_info = :visitor_info,
			assigned_agent_id = :assigned_agent_id,
			assigned_at = :assigned_at,
			ended_at = :ended_at,
			last_activity_at = :last_activity_at,
			updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND project_id = :project_id AND id = :id
	`
	_, err := r.db.NamedExecContext(ctx, query, session)
	return err
}

// UpdateLastActivity updates the last activity timestamp for a session
func (r *ChatSessionRepo) UpdateLastActivity(ctx context.Context, sessionID uuid.UUID) error {
	query := `UPDATE chat_sessions SET last_activity_at = NOW() WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, sessionID)
	return err
}

// GetActiveSessions gets active sessions for an agent
func (r *ChatSessionRepo) GetActiveSessions(ctx context.Context, tenantID uuid.UUID, agentID uuid.UUID) ([]*models.ChatSession, error) {
	query := `
		SELECT cs.id, cs.tenant_id, cs.project_id, cs.widget_id, cs.session_token, cs.customer_id, cs.ticket_id,
			   cs.status, cs.visitor_info, cs.assigned_agent_id, cs.assigned_at, cs.started_at, cs.ended_at,
			   cs.last_activity_at, cs.created_at, cs.updated_at,
			   a.name as assigned_agent_name, c.name as customer_name, c.email as customer_email,
			   cw.name as widget_name
		FROM chat_sessions cs
		LEFT JOIN agents a ON cs.assigned_agent_id = a.id
		LEFT JOIN customers c ON cs.customer_id = c.id
		LEFT JOIN chat_widgets cw ON cs.widget_id = cw.id
		WHERE cs.tenant_id = $1 AND cs.assigned_agent_id = $2 AND cs.status = 'active'
		ORDER BY cs.last_activity_at DESC
	`
	
	var sessions []*models.ChatSession
	err := r.db.SelectContext(ctx, &sessions, query, tenantID, agentID)
	if err != nil {
		return nil, err
	}
	return sessions, nil
}

// ChatSessionFilters for filtering chat sessions
type ChatSessionFilters struct {
	Status          string
	AssignedAgentID *uuid.UUID
	WidgetID        *uuid.UUID
	Limit           int
}
