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
	// Validate public ticket token
	claims, err := s.jwtAuth.ValidatePublicToken(magicToken)
	if err != nil {
		return nil, fmt.Errorf("invalid magic link: %w", err)
	}

	// Check token type
	if claims.Sub != "public-ticket" {
		return nil, fmt.Errorf("invalid token type")
	}

	// Check expiration
	if time.Now().Unix() > claims.Exp {
		return nil, fmt.Errorf("magic link has expired")
	}

	// Extract ticket information from claims
	tenantID := claims.TenantID
	projectID := claims.ProjectID
	ticketID := claims.TicketID

	// Get ticket
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	return ticket, nil
}

// GetTicketMessagesByMagicLink retrieves public messages for a ticket using a magic link token
func (s *PublicService) GetTicketMessagesByMagicLink(ctx context.Context, magicToken string, cursor string, limit int) ([]*db.TicketMessage, string, error) {
	// Validate public ticket token
	claims, err := s.jwtAuth.ValidatePublicToken(magicToken)
	if err != nil {
		return nil, "", fmt.Errorf("invalid magic link: %w", err)
	}

	// Check token type
	if claims.Sub != "public-ticket" {
		return nil, "", fmt.Errorf("invalid token type")
	}

	// Check expiration
	if time.Now().Unix() > claims.Exp {
		return nil, "", fmt.Errorf("magic link has expired")
	}

	// Extract ticket information from claims
	tenantID := claims.TenantID
	projectID := claims.ProjectID
	ticketID := claims.TicketID

	// Verify ticket exists
	_, err = s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, "", fmt.Errorf("ticket not found: %w", err)
	}

	pagination := repo.PaginationParams{
		Cursor: cursor,
		Limit:  limit,
	}

	// Get public messages only (includePrivate = false)
	messages, nextCursor, err := s.messageRepo.GetByTicketID(ctx, tenantID, projectID, ticketID, false, pagination)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nextCursor, nil
}

// AddMessageByMagicLink adds a public message to a ticket using a magic link token
func (s *PublicService) AddMessageByMagicLink(ctx context.Context, magicToken string, req AddPublicMessageRequest) (*db.TicketMessage, error) {
	// Validate public ticket token
	claims, err := s.jwtAuth.ValidatePublicToken(magicToken)
	if err != nil {
		return nil, fmt.Errorf("invalid magic link: %w", err)
	}

	// Check token type
	if claims.Sub != "public-ticket" {
		return nil, fmt.Errorf("invalid token type")
	}

	// Check expiration
	if time.Now().Unix() > claims.Exp {
		return nil, fmt.Errorf("magic link has expired")
	}

	// Extract ticket information from claims
	tenantID := claims.TenantID
	projectID := claims.ProjectID
	ticketID := claims.TicketID

	// Verify ticket exists and get the requester (customer) ID
	ticket, err := s.ticketRepo.GetByID(ctx, tenantID, projectID, ticketID)
	if err != nil {
		return nil, fmt.Errorf("ticket not found: %w", err)
	}

	// Use the ticket's requester as the customer ID
	customerID := ticket.RequesterID

	// Create message from customer
	message := &db.TicketMessage{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProjectID:  projectID,
		TicketID:   ticketID,
		AuthorType: "customer",
		AuthorID:   &customerID,
		Body:       req.Body,
		IsPrivate:  false, // Customer messages are always public
		CreatedAt:  time.Now(),
	}

	err = s.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	return message, nil
}

// GenerateMagicLinkToken generates a magic link token for a ticket
func (s *PublicService) GenerateMagicLinkToken(tenantID, projectID, ticketID, customerID string) (string, error) {
	tenantUUID, _ := uuid.Parse(tenantID)

	projectUUID, err := uuid.Parse(projectID)
	if err != nil {
		return "", fmt.Errorf("invalid project ID: %w", err)
	}

	ticketUUID, err := uuid.Parse(ticketID)
	if err != nil {
		return "", fmt.Errorf("invalid ticket ID: %w", err)
	}

	// For public ticket access, we don't need to include customer ID in the token
	// The customer ownership is verified when the ticket is accessed
	scope := []string{"read", "write"}
	return s.jwtAuth.GeneratePublicToken(tenantUUID, projectUUID, ticketUUID, scope)
}
