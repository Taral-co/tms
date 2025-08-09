package rbac

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/bareuptime/tms/internal/db"
	"github.com/google/uuid"
)

// Permission represents a permission string
type Permission string

// Define permissions
const (
	// Ticket permissions
	PermTicketRead       Permission = "ticket:read"
	PermTicketWrite      Permission = "ticket:write"
	PermTicketAdmin      Permission = "ticket:admin"
	
	// Agent permissions
	PermAgentRead        Permission = "agent:read"
	PermAgentWrite       Permission = "agent:write"
	
	// Customer permissions
	PermCustomerRead     Permission = "customer:read"
	PermCustomerWrite    Permission = "customer:write"
	
	// Note permissions
	PermNotePrivateRead  Permission = "note:private:read"
	PermNotePrivateWrite Permission = "note:private:write"
)

// Role represents a role with its permissions
type Role struct {
	Name        string
	Permissions []Permission
}

// Define roles
var (
	RoleAdmin = Role{
		Name: "admin",
		Permissions: []Permission{
			PermTicketRead, PermTicketWrite, PermTicketAdmin,
			PermAgentRead, PermAgentWrite,
			PermCustomerRead, PermCustomerWrite,
			PermNotePrivateRead, PermNotePrivateWrite,
		},
	}
	
	RoleAgent = Role{
		Name: "agent",
		Permissions: []Permission{
			PermTicketRead, PermTicketWrite,
			PermCustomerRead, PermCustomerWrite,
			PermNotePrivateRead, PermNotePrivateWrite,
		},
	}
	
	RoleViewer = Role{
		Name: "viewer",
		Permissions: []Permission{
			PermTicketRead,
			PermCustomerRead,
		},
	}
)

var roleMap = map[string]Role{
	"admin":  RoleAdmin,
	"agent":  RoleAgent,
	"viewer": RoleViewer,
}

// Service handles RBAC operations
type Service struct {
	db *sql.DB
}

// NewService creates a new RBAC service
func NewService(database *sql.DB) *Service {
	return &Service{db: database}
}

// CheckPermission checks if an agent has a specific permission
func (s *Service) CheckPermission(ctx context.Context, agentID, tenantID, projectID string, permission Permission) (bool, error) {
	_, err := uuid.Parse(agentID)
	if err != nil {
		return false, fmt.Errorf("invalid agent ID: %w", err)
	}
	
	_, err = uuid.Parse(tenantID)
	if err != nil {
		return false, fmt.Errorf("invalid tenant ID: %w", err)
	}

	// Get agent's role bindings
	roleBindings, err := s.GetAgentRoleBindings(ctx, agentID, tenantID)
	if err != nil {
		return false, fmt.Errorf("failed to get role bindings: %w", err)
	}

	// Check permissions for each role binding
	for _, binding := range roleBindings {
		// If projectID is specified, check project-specific roles
		if projectID != "" {
			projectUUID, err := uuid.Parse(projectID)
			if err != nil {
				continue
			}
			if binding.ProjectID != nil && *binding.ProjectID == projectUUID {
				if s.hasPermission(binding.Role, permission) {
					return true, nil
				}
			}
		}
		
		// Check tenant-level roles (when ProjectID is nil)
		if binding.ProjectID == nil {
			if s.hasPermission(binding.Role, permission) {
				return true, nil
			}
		}
	}

	return false, nil
}

// hasPermission checks if a role has a specific permission
func (s *Service) hasPermission(roleName string, permission Permission) bool {
	role, exists := roleMap[roleName]
	if !exists {
		return false
	}

	for _, perm := range role.Permissions {
		if perm == permission {
			return true
		}
	}

	return false
}

// GetAgentRoleBindings retrieves all role bindings for an agent
func (s *Service) GetAgentRoleBindings(ctx context.Context, agentID, tenantID string) ([]*db.RoleBinding, error) {
	agentUUID, err := uuid.Parse(agentID)
	if err != nil {
		return nil, fmt.Errorf("invalid agent ID: %w", err)
	}
	
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant ID: %w", err)
	}

	query := `
		SELECT agent_id, tenant_id, project_id, role, created_at, updated_at
		FROM agent_project_roles
		WHERE agent_id = $1 AND tenant_id = $2
	`

	rows, err := s.db.QueryContext(ctx, query, agentUUID, tenantUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to query role bindings: %w", err)
	}
	defer rows.Close()

	var bindings []*db.RoleBinding
	for rows.Next() {
		var binding db.RoleBinding
		err := rows.Scan(
			&binding.AgentID,
			&binding.TenantID,
			&binding.ProjectID,
			&binding.Role,
			&binding.CreatedAt,
			&binding.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role binding: %w", err)
		}
		bindings = append(bindings, &binding)
	}

	return bindings, nil
}

// AssignRole assigns a role to an agent
func (s *Service) AssignRole(ctx context.Context, agentID, tenantID, projectID, role string) error {
	agentUUID, err := uuid.Parse(agentID)
	if err != nil {
		return fmt.Errorf("invalid agent ID: %w", err)
	}
	
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %w", err)
	}

	var projectUUID *uuid.UUID
	if projectID != "" {
		parsed, err := uuid.Parse(projectID)
		if err != nil {
			return fmt.Errorf("invalid project ID: %w", err)
		}
		projectUUID = &parsed
	}

	// Validate role exists
	if _, exists := roleMap[role]; !exists {
		return fmt.Errorf("invalid role: %s", role)
	}

	query := `
		INSERT INTO agent_project_roles (agent_id, tenant_id, project_id, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (agent_id, tenant_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid))
		DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
	`

	_, err = s.db.ExecContext(ctx, query, agentUUID, tenantUUID, projectUUID, role)
	if err != nil {
		return fmt.Errorf("failed to assign role: %w", err)
	}

	return nil
}

// RemoveRole removes a role from an agent
func (s *Service) RemoveRole(ctx context.Context, agentID, tenantID, projectID, role string) error {
	agentUUID, err := uuid.Parse(agentID)
	if err != nil {
		return fmt.Errorf("invalid agent ID: %w", err)
	}
	
	tenantUUID, err := uuid.Parse(tenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %w", err)
	}

	var projectUUID *uuid.UUID
	if projectID != "" {
		parsed, err := uuid.Parse(projectID)
		if err != nil {
			return fmt.Errorf("invalid project ID: %w", err)
		}
		projectUUID = &parsed
	}

	query := `
		DELETE FROM agent_project_roles
		WHERE agent_id = $1 AND tenant_id = $2 AND 
		      COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($3, '00000000-0000-0000-0000-000000000000'::uuid)
		      AND role = $4
	`

	_, err = s.db.ExecContext(ctx, query, agentUUID, tenantUUID, projectUUID, role)
	if err != nil {
		return fmt.Errorf("failed to remove role: %w", err)
	}

	return nil
}