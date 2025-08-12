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

// OAuth Token operations
func (r *IntegrationRepository) CreateOAuthToken(ctx context.Context, token *models.OAuthToken) error {
	query := `
		INSERT INTO oauth_tokens (
			id, tenant_id, project_id, provider, access_token, refresh_token,
			token_type, expires_at, scope
		) VALUES (
			:id, :tenant_id, :project_id, :provider, :access_token, :refresh_token,
			:token_type, :expires_at, :scope
		)`

	_, err := r.db.NamedExecContext(ctx, query, token)
	return err
}

func (r *IntegrationRepository) GetOAuthToken(ctx context.Context, tenantID, tokenID uuid.UUID) (*models.OAuthToken, error) {
	var token models.OAuthToken
	query := `SELECT * FROM oauth_tokens WHERE tenant_id = $1 AND id = $2`

	err := r.db.GetContext(ctx, &token, query, tenantID, tokenID)
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *IntegrationRepository) UpdateOAuthToken(ctx context.Context, token *models.OAuthToken) error {
	query := `
		UPDATE oauth_tokens SET
			access_token = :access_token,
			refresh_token = :refresh_token,
			token_type = :token_type,
			expires_at = :expires_at,
			scope = :scope,
			updated_at = NOW()
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, token)
	return err
}

func (r *IntegrationRepository) DeleteOAuthToken(ctx context.Context, tenantID, tokenID uuid.UUID) error {
	query := `DELETE FROM oauth_tokens WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, tokenID)
	return err
}

// Webhook Subscription operations
func (r *IntegrationRepository) CreateWebhookSubscription(ctx context.Context, subscription *models.WebhookSubscription) error {
	query := `
		INSERT INTO webhook_subscriptions (
			id, tenant_id, project_id, integration_id, webhook_url, events,
			secret, is_active, retry_count, max_retries, timeout_seconds
		) VALUES (
			:id, :tenant_id, :project_id, :integration_id, :webhook_url, :events,
			:secret, :is_active, :retry_count, :max_retries, :timeout_seconds
		)`

	_, err := r.db.NamedExecContext(ctx, query, subscription)
	return err
}

func (r *IntegrationRepository) GetWebhookSubscription(ctx context.Context, tenantID, subscriptionID uuid.UUID) (*models.WebhookSubscription, error) {
	var subscription models.WebhookSubscription
	query := `SELECT * FROM webhook_subscriptions WHERE tenant_id = $1 AND id = $2`

	err := r.db.GetContext(ctx, &subscription, query, tenantID, subscriptionID)
	if err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (r *IntegrationRepository) ListWebhookSubscriptions(ctx context.Context, tenantID, projectID uuid.UUID, integrationID *uuid.UUID) ([]*models.WebhookSubscription, error) {
	baseQuery := `
		SELECT * FROM webhook_subscriptions 
		WHERE tenant_id = $1 AND project_id = $2`

	args := []interface{}{tenantID, projectID}

	if integrationID != nil {
		baseQuery += " AND integration_id = $3"
		args = append(args, *integrationID)
	}

	baseQuery += " ORDER BY created_at DESC"

	var subscriptions []*models.WebhookSubscription
	err := r.db.SelectContext(ctx, &subscriptions, baseQuery, args...)
	return subscriptions, err
}

func (r *IntegrationRepository) UpdateWebhookSubscription(ctx context.Context, subscription *models.WebhookSubscription) error {
	query := `
		UPDATE webhook_subscriptions SET
			webhook_url = :webhook_url,
			events = :events,
			secret = :secret,
			is_active = :is_active,
			retry_count = :retry_count,
			max_retries = :max_retries,
			timeout_seconds = :timeout_seconds,
			updated_at = NOW()
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, subscription)
	return err
}

func (r *IntegrationRepository) DeleteWebhookSubscription(ctx context.Context, tenantID, subscriptionID uuid.UUID) error {
	query := `DELETE FROM webhook_subscriptions WHERE tenant_id = $1 AND id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, subscriptionID)
	return err
}

