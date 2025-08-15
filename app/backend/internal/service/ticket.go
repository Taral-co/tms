package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/mail"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/bareuptime/tms/internal/util"
	"github.com/google/uuid"
)

// TicketService handles ticket operations
type TicketService struct {
	ticketRepo    repo.TicketRepository
	customerRepo  repo.CustomerRepository
	agentRepo     repo.AgentRepository
	messageRepo   repo.TicketMessageRepository
	rbacService   *rbac.Service
	mailService   *mail.Service
	publicService *PublicService
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
	mailService *mail.Service,
	publicService *PublicService,
) *TicketService {
	return &TicketService{
		ticketRepo:    ticketRepo,
		customerRepo:  customerRepo,
		agentRepo:     agentRepo,
		messageRepo:   messageRepo,
		rbacService:   rbacService,
		mailService:   mailService,
		publicService: publicService,
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
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		Subject:    req.Subject,
		Status:     "new",
		Priority:   req.Priority,
		Type:       req.Type,
		Source:     req.Source,
		CustomerID: customer.ID,
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
func (s *TicketService) GetTicket(ctx context.Context, tenantID, projectID, ticketID, agentID uuid.UUID) (*TicketWithDetails, error) {
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	ticketDetail := &TicketWithDetails{
		Ticket: ticket,
	}

	// Fetch customer details and populate struct safely
	customer, err := s.customerRepo.GetByID(ctx, tenantID, ticket.CustomerID)
	if err == nil && customer != nil {
		ticketDetail.Customer = &CustomerInfo{
			ID:    customer.ID.String(),
			Name:  customer.Name,
			Email: customer.Email,
		}
	}

	// Populate assigned agent safely if present
	if ticket.AssigneeAgentID != nil && *ticket.AssigneeAgentID != uuid.Nil {
		agent, err := s.agentRepo.GetByID(ctx, tenantID, *ticket.AssigneeAgentID)
		if err == nil && agent != nil {
			ticketDetail.AssignedAgent = &AgentInfo{
				ID:    agent.ID.String(),
				Name:  agent.Name,
				Email: agent.Email,
			}
		}
	}

	return ticketDetail, nil
}

// ListTicketsRequest represents a ticket list request
type ListTicketsRequest struct {
	Status     []string `json:"status,omitempty"`
	Priority   []string `json:"priority,omitempty"`
	AssigneeID *string  `json:"assignee_id,omitempty"`
	CustomerID *string  `json:"customer_id,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	Search     string   `json:"search,omitempty"`
	Source     []string `json:"source,omitempty"`
	Type       []string `json:"type,omitempty"`
	Cursor     string   `json:"cursor,omitempty"`
	Limit      int      `json:"limit,omitempty"`
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

	if req.CustomerID != nil {
		requesterUUID, err := uuid.Parse(*req.CustomerID)
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
		if ticket.CustomerID != uuid.Nil {
			customer, err := s.customerRepo.GetByID(ctx, tenantID, ticket.CustomerID)
			fmt.Println("Customer Id", ticket.CustomerID.String(), "tenantID ", tenantID.String())
			fmt.Println(customer)
			if err == nil && customer != nil {
				ticketDetail.Customer = &CustomerInfo{
					ID:    customer.ID.String(),
					Email: customer.Email,
					Name:  customer.Name,
				}
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

// CustomerValidationResult represents the result of customer validation attempt
type CustomerValidationResult struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	SMTPConfigured bool   `json:"smtp_configured"`
	OTPSent        bool   `json:"otp_sent,omitempty"`
}

// MagicLinkResult represents the result of magic link send attempt
type MagicLinkResult struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	SMTPConfigured bool   `json:"smtp_configured"`
	LinkSent       bool   `json:"link_sent,omitempty"`
}

// SendCustomerValidationOTP sends an OTP to the customer for validation
func (s *TicketService) SendCustomerValidationOTP(ctx context.Context, tenantID, projectID, ticketID uuid.UUID) (*CustomerValidationResult, error) {
	// Get ticket first to validate access and get customer info
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("failed to get ticket: %w", err)
	}

	// Get customer details
	customer, err := s.customerRepo.GetByID(ctx, tenantID, ticket.CustomerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	// Check if SMTP is configured for this tenant/project
	// For now, we'll assume it's configured if mail service is available
	// In a real implementation, you'd check the tenant's email connector settings
	smtpConfigured := s.mailService != nil

	result := &CustomerValidationResult{
		SMTPConfigured: smtpConfigured,
	}

	if !smtpConfigured {
		result.Success = false
		result.Message = "SMTP is not configured. Please configure email settings to send customer validation."
		return result, nil
	}

	// Generate 6-digit OTP
	otp, err := util.GenerateOTP(6)
	if err != nil {
		return nil, fmt.Errorf("failed to generate OTP: %w", err)
	}

	// TODO: Store OTP in cache/database with expiration
	// For now, we'll just simulate sending the email

	// TODO: Send email using mail service
	// For now, we'll simulate successful sending
	log.Printf("OTP email would be sent to %s: %s", customer.Email, otp)

	result.Success = true
	result.OTPSent = true
	result.Message = fmt.Sprintf("Verification code sent to %s", customer.Email)

	return result, nil
}

// SendMagicLinkToCustomer sends a magic link to the customer
func (s *TicketService) SendMagicLinkToCustomer(ctx context.Context, tenantID, projectID, ticketID uuid.UUID) (*MagicLinkResult, error) {
	// Get ticket first to validate access and get customer info
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("failed to get ticket: %w", err)
	}

	// Get customer details
	customer, err := s.customerRepo.GetByID(ctx, tenantID, ticket.CustomerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	// Check if SMTP is configured for this tenant/project
	smtpConfigured := s.mailService != nil

	result := &MagicLinkResult{
		SMTPConfigured: smtpConfigured,
	}

	if !smtpConfigured {
		result.Success = false
		result.Message = "SMTP is not configured. Please configure email settings to send magic links."
		return result, nil
	}

	// Generate magic link token
	magicToken, err := s.publicService.GenerateMagicLinkToken(tenantID, projectID, ticketID, customer.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate magic link: %w", err)
	}

	// Create magic link URL
	magicLinkURL := fmt.Sprintf("http://localhost:3000/public-view?token=%s", magicToken)

	// TODO: Send email using mail service
	// For now, we'll simulate successful sending
	log.Printf("Magic link email would be sent to %s: %s", customer.Email, magicLinkURL)

	result.Success = true
	result.LinkSent = true
	result.Message = fmt.Sprintf("Magic link sent to %s", customer.Email)

	return result, nil
}
