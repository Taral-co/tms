package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
)

// TicketService handles ticket operations
type TicketService struct {
	ticketRepo   repo.TicketRepository
	customerRepo repo.CustomerRepository
	agentRepo    repo.AgentRepository
	messageRepo  repo.TicketMessageRepository
	rbacService  *rbac.Service
}

// TicketWithDetails represents a ticket with populated customer and agent details
type TicketWithDetails struct {
	*db.Ticket
	Customer      *CustomerInfo `json:"customer,omitempty"`
	AssignedAgent *AgentInfo    `json:"assigned_agent,omitempty"`
}

// CustomerInfo represents basic customer information
type CustomerInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// AgentInfo represents basic agent information
type AgentInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// NewTicketService creates a new ticket service
func NewTicketService(
	ticketRepo repo.TicketRepository,
	customerRepo repo.CustomerRepository,
	agentRepo repo.AgentRepository,
	messageRepo repo.TicketMessageRepository,
	rbacService *rbac.Service,
) *TicketService {
	return &TicketService{
		ticketRepo:   ticketRepo,
		customerRepo: customerRepo,
		agentRepo:    agentRepo,
		messageRepo:  messageRepo,
		rbacService:  rbacService,
	}
}

// CreateTicketRequest represents a ticket creation request
type CreateTicketRequest struct {
	Subject         string  `json:"subject" validate:"required,min=1,max=500"`
	Priority        string  `json:"priority" validate:"oneof=low normal high urgent"`
	Type            string  `json:"type" validate:"oneof=question incident problem task"`
	Source          string  `json:"source" validate:"oneof=web email api phone chat"`
	RequesterEmail  string  `json:"requester_email" validate:"required,email"`
	RequesterName   string  `json:"requester_name" validate:"required,min=1,max=255"`
	InitialMessage  string  `json:"initial_message" validate:"required"`
	AssigneeAgentID *string `json:"assignee_agent_id,omitempty"`
}

// CreateTicket creates a new ticket
func (s *TicketService) CreateTicket(ctx context.Context, tenantID, projectID, agentID uuid.UUID, req CreateTicketRequest) (*db.Ticket, error) {
	// Find or create customer
	customer, err := s.customerRepo.GetByEmail(ctx, tenantID, req.RequesterEmail)
	if err != nil {
		// Create new customer
		customer = &db.Customer{
			ID:       uuid.New(),
			TenantID: tenantID,
			Email:    req.RequesterEmail,
			Name:     req.RequesterName,
		}
		err = s.customerRepo.Create(ctx, customer)
		if err != nil {
			return nil, fmt.Errorf("failed to create customer: %w", err)
		}
	}

	// Create ticket
	ticket := &db.Ticket{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ProjectID:    projectID,
		Subject:      req.Subject,
		Status:       "new",
		Priority:     req.Priority,
		Type:         req.Type,
		Source:       req.Source,
		RequesterID:  customer.ID,
		CustomerName: customer.Name,
	}

	// Set assignee if provided
	if req.AssigneeAgentID != nil {
		assigneeID, err := uuid.Parse(*req.AssigneeAgentID)
		if err != nil {
			return nil, fmt.Errorf("invalid assignee agent ID")
		}
		ticket.AssigneeAgentID = &assigneeID
	}

	err = s.ticketRepo.Create(ctx, ticket)
	if err != nil {
		return nil, fmt.Errorf("failed to create ticket: %w", err)
	}

	// Create initial message
	initialMessage := &db.TicketMessage{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		TicketID:   ticket.ID,
		AuthorType: "customer",
		AuthorID:   &customer.ID,
		Body:       req.InitialMessage,
		IsPrivate:  false,
		CreatedAt:  time.Now(),
	}

	err = s.messageRepo.Create(ctx, initialMessage)
	if err != nil {
		return nil, fmt.Errorf("failed to create initial message: %w", err)
	}

	return ticket, nil
}

// UpdateTicketRequest represents a ticket update request
type UpdateTicketRequest struct {
	Subject         *string `json:"subject,omitempty" validate:"omitempty,min=1,max=500"`
	Status          *string `json:"status,omitempty" validate:"omitempty,oneof=new open pending resolved closed"`
	Priority        *string `json:"priority,omitempty" validate:"omitempty,oneof=low normal high urgent"`
	Type            *string `json:"type,omitempty" validate:"omitempty,oneof=question incident problem task"`
	AssigneeAgentID *string `json:"assignee_agent_id,omitempty"`
}

