package repo

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/bareuptime/tms/internal/models"
)

type ChatMessageRepo struct {
	db *sqlx.DB
}

func NewChatMessageRepo(db *sqlx.DB) *ChatMessageRepo {
	return &ChatMessageRepo{db: db}
}

// CreateChatMessage creates a new chat message
func (r *ChatMessageRepo) CreateChatMessage(ctx context.Context, message *models.ChatMessage) error {
	query := `
		INSERT INTO chat_messages (
			id, tenant_id, project_id, session_id, message_type, content,
			author_type, author_id, author_name, metadata, is_private,
			read_by_visitor, read_by_agent, read_at, created_at
		) VALUES (
			:id, :tenant_id, :project_id, :session_id, :message_type, :content,
			:author_type, :author_id, :author_name, :metadata, :is_private,
			:read_by_visitor, :read_by_agent, :read_at, :created_at
		)
	`
	_, err := r.db.NamedExecContext(ctx, query, message)
	return err
}

// GetChatMessage gets a chat message by ID
func (r *ChatMessageRepo) GetChatMessage(ctx context.Context, tenantID, projectID, messageID uuid.UUID) (*models.ChatMessage, error) {
	query := `
		SELECT id, tenant_id, project_id, session_id, message_type, content,
			   author_type, author_id, author_name, metadata, is_private,
			   read_by_visitor, read_by_agent, read_at, created_at
		FROM chat_messages
		WHERE tenant_id = $1 AND project_id = $2 AND id = $3
	`

	var message models.ChatMessage
	err := r.db.GetContext(ctx, &message, query, tenantID, projectID, messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &message, nil
}

// ListChatMessages lists messages for a chat session
func (r *ChatMessageRepo) ListChatMessages(ctx context.Context, tenantID, projectID, sessionID uuid.UUID, includePrivate bool) ([]*models.ChatMessage, error) {
	query := `
		SELECT id, tenant_id, project_id, session_id, message_type, content,
			   author_type, author_id, author_name, metadata, is_private,
			   read_by_visitor, read_by_agent, read_at, created_at
		FROM chat_messages
		WHERE tenant_id = $1 AND project_id = $2 AND session_id = $3
	`

	args := []interface{}{tenantID, projectID, sessionID}

	if !includePrivate {
		query += " AND is_private = false"
	}

	query += " ORDER BY created_at ASC"

	var messages []*models.ChatMessage
	err := r.db.SelectContext(ctx, &messages, query, args...)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// ListChatMessagesForSession lists messages for a session (public access via token)
func (r *ChatMessageRepo) ListChatMessagesForSession(ctx context.Context, sessionID uuid.UUID) ([]*models.ChatMessage, error) {
	query := `
		SELECT id, tenant_id, project_id, session_id, message_type, content,
			   author_type, author_id, author_name, metadata, is_private,
			   read_by_visitor, read_by_agent, read_at, created_at
		FROM chat_messages
		WHERE session_id = $1 AND is_private = false
		ORDER BY created_at ASC
	`

	var messages []*models.ChatMessage
	err := r.db.SelectContext(ctx, &messages, query, sessionID)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// MarkMessagesAsRead marks messages as read by visitor or agent
func (r *ChatMessageRepo) MarkAgentMessagesAsRead(ctx context.Context, tenantID, projectID, sessionID, messageID uuid.UUID, readerType string) error {
	var query string

	switch readerType {
	case "visitor":
		query = `
			UPDATE chat_messages 
			SET read_by_visitor = true, read_at = NOW() 
			WHERE tenant_id = $1 AND project_id = $2 AND session_id = $3 AND id = $4 AND author_type = 'agent'
		`
	case "agent":
		query = `
			UPDATE chat_messages 
			SET read_by_agent = true, read_at = NOW()
			WHERE tenant_id = $1 AND project_id = $2 AND session_id = $3 AND id = $4 AND author_type = 'visitor'
		`
	default:
		return fmt.Errorf("invalid reader type: %s", readerType)
	}

	_, err := r.db.ExecContext(ctx, query, tenantID, projectID, sessionID, messageID)
	return err
}

func (r *ChatMessageRepo) MarkVisitorMessagesAsRead(ctx context.Context, sessionID, messageID uuid.UUID, readerType string) error {
	var query string

	switch readerType {
	case "visitor":
		query = `
			UPDATE chat_messages 
			SET read_by_visitor = true, read_at = NOW() 
			WHERE session_id = $1 AND id = $2 AND author_type = 'agent'
		`
	case "agent":
		query = `
			UPDATE chat_messages 
			SET read_by_agent = true, read_at = NOW()
			WHERE session_id = $1 AND id = $2 AND author_type = 'visitor'
		`
	default:
		return fmt.Errorf("invalid reader type: %s", readerType)
	}

	_, err := r.db.ExecContext(ctx, query, sessionID, messageID)
	return err
}

// GetUnreadMessageCount gets count of unread messages for a session
func (r *ChatMessageRepo) GetUnreadMessageCount(ctx context.Context, sessionID uuid.UUID, readerType string) (int, error) {
	var query string

	switch readerType {
	case "visitor":
		query = `
			SELECT COUNT(*) 
			FROM chat_messages 
			WHERE session_id = $1 AND author_type = 'agent' AND read_by_visitor = false
		`
	case "agent":
		query = `
			SELECT COUNT(*) 
			FROM chat_messages 
			WHERE session_id = $1 AND author_type = 'visitor' AND read_by_agent = false
		`
	default:
		return 0, fmt.Errorf("invalid reader type: %s", readerType)
	}

	var count int
	err := r.db.GetContext(ctx, &count, query, sessionID)
	return count, err
}

// GetRecentMessages gets recent messages across all active sessions for an agent
func (r *ChatMessageRepo) GetRecentMessages(ctx context.Context, tenantID, agentID uuid.UUID, limit int) ([]*models.ChatMessage, error) {
	query := `
		SELECT cm.id, cm.tenant_id, cm.project_id, cm.session_id, cm.message_type, cm.content,
			   cm.author_type, cm.author_id, cm.author_name, cm.metadata, cm.is_private,
			   cm.read_by_visitor, cm.read_by_agent, cm.read_at, cm.created_at
		FROM chat_messages cm
		JOIN chat_sessions cs ON cm.session_id = cs.id
		WHERE cm.tenant_id = $1 AND cs.assigned_agent_id = $2 AND cs.status = 'active'
		ORDER BY cm.created_at DESC
		LIMIT $3
	`

	var messages []*models.ChatMessage
	err := r.db.SelectContext(ctx, &messages, query, tenantID, agentID, limit)
	if err != nil {
		return nil, err
	}
	return messages, nil
}
