package service

import (
	"context"
	"fmt"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
)

// CustomerService handles customer operations
type CustomerService struct {
	customerRepo repo.CustomerRepository
	rbacService  *rbac.Service
}

// NewCustomerService creates a new customer service
func NewCustomerService(customerRepo repo.CustomerRepository, rbacService *rbac.Service) *CustomerService {
	return &CustomerService{
		customerRepo: customerRepo,
		rbacService:  rbacService,
	}
}

// CreateCustomerRequest represents a customer creation request
type CreateCustomerRequest struct {
	Email    string            `json:"email" validate:"required,email"`
	Name     string            `json:"name" validate:"required,min=1,max=255"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// CreateCustomer creates a new customer
func (s *CustomerService) CreateCustomer(ctx context.Context, tenantID, agentID string, req CreateCustomerRequest) (*db.Customer, error) {
	// Check permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, "", rbac.PermCustomerWrite)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)

	// Check if customer already exists
	existing, err := s.customerRepo.GetByEmail(ctx, tenantUUID, req.Email)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("customer with email %s already exists", req.Email)
	}

	// Create customer
	customer := &db.Customer{
		ID:       uuid.New(),
		TenantID: tenantUUID,
		Email:    req.Email,
		Name:     req.Name,
		Metadata: req.Metadata,
	}

	err = s.customerRepo.Create(ctx, customer)
	if err != nil {
		return nil, fmt.Errorf("failed to create customer: %w", err)
	}

	return customer, nil
}

// UpdateCustomerRequest represents a customer update request
type UpdateCustomerRequest struct {
	Name     *string            `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Metadata *map[string]string `json:"metadata,omitempty"`
}

// UpdateCustomer updates an existing customer
func (s *CustomerService) UpdateCustomer(ctx context.Context, tenantID, customerID, agentID string, req UpdateCustomerRequest) (*db.Customer, error) {
	// Check permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, "", rbac.PermCustomerWrite)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)
	customerUUID, err := uuid.Parse(customerID)
	if err != nil {
		return nil, fmt.Errorf("invalid customer ID")
	}

	// Get existing customer
	customer, err := s.customerRepo.GetByID(ctx, tenantUUID, customerUUID)
	if err != nil {
		return nil, fmt.Errorf("customer not found: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		customer.Name = *req.Name
	}
	if req.Metadata != nil {
		customer.Metadata = *req.Metadata
	}

	err = s.customerRepo.Update(ctx, customer)
	if err != nil {
		return nil, fmt.Errorf("failed to update customer: %w", err)
	}

	return customer, nil
}

// GetCustomer retrieves a customer by ID
func (s *CustomerService) GetCustomer(ctx context.Context, tenantID, customerID, agentID string) (*db.Customer, error) {
	// Check permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, "", rbac.PermCustomerRead)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)
	customerUUID, err := uuid.Parse(customerID)
	if err != nil {
		return nil, fmt.Errorf("invalid customer ID")
	}

	customer, err := s.customerRepo.GetByID(ctx, tenantUUID, customerUUID)
	if err != nil {
		return nil, fmt.Errorf("customer not found: %w", err)
	}

	return customer, nil
}

// GetCustomerByEmail retrieves a customer by email
func (s *CustomerService) GetCustomerByEmail(ctx context.Context, tenantID, email, agentID string) (*db.Customer, error) {
	// Check permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, "", rbac.PermCustomerRead)
	if err != nil {
		return nil, fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)

	customer, err := s.customerRepo.GetByEmail(ctx, tenantUUID, email)
	if err != nil {
		return nil, fmt.Errorf("customer not found: %w", err)
	}

	return customer, nil
}

// ListCustomersRequest represents a customer list request
type ListCustomersRequest struct {
	Email  string            `json:"email,omitempty"`
	Search string            `json:"search,omitempty"`
	Cursor string            `json:"cursor,omitempty"`
	Limit  int               `json:"limit,omitempty"`
}

// ListCustomers retrieves a list of customers
func (s *CustomerService) ListCustomers(ctx context.Context, tenantID, agentID string, req ListCustomersRequest) ([]*db.Customer, string, error) {
	// Check permissions
	hasPermission, err := s.rbacService.CheckPermission(ctx, agentID, tenantID, "", rbac.PermCustomerRead)
	if err != nil {
		return nil, "", fmt.Errorf("failed to check permission: %w", err)
	}
	if !hasPermission {
		return nil, "", fmt.Errorf("insufficient permissions")
	}

	tenantUUID, _ := uuid.Parse(tenantID)

	filters := repo.CustomerFilters{
		Email:  req.Email,
		Search: req.Search,
	}

	pagination := repo.PaginationParams{
		Cursor: req.Cursor,
		Limit:  req.Limit,
	}

	customers, nextCursor, err := s.customerRepo.List(ctx, tenantUUID, filters, pagination)
	if err != nil {
		return nil, "", fmt.Errorf("failed to list customers: %w", err)
	}

	return customers, nextCursor, nil
}
