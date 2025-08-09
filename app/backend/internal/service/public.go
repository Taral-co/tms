package service

import (
    "context"
    "fmt"
    "time"

    "github.com/bareuptime/tms/internal/auth"
    "github.com/bareuptime/tms/internal/db"
    "github.com/bareuptime/tms/internal/repo"
    "github.com/google/uuid"
)

// PublicService handles public operations (magic link access, etc.)
type PublicService struct {
    ticketRepo  repo.TicketRepository
    messageRepo repo.TicketMessageRepository
    jwtAuth     *auth.Service
}

// NewPublicService creates a new public service
func NewPublicService(
    ticketRepo repo.TicketRepository,
    messageRepo repo.TicketMessageRepository,
    jwtAuth *auth.Service,
) *PublicService {
    return &PublicService{
        ticketRepo:  ticketRepo,
        messageRepo: messageRepo,
        jwtAuth:     jwtAuth,
    }
}

// AddPublicMessageRequest represents a request to add a public message to a ticket
type AddPublicMessageRequest struct {
    Body string `json:"body" validate:"required"`
}

// GetTicketByMagicLink retrieves a ticket using a magic link token
func (s *PublicService) GetTicketByMagicLink(ctx context.Context, magicToken string) (*db.Ticket, error) {
    // Validate magic link token
    claims, err := s.jwtAuth.ValidateToken(magicToken)
    if err != nil {
        return nil, fmt.Errorf("invalid magic link: %w", err)
    }

    // Check token type
    if claims.TokenType != "magic_link" {
        return nil, fmt.Errorf("invalid token type")
    }

    // Check expiration
    if claims.ExpiresAt != nil && time.Now().After(claims.ExpiresAt.Time) {
        return nil, fmt.Errorf("magic link has expired")
    }

    // Extract ticket information from claims
    tenantID := claims.TenantID
    if tenantID == "" {
        return nil, fmt.Errorf("invalid token: missing tenant_id")
    }

    projectID := claims.ProjectID
    if projectID == "" {
        return nil, fmt.Errorf("invalid token: missing project_id")
    }

    ticketID := claims.TicketID
    if ticketID == "" {
        return nil, fmt.Errorf("invalid token: missing ticket_id")
    }

    tenantUUID, err := uuid.Parse(tenantID)
    if err != nil {
        return nil, fmt.Errorf("invalid tenant ID in token")
    }

    projectUUID, err := uuid.Parse(projectID)
    if err != nil {
        return nil, fmt.Errorf("invalid project ID in token")
    }

    ticketUUID, err := uuid.Parse(ticketID)
    if err != nil {
        return nil, fmt.Errorf("invalid ticket ID in token")
    }

    // Get ticket
    ticket, err := s.ticketRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID)
    if err != nil {
        return nil, fmt.Errorf("ticket not found: %w", err)
    }

	return ticket, nil
}

