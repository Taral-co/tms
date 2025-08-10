package repo

import (
	"context"
	"database/sql"

	"github.com/bareuptime/tms/internal/db"
	"github.com/google/uuid"
)

type tenantRepository struct {
	db *sql.DB
}

// NewTenantRepository creates a new tenant repository
func NewTenantRepository(database *sql.DB) TenantRepository {
	return &tenantRepository{db: database}
}

// Create creates a new tenant
func (r *tenantRepository) Create(ctx context.Context, tenant *db.Tenant) error {
	query := `
		INSERT INTO tenants (id, name, status, region, kms_key_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`

	_, err := r.db.ExecContext(ctx, query,
		tenant.ID, tenant.Name, tenant.Status, tenant.Region, tenant.KMSKeyID)
	return err
}

// GetByID retrieves a tenant by ID
func (r *tenantRepository) GetByID(ctx context.Context, tenantID uuid.UUID) (*db.Tenant, error) {
	query := `
		SELECT id, name, status, region, kms_key_id, created_at, updated_at
		FROM tenants
		WHERE id = $1
	`

	var tenant db.Tenant
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&tenant.ID, &tenant.Name, &tenant.Status, &tenant.Region, &tenant.KMSKeyID,
		&tenant.CreatedAt, &tenant.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &tenant, nil
}

// Update updates an existing tenant
func (r *tenantRepository) Update(ctx context.Context, tenant *db.Tenant) error {
	query := `
		UPDATE tenants 
		SET name = $2, status = $3, region = $4, kms_key_id = $5, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query,
		tenant.ID, tenant.Name, tenant.Status, tenant.Region, tenant.KMSKeyID)
	return err
}

// Delete deletes a tenant
func (r *tenantRepository) Delete(ctx context.Context, tenantID uuid.UUID) error {
	query := `DELETE FROM tenants WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, tenantID)
	return err
}

// List retrieves all tenants
func (r *tenantRepository) List(ctx context.Context) ([]*db.Tenant, error) {
	query := `
		SELECT id, name, status, region, kms_key_id, created_at, updated_at
		FROM tenants
		ORDER BY name ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tenants []*db.Tenant
	for rows.Next() {
		var tenant db.Tenant
		err := rows.Scan(
			&tenant.ID, &tenant.Name, &tenant.Status, &tenant.Region, &tenant.KMSKeyID,
			&tenant.CreatedAt, &tenant.UpdatedAt)
		if err != nil {
			return nil, err
		}
		tenants = append(tenants, &tenant)
	}

	return tenants, nil
}
