package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/bareuptime/tms/internal/models"
)

type IntegrationRepository struct {
	db *sqlx.DB
}

func NewIntegrationRepository(db *sqlx.DB) *IntegrationRepository {
	return &IntegrationRepository{db: db}
}

// Integration CRUD operations
func (r *IntegrationRepository) CreateIntegration(ctx context.Context, integration *models.Integration) error {
	query := `
		INSERT INTO integrations (
			id, tenant_id, project_id, type, name, status, config, 
			oauth_token_id, webhook_url, webhook_secret, retry_count
		) VALUES (
			:id, :tenant_id, :project_id, :type, :name, :status, :config,
			:oauth_token_id, :webhook_url, :webhook_secret, :retry_count
		)`

	_, err := r.db.NamedExecContext(ctx, query, integration)
	return err
}

func (r *IntegrationRepository) GetIntegrationByID(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.Integration, error) {
	var integration models.Integration
	query := `
		SELECT * FROM integrations 
		WHERE tenant_id = $1 AND id = $2`

	err := r.db.GetContext(ctx, &integration, query, tenantID, integrationID)
	if err != nil {
		return nil, err
	}
	return &integration, nil
}

func (r *IntegrationRepository) ListIntegrations(ctx context.Context, tenantID, projectID uuid.UUID, integrationType *models.IntegrationType, status *models.IntegrationStatus) ([]*models.Integration, error) {
	baseQuery := `
		SELECT * FROM integrations 
		WHERE tenant_id = $1 AND project_id = $2`

	args := []interface{}{tenantID, projectID}
	argCount := 2

	if integrationType != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND type = $%d", argCount)
		args = append(args, *integrationType)
	}

	if status != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *status)
	}

	baseQuery += " ORDER BY created_at DESC"

	var integrations []*models.Integration
	err := r.db.SelectContext(ctx, &integrations, baseQuery, args...)
	return integrations, err
}

func (r *IntegrationRepository) UpdateIntegration(ctx context.Context, integration *models.Integration) error {
	query := `
		UPDATE integrations SET
			name = :name,
			status = :status,
			config = :config,
			oauth_token_id = :oauth_token_id,
			webhook_url = :webhook_url,
			webhook_secret = :webhook_secret,
			last_sync_at = :last_sync_at,
			last_error = :last_error,
			retry_count = :retry_count,
			updated_at = NOW()
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, integration)
	return err
}

func (r *IntegrationRepository) DeleteIntegration(ctx context.Context, tenantID, integrationID uuid.UUID) error {
	query := `DELETE FROM integrations WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, integrationID)
	return err
}

// Integration Sync Log operations
func (r *IntegrationRepository) CreateIntegrationSyncLog(ctx context.Context, log *models.IntegrationSyncLog) error {
	query := `
		INSERT INTO integration_sync_logs (
			id, tenant_id, project_id, integration_id, operation, status,
			external_id, request_payload, response_payload, error_message, duration_ms
		) VALUES (
			:id, :tenant_id, :project_id, :integration_id, :operation, :status,
			:external_id, :request_payload, :response_payload, :error_message, :duration_ms
		)`

	_, err := r.db.NamedExecContext(ctx, query, log)
	return err
}

func (r *IntegrationRepository) ListIntegrationSyncLogs(ctx context.Context, tenantID, integrationID uuid.UUID, limit int) ([]*models.IntegrationSyncLog, error) {
	query := `
		SELECT * FROM integration_sync_logs 
		WHERE tenant_id = $1 AND integration_id = $2
		ORDER BY created_at DESC`

	args := []interface{}{tenantID, integrationID}

	if limit > 0 {
		query += " LIMIT $3"
		args = append(args, limit)
	}

	var logs []*models.IntegrationSyncLog
	err := r.db.SelectContext(ctx, &logs, query, args...)
	return logs, err
}

