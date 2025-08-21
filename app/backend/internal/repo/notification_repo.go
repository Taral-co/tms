package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/bareuptime/tms/internal/models"
)

type NotificationRepo struct {
	db *sqlx.DB
}

func NewNotificationRepo(db *sqlx.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

// CreateNotification creates a new notification
func (r *NotificationRepo) CreateNotification(ctx context.Context, notification *models.Notification) error {
	metadataJSON, err := json.Marshal(notification.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	// Convert channels slice to PostgreSQL array format
	var channelsArray interface{}
	if len(notification.Channels) > 0 {
		channelStrings := make([]string, len(notification.Channels))
		for i, channel := range notification.Channels {
			channelStrings[i] = string(channel)
		}
		channelsArray = channelStrings
	} else {
		channelsArray = []string{"web"} // Default to web channel
	}

	query := `
		INSERT INTO notifications (
			tenant_id, project_id, agent_id, type, title, message,
			priority, channels, action_url, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
		) RETURNING id, created_at, updated_at`

	err = r.db.GetContext(ctx, notification, query,
		notification.TenantID,
		notification.ProjectID,
		notification.AgentID,
		notification.Type,
		notification.Title,
		notification.Message,
		notification.Priority,
		channelsArray,
		notification.ActionURL,
		metadataJSON,
	)
	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	return nil
}

// GetNotifications retrieves notifications for an agent with pagination
func (r *NotificationRepo) GetNotifications(ctx context.Context, tenantID, agentID uuid.UUID, limit int, offset int) ([]models.Notification, error) {
	query := `
		SELECT id, tenant_id, project_id, agent_id, type, title, message,
		       priority, channels, action_url, metadata, is_read, read_at, 
		       expires_at, created_at, updated_at
		FROM notifications
		WHERE tenant_id = $1 AND agent_id = $2
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	var notifications []models.Notification
	err := r.db.SelectContext(ctx, &notifications, query, tenantID, agentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, nil
}

// GetUnreadNotifications retrieves unread notifications for an agent
func (r *NotificationRepo) GetUnreadNotifications(ctx context.Context, tenantID, agentID uuid.UUID) ([]models.Notification, error) {
	query := `
		SELECT id, tenant_id, project_id, agent_id, type, title, message,
		       priority, channels, action_url, metadata, is_read, read_at,
		       expires_at, created_at, updated_at
		FROM notifications
		WHERE tenant_id = $1 AND agent_id = $2 AND is_read = false
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
		ORDER BY created_at DESC`

	var notifications []models.Notification
	err := r.db.SelectContext(ctx, &notifications, query, tenantID, agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get unread notifications: %w", err)
	}

	return notifications, nil
}

// GetNotificationCount returns the count of total and unread notifications
func (r *NotificationRepo) GetNotificationCount(ctx context.Context, tenantID, agentID uuid.UUID) (*models.NotificationCount, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN is_read = false THEN 1 END) as unread
		FROM notifications
		WHERE tenant_id = $1 AND agent_id = $2
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`

	var count models.NotificationCount
	err := r.db.GetContext(ctx, &count, query, tenantID, agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification count: %w", err)
	}

	return &count, nil
}

// MarkNotificationAsRead marks a notification as read
func (r *NotificationRepo) MarkNotificationAsRead(ctx context.Context, tenantID, agentID, notificationID uuid.UUID) error {
	query := `
		UPDATE notifications 
		SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND tenant_id = $2 AND agent_id = $3`

	result, err := r.db.ExecContext(ctx, query, notificationID, tenantID, agentID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// MarkAllNotificationsAsRead marks all notifications as read for an agent
func (r *NotificationRepo) MarkAllNotificationsAsRead(ctx context.Context, tenantID, agentID uuid.UUID) error {
	query := `
		UPDATE notifications 
		SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE tenant_id = $1 AND agent_id = $2 AND is_read = false`

	_, err := r.db.ExecContext(ctx, query, tenantID, agentID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return nil
}

// DeleteNotification deletes a notification
func (r *NotificationRepo) DeleteNotification(ctx context.Context, tenantID, agentID, notificationID uuid.UUID) error {
	query := `
		DELETE FROM notifications 
		WHERE id = $1 AND tenant_id = $2 AND agent_id = $3`

	result, err := r.db.ExecContext(ctx, query, notificationID, tenantID, agentID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// CleanupOldNotifications removes old read notifications (called by cleanup job)
func (r *NotificationRepo) CleanupOldNotifications(ctx context.Context) error {
	query := `
		DELETE FROM notifications 
		WHERE (created_at < NOW() - INTERVAL '1 day' AND is_read = true)
		   OR (created_at < NOW() - INTERVAL '7 days')`

	result, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to cleanup old notifications: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil {
		fmt.Printf("Cleaned up %d old notifications\n", rowsAffected)
	}

	return nil
}
