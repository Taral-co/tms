package repo

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/bareuptime/tms/internal/models"
)

type DomainValidationRepo struct {
	db *sqlx.DB
}

func NewDomainValidationRepo(db *sqlx.DB) *DomainValidationRepo {
	return &DomainValidationRepo{db: db}
}

// CreateDomainValidation creates a new domain validation record
func (r *DomainValidationRepo) CreateDomainValidation(ctx context.Context, validation *models.EmailDomain) error {
	query := `
		INSERT INTO email_domain_validations (
			id, tenant_id, project_id, domain, validation_token,
			status, expires_at, metadata, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :project_id, :domain, :validation_token,
			:status, :expires_at, :metadata, :created_at, :updated_at
		)
		ON CONFLICT (tenant_id, project_id, domain) 
		DO UPDATE SET
			validation_token = EXCLUDED.validation_token,
			status = EXCLUDED.status,
			expires_at = EXCLUDED.expires_at,
			metadata = EXCLUDED.metadata,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.NamedExecContext(ctx, query, validation)
	return err
}

// GetDomainValidation gets a domain validation by tenant, project, and domain
func (r *DomainValidationRepo) GetDomainValidation(ctx context.Context, tenantID, projectID uuid.UUID, domain string) (*models.EmailDomain, error) {
	query := `
		SELECT id, tenant_id, project_id, domain, validation_token,
			   status, verified_at, expires_at, metadata, created_at, updated_at
		FROM email_domain_validations
		WHERE tenant_id = $1 AND project_id = $2 AND domain = $3
	`

	var validation models.EmailDomain
	err := r.db.GetContext(ctx, &validation, query, tenantID, projectID, domain)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &validation, nil
}

// GetDomainByID gets a domain validation by ID
func (r *DomainValidationRepo) GetDomainByID(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) (*models.EmailDomain, error) {
	query := `
		SELECT id, tenant_id, project_id, domain, validation_token,
			   status, verified_at, expires_at, metadata, created_at, updated_at
		FROM email_domain_validations
		WHERE tenant_id = $1 AND id = $2
	`

	var validation models.EmailDomain
	err := r.db.GetContext(ctx, &validation, query, tenantID, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &validation, nil
}

// ListDomainNames lists all domain validations for a project
func (r *DomainValidationRepo) ListDomainNames(ctx context.Context, tenantID, projectID uuid.UUID) ([]*models.EmailDomain, error) {
	query := `
		SELECT id, tenant_id, project_id, domain, validation_token,
			   status, verified_at, expires_at, metadata, created_at, updated_at
		FROM email_domain_validations
		WHERE tenant_id = $1 AND project_id = $2
		ORDER BY created_at DESC
	`

	var validations []*models.EmailDomain
	err := r.db.SelectContext(ctx, &validations, query, tenantID, projectID)
	if err != nil {
		return nil, err
	}
	return validations, nil
}

// UpdateDomainValidation updates a domain validation record
func (r *DomainValidationRepo) UpdateDomainValidation(ctx context.Context, validation *models.EmailDomain) error {
	validation.UpdatedAt = time.Now()

	query := `
		UPDATE email_domain_validations SET
			validation_token = :validation_token,
			status = :status,
			verified_at = :verified_at,
			expires_at = :expires_at,
			metadata = :metadata,
			updated_at = :updated_at
		WHERE tenant_id = :tenant_id AND id = :id
	`
	_, err := r.db.NamedExecContext(ctx, query, validation)
	return err
}

// DeleteDomainName deletes a domain validation record
func (r *DomainValidationRepo) DeleteDomainName(ctx context.Context, tenantID, projectID uuid.UUID, id uuid.UUID) error {
	query := `DELETE FROM email_domain_validations WHERE tenant_id = $1 AND project_id = $2 AND id = $3`
	_, err := r.db.ExecContext(ctx, query, tenantID, projectID, id)
	return err
}

// CleanupExpiredValidations removes expired validation records
func (r *DomainValidationRepo) CleanupExpiredValidations(ctx context.Context) error {
	query := `
		UPDATE email_domain_validations 
		SET status = $1, updated_at = $2
		WHERE status != $3 AND expires_at < $2
	`
	_, err := r.db.ExecContext(ctx, query, models.DomainValidationStatusExpired, time.Now(), models.DomainValidationStatusVerified)
	return err
}
