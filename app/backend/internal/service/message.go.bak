package service

import (
	"context"
	"fmt"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
)

// MessageService handles ticket message operations
type MessageService struct {
	messageRepo repo.TicketMessageRepository
	ticketRepo  repo.TicketRepository
	rbacService *rbac.Service
}

// NewMessageService creates a new message service
func NewMessageService(
	messageRepo repo.TicketMessageRepository,
	ticketRepo repo.TicketRepository,
	rbacService *rbac.Service,
) *MessageService {
	return &MessageService{
		messageRepo: messageRepo,
		ticketRepo:  ticketRepo,
		rbacService: rbacService,
	}
}

// GetTicketMessages retrieves messages for a ticket
func (s *MessageService) GetTicketMessages(ctx context.Context, tenantID, projectID, ticketID, agentID string, includePrivate bool, cursor string, limit int) ([]*db.TicketMessage, string, error) {
	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketRead)
	if err != nil {
		return nil, "", fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, "", fmt.Errorf("insufficient permissions")
	}

	// Check private note permission if needed
	if includePrivate {
		hasPrivatePermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermNotePrivateRead)
		if err != nil {
			return nil, "", fmt.Errorf("failed to check private note permission: %w", err)
		}
		if !hasPrivatePermission {
			includePrivate = false // Fall back to public messages only
		}
	}

	tenantUUID, _ := uuid.Parse(tenantID)
	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)

	// Verify ticket exists
	_, err = s.ticketRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID)
	if err != nil {
		return nil, "", fmt.Errorf("ticket not found: %w", err)
	}

	pagination := repo.PaginationParams{
		Cursor: cursor,
		Limit:  limit,
	}

	messages, nextCursor, err := s.messageRepo.GetByTicketID(ctx, tenantUUID, projectUUID, ticketUUID, includePrivate, pagination)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nextCursor, nil
}

// UpdateMessageRequest represents a message update request
type UpdateMessageRequest struct {
	Body      *string `json:"body,omitempty" validate:"omitempty,min=1"`
	IsPrivate *bool   `json:"is_private,omitempty"`
}

// UpdateMessage updates an existing message
func (s *MessageService) UpdateMessage(ctx context.Context, tenantID, projectID, ticketID, messageID, agentID string, req UpdateMessageRequest) (*db.TicketMessage, error) {
	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketWrite)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)
	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)
	messageUUID, err := uuid.Parse(messageID)
	if err != nil {
		return nil, fmt.Errorf("invalid message ID")
	}

	// Get existing message
	message, err := s.messageRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID, messageUUID)
	if err != nil {
		return nil, fmt.Errorf("message not found: %w", err)
	}

	// Check if agent can edit this message (only authors can edit their own messages)
	agentUUID, _ := uuid.Parse(agentID)
	if message.AuthorType != "agent" || message.AuthorID == nil || *message.AuthorID != agentUUID {
		return nil, fmt.Errorf("you can only edit your own messages")
	}

	// Check private note permission if changing privacy
	if req.IsPrivate != nil && *req.IsPrivate != message.IsPrivate {
		hasPrivatePermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermNotePrivateWrite)
		if err != nil {
			return nil, fmt.Errorf("failed to check private note permission: %w", err)
		}
		if !hasPrivatePermission {
			return nil, fmt.Errorf("insufficient permissions for private notes")
		}
	}

	// Update fields if provided
	if req.Body != nil {
		message.Body = *req.Body
	}
	if req.IsPrivate != nil {
		message.IsPrivate = *req.IsPrivate
	}

	err = s.messageRepo.Update(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to update message: %w", err)
	}

	return message, nil
}

// DeleteMessage deletes a message
func (s *MessageService) DeleteMessage(ctx context.Context, tenantID, projectID, ticketID, messageID, agentID string) error {
	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketWrite)
	if err != nil {
		return fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)
	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)
	messageUUID, err := uuid.Parse(messageID)
	if err != nil {
		return fmt.Errorf("invalid message ID")
	}

	// Get existing message
	message, err := s.messageRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID, messageUUID)
	if err != nil {
		return fmt.Errorf("message not found: %w", err)
	}

	// Check if agent can delete this message (only authors can delete their own messages, or admins)
	agentUUID, _ := uuid.Parse(agentID)
	if message.AuthorType == "agent" && message.AuthorID != nil && *message.AuthorID == agentUUID {
		// Agent can delete their own message
	} else {
		// Check if agent has admin permissions
		hasAdminPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketAdmin)
		if err != nil {
			return fmt.Errorf("failed to check admin permission: %w", err)
		}
		if !hasAdminPermission {
			return fmt.Errorf("you can only delete your own messages")
		}
	}

	err = s.messageRepo.Delete(ctx, tenantUUID, projectUUID, ticketUUID, messageUUID)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	return nil
}

// GetMessage retrieves a specific message
func (s *MessageService) GetMessage(ctx context.Context, tenantID, projectID, ticketID, messageID, agentID string) (*db.TicketMessage, error) {
	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketRead)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)
	projectUUID, _ := uuid.Parse(projectID)
	ticketUUID, _ := uuid.Parse(ticketID)
	messageUUID, err := uuid.Parse(messageID)
	if err != nil {
		return nil, fmt.Errorf("invalid message ID")
	}

	message, err := s.messageRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID, messageUUID)
	if err != nil {
		return nil, fmt.Errorf("message not found: %w", err)
	}

	// Check if message is private and agent has permission
	if message.IsPrivate {
		hasPrivatePermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermNotePrivateRead)
		if err != nil {
			return nil, fmt.Errorf("failed to check private note permission: %w", err)
		}
		if !hasPrivatePermission {
			return nil, fmt.Errorf("insufficient permissions for private notes")
		}
	}

	return message, nil
}