// UpdateTicket updates an existing ticket
func (s *TicketService) UpdateTicket(ctx context.Context, tenantID, projectID, ticketID, agentID uuid.UUID, req UpdateTicketRequest) (*db.Ticket, error) {
	// Get existing ticket
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	// Update fields if provided
	if req.Subject != nil {
		ticket.Subject = *req.Subject
	}
	if req.Status != nil {
		ticket.Status = *req.Status
	}
	if req.Priority != nil {
		ticket.Priority = *req.Priority
	}
	if req.Type != nil {
		ticket.Type = *req.Type
	}
	if req.AssigneeAgentID != nil {
		if *req.AssigneeAgentID == "" {
			ticket.AssigneeAgentID = nil
		} else {
			assigneeID, err := uuid.Parse(*req.AssigneeAgentID)
			if err != nil {
				return nil, fmt.Errorf("invalid assignee agent ID")
			}
			ticket.AssigneeAgentID = &assigneeID
		}
	}

	err = s.ticketRepo.Update(ctx, ticket)
	if err != nil {
		return nil, fmt.Errorf("failed to update ticket: %w", err)
	}

	return ticket, nil
}

// GetTicket retrieves a ticket by ID
func (s *TicketService) GetTicket(ctx context.Context, tenantID, projectID, ticketID, agentID uuid.UUID) (*db.Ticket, error) {
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	return ticket, nil
}

