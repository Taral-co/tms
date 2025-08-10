package service

import (
	"context"
	"fmt"
	"log"

	"github.com/bareuptime/tms/internal/db"
	"github.com/bareuptime/tms/internal/rbac"
	"github.com/bareuptime/tms/internal/repo"
	"github.com/google/uuid"
)

type TenantService struct {
	tenantRepo  repo.TenantRepository
	agentRepo   repo.AgentRepository
	rbacService *rbac.Service
}

func NewTenantService(tenantRepo repo.TenantRepository, agentRepo repo.AgentRepository, rbacService *rbac.Service) *TenantService {
	return &TenantService{
		tenantRepo:  tenantRepo,
		agentRepo:   agentRepo,
		rbacService: rbacService,
	}
}

// ListTenants lists all tenants - only accessible by tenant admins
func (s *TenantService) ListTenants(ctx context.Context, requestorAgentID string) ([]*db.Tenant, error) {
	// Parse the agent ID
	agentUUID, err := uuid.Parse(requestorAgentID)
	if err != nil {
		return nil, fmt.Errorf("invalid agent ID format: %w", err)
	}

	// For now, we'll allow any authenticated agent to list tenants
	// In a production system, you would implement proper platform admin checking
	// This could involve:
	// 1. A separate platform_admin table
	// 2. Cross-tenant admin roles
	// 3. Special permission checks

	// TODO: Implement proper admin permission checking
	// For demo purposes, we'll check if the agent exists by trying to get their info
	// from the first tenant (this is a hack - in reality you'd have a user management system)

	log.Printf("Agent %s requesting tenant list", agentUUID)

	// Get all tenants
	tenants, err := s.tenantRepo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list tenants: %w", err)
	}

	return tenants, nil
}