// Webhook Delivery operations
func (r *IntegrationRepository) CreateWebhookDelivery(ctx context.Context, delivery *models.WebhookDelivery) error {
	query := `
		INSERT INTO webhook_deliveries (
			id, tenant_id, project_id, subscription_id, event_type, payload,
			request_headers, response_status, response_headers, response_body,
			delivery_attempt, delivered_at, next_retry_at
		) VALUES (
			:id, :tenant_id, :project_id, :subscription_id, :event_type, :payload,
			:request_headers, :response_status, :response_headers, :response_body,
			:delivery_attempt, :delivered_at, :next_retry_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, delivery)
	return err
}

func (r *IntegrationRepository) GetWebhookDelivery(ctx context.Context, tenantID, deliveryID uuid.UUID) (*models.WebhookDelivery, error) {
	var delivery models.WebhookDelivery
	query := `SELECT * FROM webhook_deliveries WHERE tenant_id = $1 AND id = $2`

	err := r.db.GetContext(ctx, &delivery, query, tenantID, deliveryID)
	if err != nil {
		return nil, err
	}
	return &delivery, nil
}

func (r *IntegrationRepository) ListWebhookDeliveries(ctx context.Context, tenantID uuid.UUID, subscriptionID *uuid.UUID, limit int) ([]*models.WebhookDelivery, error) {
	baseQuery := `
		SELECT * FROM webhook_deliveries 
		WHERE tenant_id = $1`

	args := []interface{}{tenantID}
	argCount := 1

	if subscriptionID != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND subscription_id = $%d", argCount)
		args = append(args, *subscriptionID)
	}

	baseQuery += " ORDER BY created_at DESC"

	if limit > 0 {
		argCount++
		baseQuery += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, limit)
	}

	var deliveries []*models.WebhookDelivery
	err := r.db.SelectContext(ctx, &deliveries, baseQuery, args...)
	return deliveries, err
}

func (r *IntegrationRepository) UpdateWebhookDelivery(ctx context.Context, delivery *models.WebhookDelivery) error {
	query := `
		UPDATE webhook_deliveries SET
			response_status = :response_status,
			response_headers = :response_headers,
			response_body = :response_body,
			delivery_attempt = :delivery_attempt,
			delivered_at = :delivered_at,
			next_retry_at = :next_retry_at
		WHERE tenant_id = :tenant_id AND id = :id`

	_, err := r.db.NamedExecContext(ctx, query, delivery)
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

// Slack Configuration operations
func (r *IntegrationRepository) CreateSlackConfiguration(ctx context.Context, config *models.SlackConfiguration) error {
	query := `
		INSERT INTO slack_configurations (
			id, integration_id, tenant_id, bot_token, team_id, team_name,
			bot_user_id, default_channel, notification_settings
		) VALUES (
			:id, :integration_id, :tenant_id, :bot_token, :team_id, :team_name,
			:bot_user_id, :default_channel, :notification_settings
		)`

	_, err := r.db.NamedExecContext(ctx, query, config)
	return err
}

func (r *IntegrationRepository) GetSlackConfiguration(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.SlackConfiguration, error) {
	var config models.SlackConfiguration
	query := `SELECT * FROM slack_configurations WHERE tenant_id = $1 AND integration_id = $2`

	err := r.db.GetContext(ctx, &config, query, tenantID, integrationID)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (r *IntegrationRepository) UpdateSlackConfiguration(ctx context.Context, config *models.SlackConfiguration) error {
	query := `
		UPDATE slack_configurations SET
			bot_token = :bot_token,
			team_name = :team_name,
			bot_user_id = :bot_user_id,
			default_channel = :default_channel,
			notification_settings = :notification_settings,
			updated_at = NOW()
		WHERE tenant_id = :tenant_id AND integration_id = :integration_id`

	_, err := r.db.NamedExecContext(ctx, query, config)
	return err
}

func (r *IntegrationRepository) DeleteSlackConfiguration(ctx context.Context, tenantID, integrationID uuid.UUID) error {
	query := `DELETE FROM slack_configurations WHERE tenant_id = $1 AND integration_id = $2`
	_, err := r.db.ExecContext(ctx, query, tenantID, integrationID)
	return err
}

// Slack Channel Mapping operations
func (r *IntegrationRepository) CreateSlackChannelMapping(ctx context.Context, mapping *models.SlackChannelMapping) error {
	query := `
		INSERT INTO slack_channel_mappings (
			slack_config_id, tenant_id, project_id, channel_id, channel_name, events, is_active
		) VALUES (
			:slack_config_id, :tenant_id, :project_id, :channel_id, :channel_name, :events, :is_active
		)`

	_, err := r.db.NamedExecContext(ctx, query, mapping)
	return err
}

func (r *IntegrationRepository) ListSlackChannelMappings(ctx context.Context, tenantID uuid.UUID, slackConfigID *uuid.UUID, projectID *uuid.UUID) ([]*models.SlackChannelMapping, error) {
	baseQuery := `
		SELECT * FROM slack_channel_mappings 
		WHERE tenant_id = $1`

	args := []interface{}{tenantID}
	argCount := 1

	if slackConfigID != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND slack_config_id = $%d", argCount)
		args = append(args, *slackConfigID)
	}

	if projectID != nil {
		argCount++
		baseQuery += fmt.Sprintf(" AND project_id = $%d", argCount)
		args = append(args, *projectID)
	}

	baseQuery += " ORDER BY created_at DESC"

	var mappings []*models.SlackChannelMapping
	err := r.db.SelectContext(ctx, &mappings, baseQuery, args...)
	return mappings, err
}

func (r *IntegrationRepository) UpdateSlackChannelMapping(ctx context.Context, mapping *models.SlackChannelMapping) error {
	query := `
		UPDATE slack_channel_mappings SET
			channel_name = :channel_name,
			events = :events,
			is_active = :is_active
		WHERE slack_config_id = :slack_config_id AND project_id = :project_id`

	_, err := r.db.NamedExecContext(ctx, query, mapping)
	return err
}

func (r *IntegrationRepository) DeleteSlackChannelMapping(ctx context.Context, slackConfigID, projectID uuid.UUID) error {
	query := `DELETE FROM slack_channel_mappings WHERE slack_config_id = $1 AND project_id = $2`
	_, err := r.db.ExecContext(ctx, query, slackConfigID, projectID)
	return err
}

// JIRA Configuration operations
func (r *IntegrationRepository) CreateJiraConfiguration(ctx context.Context, config *models.JiraConfiguration) error {
	query := `
		INSERT INTO jira_configurations (
			id, integration_id, tenant_id, instance_url, project_key, issue_type,
			field_mappings, sync_settings
		) VALUES (
			:id, :integration_id, :tenant_id, :instance_url, :project_key, :issue_type,
			:field_mappings, :sync_settings
		)`

	_, err := r.db.NamedExecContext(ctx, query, config)
	return err
}

func (r *IntegrationRepository) GetJiraConfiguration(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.JiraConfiguration, error) {
	var config models.JiraConfiguration
	query := `SELECT * FROM jira_configurations WHERE tenant_id = $1 AND integration_id = $2`

	err := r.db.GetContext(ctx, &config, query, tenantID, integrationID)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (r *IntegrationRepository) UpdateJiraConfiguration(ctx context.Context, config *models.JiraConfiguration) error {
	query := `
		UPDATE jira_configurations SET
			instance_url = :instance_url,
			project_key = :project_key,
			issue_type = :issue_type,
			field_mappings = :field_mappings,
			sync_settings = :sync_settings,
			updated_at = NOW()
		WHERE tenant_id = :tenant_id AND integration_id = :integration_id`

	_, err := r.db.NamedExecContext(ctx, query, config)
	return err
}

// JIRA Issue Mapping operations
func (r *IntegrationRepository) CreateJiraIssueMapping(ctx context.Context, mapping *models.JiraIssueMapping) error {
	query := `
		INSERT INTO jira_issue_mappings (
			id, jira_config_id, tenant_id, project_id, ticket_id, jira_issue_key,
			jira_issue_id, sync_direction, last_synced_at
		) VALUES (
			:id, :jira_config_id, :tenant_id, :project_id, :ticket_id, :jira_issue_key,
			:jira_issue_id, :sync_direction, :last_synced_at
		)`

	_, err := r.db.NamedExecContext(ctx, query, mapping)
	return err
}

func (r *IntegrationRepository) GetJiraIssueMappingByTicket(ctx context.Context, tenantID, ticketID uuid.UUID) (*models.JiraIssueMapping, error) {
	var mapping models.JiraIssueMapping
	query := `SELECT * FROM jira_issue_mappings WHERE tenant_id = $1 AND ticket_id = $2`

	err := r.db.GetContext(ctx, &mapping, query, tenantID, ticketID)
	if err != nil {
		return nil, err
	}
	return &mapping, nil
}

func (r *IntegrationRepository) GetJiraIssueMappingByJiraKey(ctx context.Context, tenantID uuid.UUID, jiraConfigID uuid.UUID, jiraIssueKey string) (*models.JiraIssueMapping, error) {
	var mapping models.JiraIssueMapping
	query := `SELECT * FROM jira_issue_mappings WHERE tenant_id = $1 AND jira_config_id = $2 AND jira_issue_key = $3`

	err := r.db.GetContext(ctx, &mapping, query, tenantID, jiraConfigID, jiraIssueKey)
	if err != nil {
		return nil, err
	}
	return &mapping, nil
}

// Calendly Configuration operations
func (r *IntegrationRepository) CreateCalendlyConfiguration(ctx context.Context, config *models.CalendlyConfiguration) error {
	query := `
		INSERT INTO calendly_configurations (
			id, integration_id, tenant_id, organization_uri, user_uri, webhook_signing_key,
			auto_create_tickets, default_ticket_type, default_priority
		) VALUES (
			:id, :integration_id, :tenant_id, :organization_uri, :user_uri, :webhook_signing_key,
			:auto_create_tickets, :default_ticket_type, :default_priority
		)`

	_, err := r.db.NamedExecContext(ctx, query, config)
	return err
}

func (r *IntegrationRepository) GetCalendlyConfiguration(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.CalendlyConfiguration, error) {
	var config models.CalendlyConfiguration
	query := `SELECT * FROM calendly_configurations WHERE tenant_id = $1 AND integration_id = $2`

	err := r.db.GetContext(ctx, &config, query, tenantID, integrationID)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// Zapier Configuration operations
func (r *IntegrationRepository) CreateZapierConfiguration(ctx context.Context, config *models.ZapierConfiguration) error {
	query := `
		INSERT INTO zapier_configurations (
			id, integration_id, tenant_id, webhook_url, auth_method, auth_config,
			trigger_events, field_mappings, transform_settings
		) VALUES (
			:id, :integration_id, :tenant_id, :webhook_url, :auth_method, :auth_config,
			:trigger_events, :field_mappings, :transform_settings
		)`

	_, err := r.db.NamedExecContext(ctx, query, config)
	return err
}

func (r *IntegrationRepository) GetZapierConfiguration(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.ZapierConfiguration, error) {
	var config models.ZapierConfiguration
	query := `SELECT * FROM zapier_configurations WHERE tenant_id = $1 AND integration_id = $2`

	err := r.db.GetContext(ctx, &config, query, tenantID, integrationID)
	if err != nil {
		return nil, err
	}
	return &config, nil
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