// GetTicketMessagesByMagicLink retrieves public messages for a ticket using a magic link token
func (s *PublicService) GetTicketMessagesByMagicLink(ctx context.Context, magicToken string, cursor string, limit int) ([]*db.TicketMessage, string, error) {
	// Validate magic link token
	claims, err := s.jwtAuth.ValidateToken(magicToken)
	if err != nil {
		return nil, "", fmt.Errorf("invalid magic link: %w", err)
	}

	// Check token type
	if claims.TokenType != "magic_link" {
		return nil, "", fmt.Errorf("invalid token type")
	}

	// Check expiration
	if claims.ExpiresAt != nil && time.Now().After(claims.ExpiresAt.Time) {
		return nil, "", fmt.Errorf("magic link has expired")
	}

	// Extract ticket information from claims
	tenantID := claims.TenantID
	if tenantID == "" {
		return nil, "", fmt.Errorf("invalid token: missing tenant_id")
	}

	projectID := claims.ProjectID
	if projectID == "" {
		return nil, "", fmt.Errorf("invalid token: missing project_id")
	}

	ticketID := claims.TicketID
	if ticketID == "" {
		return nil, "", fmt.Errorf("invalid token: missing ticket_id")
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, "", fmt.Errorf("invalid tenant ID in token")
	}

	projectUUID, err := uuid.Parse(projectID)
	if err != nil {
		return nil, "", fmt.Errorf("invalid project ID in token")
	}

	ticketUUID, err := uuid.Parse(ticketID)
	if err != nil {
		return nil, "", fmt.Errorf("invalid ticket ID in token")
	}

	// Verify ticket exists
	_, err = s.ticketRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID)
	if err != nil {
		return nil, "", fmt.Errorf("ticket not found: %w", err)
	}

	pagination := repo.PaginationParams{
		Cursor: cursor,
		Limit:  limit,
	}

	// Get public messages only (includePrivate = false)
	messages, nextCursor, err := s.messageRepo.GetByTicketID(ctx, tenantUUID, projectUUID, ticketUUID, false, pagination)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nextCursor, nil
}

// AddMessageByMagicLink adds a public message to a ticket using a magic link token
func (s *PublicService) AddMessageByMagicLink(ctx context.Context, magicToken string, req AddPublicMessageRequest) (*db.TicketMessage, error) {
	// Validate magic link token
	claims, err := s.jwtAuth.ValidateToken(magicToken)
	if err != nil {
		return nil, fmt.Errorf("invalid magic link: %w", err)
	}

	// Check token type
	if claims.TokenType != "magic_link" {
		return nil, fmt.Errorf("invalid token type")
	}

	// Check expiration
	if claims.ExpiresAt != nil && time.Now().After(claims.ExpiresAt.Time) {
		return nil, fmt.Errorf("magic link has expired")
	}

	// Extract ticket information from claims
	tenantID := claims.TenantID
	if tenantID == "" {
		return nil, fmt.Errorf("invalid token: missing tenant_id")
	}

	projectID := claims.ProjectID
	if projectID == "" {
		return nil, fmt.Errorf("invalid token: missing project_id")
	}

	ticketID := claims.TicketID
	if ticketID == "" {
		return nil, fmt.Errorf("invalid token: missing ticket_id")
	}

	customerID := claims.CustomerID
	if customerID == "" {
		return nil, fmt.Errorf("invalid token: missing customer_id")
	}

	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant ID in token")
	}

	projectUUID, err := uuid.Parse(projectID)
	if err != nil {
		return nil, fmt.Errorf("invalid project ID in token")
	}

	ticketUUID, err := uuid.Parse(ticketID)
	if err != nil {
		return nil, fmt.Errorf("invalid ticket ID in token")
	}

	customerUUID, err := uuid.Parse(customerID)
	if err != nil {
		return nil, fmt.Errorf("invalid customer ID in token")
	}

	// Verify ticket exists
	ticket, err := s.ticketRepo.GetByID(ctx, tenantUUID, projectUUID, ticketUUID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	// Verify the customer owns this ticket
	if ticket.RequesterID != customerUUID {
		return nil, fmt.Errorf("unauthorized: customer does not own this ticket")
	}

	// Create message from customer
	message := &db.TicketMessage{
		ID:         uuid.New(),
		TenantID:   tenantUUID,
		ProjectID:  projectUUID,
		TicketID:   ticketUUID,
		AuthorType: "customer",
		AuthorID:   &customerUUID,
		Body:       req.Body,
		IsPrivate:  false, // Customer messages are always public
		CreatedAt:  time.Now(),
	}

	err = s.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return message, nil
}// GenerateMagicLinkToken generates a magic link token for a ticket
func (s *PublicService) GenerateMagicLinkToken(tenantID, projectID, ticketID, customerID string) (string, error) {
    return s.jwtAuth.GenerateTicketMagicLinkToken(tenantID, projectID, ticketID, customerID)
}