// Rate limiting operations
func (r *IntegrationRepository) GetIntegrationRateLimit(ctx context.Context, tenantID, integrationID uuid.UUID, operation string) (*models.IntegrationRateLimit, error) {
	var rateLimit models.IntegrationRateLimit
	query := `SELECT * FROM integration_rate_limits WHERE tenant_id = $1 AND integration_id = $2 AND operation = $3`

	err := r.db.GetContext(ctx, &rateLimit, query, tenantID, integrationID, operation)
	if err == sql.ErrNoRows {
		// Return default rate limit if none exists
		return &models.IntegrationRateLimit{
			IntegrationID:      integrationID,
			TenantID:           tenantID,
			Operation:          operation,
			RequestsPerMinute:  60,
			RequestsPerHour:    1000,
			CurrentMinuteCount: 0,
			CurrentHourCount:   0,
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &rateLimit, nil
}

func (r *IntegrationRepository) UpdateIntegrationRateLimit(ctx context.Context, rateLimit *models.IntegrationRateLimit) error {
	query := `
		INSERT INTO integration_rate_limits (
			id, integration_id, tenant_id, operation, requests_per_minute, requests_per_hour,
			current_minute_count, current_hour_count, minute_reset_at, hour_reset_at
		) VALUES (
			:id, :integration_id, :tenant_id, :operation, :requests_per_minute, :requests_per_hour,
			:current_minute_count, :current_hour_count, :minute_reset_at, :hour_reset_at
		)
		ON CONFLICT (integration_id, operation) 
		DO UPDATE SET
			current_minute_count = EXCLUDED.current_minute_count,
			current_hour_count = EXCLUDED.current_hour_count,
			minute_reset_at = EXCLUDED.minute_reset_at,
			hour_reset_at = EXCLUDED.hour_reset_at`

	_, err := r.db.NamedExecContext(ctx, query, rateLimit)
	return err
}

// New methods for enhanced integration system

// Integration Categories
func (r *IntegrationRepository) ListIntegrationCategories(ctx context.Context) ([]*models.IntegrationCategory, error) {
	var categories []*models.IntegrationCategory
	query := `
		SELECT * FROM integration_categories 
		WHERE is_active = true 
		ORDER BY sort_order ASC, display_name ASC`

	err := r.db.SelectContext(ctx, &categories, query)
	return categories, err
}

func (r *IntegrationRepository) GetIntegrationCategoryByID(ctx context.Context, categoryID uuid.UUID) (*models.IntegrationCategory, error) {
	var category models.IntegrationCategory
	query := `SELECT * FROM integration_categories WHERE id = $1 AND is_active = true`

	err := r.db.GetContext(ctx, &category, query, categoryID)
	if err != nil {
		return nil, err
	}
	return &category, nil
}

// Integration Templates
func (r *IntegrationRepository) ListIntegrationTemplates(ctx context.Context, categoryID *uuid.UUID, featured *bool) ([]*models.IntegrationTemplate, error) {
	var templates []*models.IntegrationTemplate

	query := `
		SELECT * FROM integration_templates 
		WHERE is_active = true`

	var args []interface{}
	argIndex := 1

	if categoryID != nil {
		query += fmt.Sprintf(" AND category_id = $%d", argIndex)
		args = append(args, *categoryID)
		argIndex++
	}

	if featured != nil {
		query += fmt.Sprintf(" AND is_featured = $%d", argIndex)
		args = append(args, *featured)
		argIndex++
	}

	query += " ORDER BY sort_order ASC, display_name ASC"

	err := r.db.SelectContext(ctx, &templates, query, args...)
	return templates, err
}

func (r *IntegrationRepository) GetIntegrationTemplateByType(ctx context.Context, integrationType models.IntegrationType) (*models.IntegrationTemplate, error) {
	var template models.IntegrationTemplate
	query := `SELECT * FROM integration_templates WHERE type = $1 AND is_active = true`

	err := r.db.GetContext(ctx, &template, query, integrationType)
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *IntegrationRepository) ListCategoriesWithTemplates(ctx context.Context, featured *bool) ([]*models.IntegrationCategoryWithTemplates, error) {
	// Get categories
	categories, err := r.ListIntegrationCategories(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*models.IntegrationCategoryWithTemplates, len(categories))

	for i, category := range categories {
		// Get templates for each category
		templates, err := r.ListIntegrationTemplates(ctx, &category.ID, featured)
		if err != nil {
			return nil, err
		}

		result[i] = &models.IntegrationCategoryWithTemplates{
			IntegrationCategory: *category,
			Templates:           make([]models.IntegrationTemplate, len(templates)),
		}

		for j, template := range templates {
			result[i].Templates[j] = *template
		}
	}

	return result, nil
}

// OAuth Flows
func (r *IntegrationRepository) CreateOAuthFlow(ctx context.Context, flow *models.OAuthFlow) error {
	query := `
		INSERT INTO oauth_flows (
			id, tenant_id, project_id, integration_type, state_token, 
			redirect_url, expires_at
		) VALUES (
			:id, :tenant_id, :project_id, :integration_type, :state_token,
			:redirect_url, :expires_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, flow)
	return err
}

func (r *IntegrationRepository) GetOAuthFlowByState(ctx context.Context, stateToken string) (*models.OAuthFlow, error) {
	var flow models.OAuthFlow
	query := `SELECT * FROM oauth_flows WHERE state_token = $1`

	err := r.db.GetContext(ctx, &flow, query, stateToken)
	if err != nil {
		return nil, err
	}
	return &flow, nil
}

func (r *IntegrationRepository) DeleteOAuthFlow(ctx context.Context, stateToken string) error {
	query := `DELETE FROM oauth_flows WHERE state_token = $1`
	_, err := r.db.ExecContext(ctx, query, stateToken)
	return err
}

func (r *IntegrationRepository) CleanupExpiredOAuthFlows(ctx context.Context) error {
	query := `DELETE FROM oauth_flows WHERE expires_at < NOW()`
	_, err := r.db.ExecContext(ctx, query)
	return err
}

// Enhanced integration queries with template information
func (r *IntegrationRepository) ListIntegrationsWithTemplates(ctx context.Context, tenantID, projectID uuid.UUID, integrationType *models.IntegrationType, status *models.IntegrationStatus) ([]*models.IntegrationWithTemplate, error) {
	query := `
		SELECT 
			i.*,
			t.id as template_id,
			t.category_id as template_category_id,
			t.type as template_type,
			t.name as template_name,
			t.display_name as template_display_name,
			t.description as template_description,
			t.logo_url as template_logo_url,
			t.website_url as template_website_url,
			t.documentation_url as template_documentation_url,
			t.auth_method as template_auth_method,
			t.config_schema as template_config_schema,
			t.default_config as template_default_config,
			t.supported_events as template_supported_events,
			t.is_featured as template_is_featured,
			t.is_active as template_is_active,
			t.sort_order as template_sort_order,
			t.created_at as template_created_at,
			t.updated_at as template_updated_at,
			c.id as category_id,
			c.name as category_name,
			c.display_name as category_display_name,
			c.description as category_description,
			c.icon as category_icon,
			c.sort_order as category_sort_order,
			c.is_active as category_is_active,
			c.created_at as category_created_at
		FROM integrations i 
		LEFT JOIN integration_templates t ON i.type = t.type AND t.is_active = true
		LEFT JOIN integration_categories c ON t.category_id = c.id AND c.is_active = true
		WHERE i.tenant_id = $1 AND i.project_id = $2`

	var args []interface{}
	args = append(args, tenantID, projectID)
	argIndex := 3

	if integrationType != nil {
		query += fmt.Sprintf(" AND i.type = $%d", argIndex)
		args = append(args, *integrationType)
		argIndex++
	}

	if status != nil {
		query += fmt.Sprintf(" AND i.status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	query += " ORDER BY i.created_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var integrations []*models.IntegrationWithTemplate

	for rows.Next() {
		var integration models.Integration
		var template models.IntegrationTemplate
		var category models.IntegrationCategory
		var templateValid, categoryValid bool

		// Nullable template fields
		var templateID, templateCategoryID sql.NullString
		var templateType, templateName, templateDisplayName sql.NullString
		var templateDescription, templateLogoURL, templateWebsiteURL, templateDocumentationURL sql.NullString
		var templateAuthMethod sql.NullString
		var templateConfigSchema, templateDefaultConfig sql.NullString
		var templateSupportedEvents sql.NullString
		var templateIsFeatured, templateIsActive sql.NullBool
		var templateSortOrder sql.NullInt32
		var templateCreatedAt, templateUpdatedAt sql.NullTime

		// Nullable category fields
		var categoryID sql.NullString
		var categoryName, categoryDisplayName, categoryDescription, categoryIcon sql.NullString
		var categoryIsActive sql.NullBool
		var categorySortOrder sql.NullInt32
		var categoryCreatedAt sql.NullTime

		err := rows.Scan(
			// Integration fields
			&integration.ID, &integration.TenantID, &integration.ProjectID,
			&integration.Type, &integration.Name, &integration.Status,
			&integration.Config, &integration.AuthMethod, &integration.AuthData,
			&integration.OAuthTokenID, &integration.WebhookURL, &integration.WebhookSecret,
			&integration.LastSyncAt, &integration.LastError, &integration.RetryCount,
			&integration.CreatedAt, &integration.UpdatedAt,
			// Template fields
			&templateID, &templateCategoryID, &templateType, &templateName,
			&templateDisplayName, &templateDescription, &templateLogoURL,
			&templateWebsiteURL, &templateDocumentationURL, &templateAuthMethod,
			&templateConfigSchema, &templateDefaultConfig, &templateSupportedEvents,
			&templateIsFeatured, &templateIsActive, &templateSortOrder,
			&templateCreatedAt, &templateUpdatedAt,
			// Category fields
			&categoryID, &categoryName, &categoryDisplayName, &categoryDescription,
			&categoryIcon, &categorySortOrder, &categoryIsActive, &categoryCreatedAt,
		)
		if err != nil {
			return nil, err
		}

		integrationWithTemplate := &models.IntegrationWithTemplate{
			Integration: integration,
		}

		// Populate template if valid
		if templateID.Valid {
			templateUUID, _ := uuid.Parse(templateID.String)
			template.ID = templateUUID

			if templateCategoryID.Valid {
				templateCategoryUUID, _ := uuid.Parse(templateCategoryID.String)
				template.CategoryID = templateCategoryUUID
			}

			template.Type = models.IntegrationType(templateType.String)
			template.Name = templateName.String
			template.DisplayName = templateDisplayName.String
			if templateDescription.Valid {
				template.Description = &templateDescription.String
			}
			if templateLogoURL.Valid {
				template.LogoURL = &templateLogoURL.String
			}
			if templateWebsiteURL.Valid {
				template.WebsiteURL = &templateWebsiteURL.String
			}
			if templateDocumentationURL.Valid {
				template.DocumentationURL = &templateDocumentationURL.String
			}
			template.AuthMethod = models.AuthMethod(templateAuthMethod.String)

			// Handle JSON fields
			if templateConfigSchema.Valid {
				var configSchema models.JSONMap
				if err := json.Unmarshal([]byte(templateConfigSchema.String), &configSchema); err == nil {
					template.ConfigSchema = configSchema
				}
			}

			if templateDefaultConfig.Valid {
				var defaultConfig models.JSONMap
				if err := json.Unmarshal([]byte(templateDefaultConfig.String), &defaultConfig); err == nil {
					template.DefaultConfig = defaultConfig
				}
			}

			if templateSupportedEvents.Valid {
				if err := template.SupportedEvents.Scan([]byte(templateSupportedEvents.String)); err != nil {
					// Log error but continue
					template.SupportedEvents = pq.StringArray{}
				}
			}

			template.IsFeatured = templateIsFeatured.Bool
			template.IsActive = templateIsActive.Bool
			template.SortOrder = int(templateSortOrder.Int32)
			template.CreatedAt = templateCreatedAt.Time
			template.UpdatedAt = templateUpdatedAt.Time

			templateValid = true
		}

		// Populate category if valid
		if categoryID.Valid {
			categoryUUID, _ := uuid.Parse(categoryID.String)
			category.ID = categoryUUID
			category.Name = categoryName.String
			category.DisplayName = categoryDisplayName.String
			if categoryDescription.Valid {
				category.Description = &categoryDescription.String
			}
			if categoryIcon.Valid {
				category.Icon = &categoryIcon.String
			}
			category.SortOrder = int(categorySortOrder.Int32)
			category.IsActive = categoryIsActive.Bool
			category.CreatedAt = categoryCreatedAt.Time

			categoryValid = true
		}

		if templateValid {
			integrationWithTemplate.Template = &template
		}
		if categoryValid {
			integrationWithTemplate.Category = &category
		}

		integrations = append(integrations, integrationWithTemplate)
	}

	return integrations, rows.Err()
}

func (r *IntegrationRepository) GetIntegrationWithTemplate(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.IntegrationWithTemplate, error) {
	integrations, err := r.ListIntegrationsWithTemplates(ctx, tenantID, uuid.Nil, nil, nil)
	if err != nil {
		return nil, err
	}

	for _, integration := range integrations {
		if integration.ID == integrationID {
			return integration, nil
		}
	}

	return nil, sql.ErrNoRows
}