// ListTicketsRequest represents a ticket list request
type ListTicketsRequest struct {
	Status      []string `json:"status,omitempty"`
	Priority    []string `json:"priority,omitempty"`
	AssigneeID  *string  `json:"assignee_id,omitempty"`
	RequesterID *string  `json:"requester_id,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Search      string   `json:"search,omitempty"`
	Source      []string `json:"source,omitempty"`
	Type        []string `json:"type,omitempty"`
	Cursor      string   `json:"cursor,omitempty"`
	Limit       int      `json:"limit,omitempty"`
}

// ListTickets retrieves a list of tickets
func (s *TicketService) ListTickets(ctx context.Context, tenantID, projectID, agentID uuid.UUID, req ListTicketsRequest) ([]*TicketWithDetails, string, error) {
	// Convert filters
	filters := repo.TicketFilters{
		Status:   req.Status,
		Priority: req.Priority,
		Tags:     req.Tags,
		Search:   req.Search,
		Source:   req.Source,
		Type:     req.Type,
	}

	if req.AssigneeID != nil {
		assigneeUUID, err := uuid.Parse(*req.AssigneeID)
		if err != nil {
			return nil, "", fmt.Errorf("invalid assignee ID")
		}
		filters.AssigneeID = &assigneeUUID
	}

	if req.RequesterID != nil {
		requesterUUID, err := uuid.Parse(*req.RequesterID)
		if err != nil {
			return nil, "", fmt.Errorf("invalid requester ID")
		}
		filters.RequesterID = &requesterUUID
	}

	pagination := repo.PaginationParams{
		Cursor: req.Cursor,
		Limit:  req.Limit,
	}

	tickets, nextCursor, err := s.ticketRepo.List(ctx, tenantID, projectID, filters, pagination)
	if err != nil {
		return nil, "", fmt.Errorf("failed to list tickets: %w", err)
	}

	// Convert to TicketWithDetails by fetching agent information
	ticketsWithDetails := make([]*TicketWithDetails, len(tickets))
	for i, ticket := range tickets {
		ticketDetail := &TicketWithDetails{
			Ticket: ticket,
		}

		// Customer name is already in the ticket record
		if ticket.CustomerName != "" {
			ticketDetail.Customer = &CustomerInfo{
				ID:    ticket.RequesterID.String(),
				Name:  ticket.CustomerName,
				Email: "", // Email not available in tickets table, could be added if needed
			}
		}

		// Fetch agent details if assigned
		if ticket.AssigneeAgentID != nil {
			agent, err := s.agentRepo.GetByID(ctx, tenantID, *ticket.AssigneeAgentID)
			if err == nil && agent != nil {
				ticketDetail.AssignedAgent = &AgentInfo{
					ID:    agent.ID.String(),
					Name:  agent.Name,
					Email: agent.Email,
				}
			}
		}

		ticketsWithDetails[i] = ticketDetail
	}

	return ticketsWithDetails, nextCursor, nil
}

// AddMessageRequest represents a request to add a message to a ticket
type AddMessageRequest struct {
	Body      string `json:"body" validate:"required"`
	IsPrivate bool   `json:"is_private"`
}

// AddMessage adds a message to a ticket
func (s *TicketService) AddMessage(ctx context.Context, tenantID, projectID, ticketID, agentID uuid.UUID, req AddMessageRequest) (*db.TicketMessage, error) {
	// Check permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermTicketWrite)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	// Check private note permission if needed
	if req.IsPrivate {
		hasPrivatePermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, projectID, rbac.PermNotePrivateWrite)
		if err != nil {
			return nil, fmt.Errorf("failed to check private note permission: %w", err)
		}
		if !hasPrivatePermission {
			return nil, fmt.Errorf("insufficient permissions for private notes")
		}
	}

	// Verify ticket exists
	_, err = s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	// Create message
	message := &db.TicketMessage{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		TicketID:   ticketID,
		AuthorType: "agent",
		AuthorID:   &agentID,
		Body:       req.Body,
		IsPrivate:  req.IsPrivate,
		CreatedAt:  time.Now(),
	}

	err = s.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return message, nil
}

// ReassignTicketRequest represents a ticket reassignment request
type ReassignTicketRequest struct {
	AssigneeAgentID *string `json:"assignee_agent_id" validate:"omitempty,uuid"`
	Note            string  `json:"note,omitempty"`
}

// ReassignTicket reassigns a ticket to another agent (only for tenant_admin and project_admin)
func (s *TicketService) ReassignTicket(ctx context.Context, tenantID, projectID, ticketID, requestingAgentID uuid.UUID, req ReassignTicketRequest) (*db.Ticket, error) {
	// Get existing ticket
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	// Store previous assignee for audit trail
	previousAssigneeID := ticket.AssigneeAgentID

	// Update assignee
	if req.AssigneeAgentID != nil && *req.AssigneeAgentID != "" {
		assigneeID, err := uuid.Parse(*req.AssigneeAgentID)
		if err != nil {
			return nil, fmt.Errorf("invalid assignee agent ID: %w", err)
		}

		// Verify the assignee agent exists and has access to this project
		_, agentErr := s.agentRepo.GetByID(ctx, tenantID, assigneeID)
		if agentErr != nil {
			return nil, fmt.Errorf("assignee agent not found: %w", agentErr)
		}

		ticket.AssigneeAgentID = &assigneeID
	} else {
		// Unassign ticket
		ticket.AssigneeAgentID = nil
	}

	err = s.ticketRepo.Update(ctx, ticket)
	if err != nil {
		return nil, fmt.Errorf("failed to update ticket: %w", err)
	}

	// Add a system message about the reassignment
	systemMessage := &db.TicketMessage{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		TicketID:   ticket.ID,
		AuthorType: "system",
		AuthorID:   &requestingAgentID,
		IsPrivate:  true,
		CreatedAt:  time.Now(),
	}

	// Create appropriate message based on reassignment
	if ticket.AssigneeAgentID != nil {
		if previousAssigneeID != nil {
			systemMessage.Body = fmt.Sprintf("Ticket reassigned from agent %s to agent %s", previousAssigneeID.String(), ticket.AssigneeAgentID.String())
		} else {
			systemMessage.Body = fmt.Sprintf("Ticket assigned to agent %s", ticket.AssigneeAgentID.String())
		}
	} else {
		systemMessage.Body = "Ticket unassigned"
	}

	if req.Note != "" {
		systemMessage.Body += fmt.Sprintf("\nNote: %s", req.Note)
	}

	err = s.messageRepo.Create(ctx, systemMessage)
	if err != nil {
		// Log error but don't fail the reassignment
		log.Printf("Failed to create system message for ticket reassignment: %v", err)
	}

	return ticket, nil
}
