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
	messageRepo  repo.TicketMessageRepository
	ticketRepo   repo.TicketRepository
	rbacService  *rbac.Service
	customerRepo repo.CustomerRepository
	agentRepo    repo.AgentRepository
}

type MessageUserInfo struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}

type MessageWithDetails struct {
	*db.TicketMessage
	MessageUserInfo *MessageUserInfo `json:"user_info,omitempty"`
}

// NewMessageService creates a new message service
func NewMessageService(
	messageRepo repo.TicketMessageRepository,
	ticketRepo repo.TicketRepository,
	customerRepo repo.CustomerRepository,
	agentRepo repo.AgentRepository,
	rbacService *rbac.Service,
) *MessageService {
	return &MessageService{
		messageRepo:  messageRepo,
		ticketRepo:   ticketRepo,
		rbacService:  rbacService,
		customerRepo: customerRepo,
		agentRepo:    agentRepo,
	}
}

// GetTicketMessages retrieves messages for a ticket
func (s *MessageService) GetTicketMessages(ctx context.Context, tenantID, projectID, ticketID, agentID uuid.UUID, includePrivate bool, cursor string, limit int) ([]*MessageWithDetails, string, error) {
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

	// Verify ticket exists
	_, err = s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, "", fmt.Errorf("ticket not found: %w", err)
	}

	pagination := repo.PaginationParams{
		Cursor: cursor,
		Limit:  limit,
	}

	messages, nextCursor, err := s.messageRepo.GetByTicketID(ctx, tenantID, projectID, ticketID, includePrivate, pagination)

	if err != nil {
		return nil, "", fmt.Errorf("failed to get messages: %w", err)
	}

	// Enrich messages with author/customer details
	// Collect unique IDs
	customerIDs := make(map[uuid.UUID]struct{})
	agentIDs := make(map[uuid.UUID]struct{})

	for _, m := range messages {
		if m.AuthorID == nil {
			continue
		}
		switch m.AuthorType {
		case "customer":
			customerIDs[*m.AuthorID] = struct{}{}
		case "agent":
			agentIDs[*m.AuthorID] = struct{}{}
		}
	}

	// Fetch customers
	customerMap := make(map[uuid.UUID]*db.Customer)
	for id := range customerIDs {
		c, err := s.customerRepo.GetByID(ctx, tenantID, id)
		if err == nil && c != nil {
			customerMap[id] = c
		}
	}

	// Fetch agents
	agentMap := make(map[uuid.UUID]*db.Agent)
	for id := range agentIDs {
		a, err := s.agentRepo.GetByID(ctx, tenantID, id)
		if err == nil && a != nil {
			agentMap[id] = a
		}
	}

	// Populate message CustomerName/CustomerEmail fields
	messageWithDetails := make([]*MessageWithDetails, len(messages))
	for i, m := range messages {
		messageWithDetails[i] = &MessageWithDetails{
			TicketMessage: m,
		}
		if m.AuthorID == nil {
			continue
		}
		switch m.AuthorType {
		case "customer":
			if c, ok := customerMap[*m.AuthorID]; ok {
				messageWithDetails[i].MessageUserInfo = &MessageUserInfo{
					Name:  c.Name,
					Email: c.Email,
					ID:    c.ID,
				}
			}
		case "agent":
			if a, ok := agentMap[*m.AuthorID]; ok {
				messageWithDetails[i].MessageUserInfo = &MessageUserInfo{
					Name:  a.Name,
					Email: a.Email,
					ID:    a.ID,
				}
			}
		}
	}

	return messageWithDetails, nextCursor, nil
}

// UpdateMessageRequest represents a message update request
type UpdateMessageRequest struct {
	Body      *string `json:"body,omitempty" validate:"omitempty,min=1"`
	IsPrivate *bool   `json:"is_private,omitempty"`
}

// UpdateMessage updates an existing message
func (s *MessageService) UpdateMessage(ctx context.Context, tenantID, projectID, ticketID, messageID, agentID uuid.UUID, req UpdateMessageRequest) (*db.TicketMessage, error) {
	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketWrite)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	// Get existing message
	message, err := s.messageRepo.GetByID(ctx, tenantID, projectID, ticketID, messageID)
	if err != nil {
		return nil, fmt.Errorf("message not found: %w", err)
	}

	// Check if agent can edit this message (only authors can edit their own messages)
	if message.AuthorType != "agent" || message.AuthorID == nil || *message.AuthorID != agentID {
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
func (s *MessageService) DeleteMessage(ctx context.Context, tenantID, projectID, ticketID, messageID, agentID uuid.UUID) error {
	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketWrite)
	if err != nil {
		return fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return fmt.Errorf("insufficient permissions")
	}

	// Get existing message
	message, err := s.messageRepo.GetByID(ctx, tenantID, projectID, ticketID, messageID)
	if err != nil {
		return fmt.Errorf("message not found: %w", err)
	}

	// Check if agent can delete this message (only authors can delete their own messages, or admins)
	if message.AuthorType == "agent" && message.AuthorID != nil && *message.AuthorID == agentID {
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

	err = s.messageRepo.Delete(ctx, tenantID, projectID, ticketID, messageID)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	return nil
}

// GetMessage retrieves a specific message
func (s *MessageService) GetMessage(ctx context.Context, tenantID, projectID, ticketID, messageID, agentID uuid.UUID) (*db.TicketMessage, error) {
	// Parse string IDs to UUIDs

	// Check base permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketRead)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	message, err := s.messageRepo.GetByID(ctx, tenantID, projectID, ticketID, messageID)
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
