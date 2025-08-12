package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/bareuptime/tms/internal/models"
	"github.com/bareuptime/tms/internal/repo"
)

type IntegrationService struct {
	integrationRepo *repo.IntegrationRepository
	webhookService  *WebhookService
}

func NewIntegrationService(integrationRepo *repo.IntegrationRepository, webhookService *WebhookService) *IntegrationService {
	return &IntegrationService{
		integrationRepo: integrationRepo,
		webhookService:  webhookService,
	}
}

// Integration management
func (s *IntegrationService) CreateIntegration(ctx context.Context, tenantID, projectID uuid.UUID, req *models.CreateIntegrationRequest) (*models.Integration, error) {
	// Validate integration configuration based on type
	if err := s.validateIntegrationConfig(req.Type, req.Config); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	integration := &models.Integration{
		ID:            uuid.New(),
		TenantID:      tenantID,
		ProjectID:     projectID,
		Type:          req.Type,
		Name:          req.Name,
		Status:        models.IntegrationStatusConfiguring,
		Config:        req.Config,
		WebhookURL:    req.WebhookURL,
		WebhookSecret: req.WebhookSecret,
		RetryCount:    0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.integrationRepo.CreateIntegration(ctx, integration); err != nil {
		return nil, fmt.Errorf("failed to create integration: %w", err)
	}

	return integration, nil
}

func (s *IntegrationService) GetIntegration(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.Integration, error) {
	return s.integrationRepo.GetIntegrationByID(ctx, tenantID, integrationID)
}

func (s *IntegrationService) ListIntegrations(ctx context.Context, tenantID, projectID uuid.UUID, integrationType *models.IntegrationType, status *models.IntegrationStatus) ([]*models.Integration, error) {
	return s.integrationRepo.ListIntegrations(ctx, tenantID, projectID, integrationType, status)
}

func (s *IntegrationService) UpdateIntegration(ctx context.Context, tenantID, integrationID uuid.UUID, req *models.UpdateIntegrationRequest) (*models.Integration, error) {
	integration, err := s.integrationRepo.GetIntegrationByID(ctx, tenantID, integrationID)
	if err != nil {
		return nil, fmt.Errorf("integration not found: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		integration.Name = *req.Name
	}
	if req.Status != nil {
		integration.Status = *req.Status
	}
	if req.Config != nil {
		if err := s.validateIntegrationConfig(integration.Type, req.Config); err != nil {
			return nil, fmt.Errorf("invalid configuration: %w", err)
		}
		integration.Config = req.Config
	}
	if req.WebhookURL != nil {
		integration.WebhookURL = req.WebhookURL
	}
	if req.WebhookSecret != nil {
		integration.WebhookSecret = req.WebhookSecret
	}

	integration.UpdatedAt = time.Now()

	if err := s.integrationRepo.UpdateIntegration(ctx, integration); err != nil {
		return nil, fmt.Errorf("failed to update integration: %w", err)
	}

	return integration, nil
}

func (s *IntegrationService) DeleteIntegration(ctx context.Context, tenantID, integrationID uuid.UUID) error {
	return s.integrationRepo.DeleteIntegration(ctx, tenantID, integrationID)
}

func (s *IntegrationService) TestIntegration(ctx context.Context, tenantID, integrationID uuid.UUID) error {
	integration, err := s.integrationRepo.GetIntegrationByID(ctx, tenantID, integrationID)
	if err != nil {
		return fmt.Errorf("integration not found: %w", err)
	}

	switch integration.Type {
	case models.IntegrationTypeSlack:
		return s.testSlackIntegration(ctx, integration)
	case models.IntegrationTypeJira:
		return s.testJiraIntegration(ctx, integration)
	case models.IntegrationTypeCalendly:
		return s.testCalendlyIntegration(ctx, integration)
	case models.IntegrationTypeZapier:
		return s.testZapierIntegration(ctx, integration)
	case models.IntegrationTypeWebhook:
		return s.testWebhookIntegration(ctx, integration)
	default:
		return fmt.Errorf("testing not supported for integration type: %s", integration.Type)
	}
}

// Webhook subscription management
func (s *IntegrationService) CreateWebhookSubscription(ctx context.Context, tenantID, projectID uuid.UUID, req *models.CreateWebhookSubscriptionRequest) (*models.WebhookSubscription, error) {
	// Verify integration exists
	_, err := s.integrationRepo.GetIntegrationByID(ctx, tenantID, req.IntegrationID)
	if err != nil {
		return nil, fmt.Errorf("integration not found: %w", err)
	}

	subscription := &models.WebhookSubscription{
		ID:             uuid.New(),
		TenantID:       tenantID,
		ProjectID:      projectID,
		IntegrationID:  req.IntegrationID,
		WebhookURL:     req.WebhookURL,
		Events:         req.Events,
		Secret:         s.generateWebhookSecret(),
		IsActive:       true,
		RetryCount:     0,
		MaxRetries:     req.MaxRetries,
		TimeoutSeconds: req.TimeoutSeconds,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if subscription.MaxRetries == 0 {
		subscription.MaxRetries = 3
	}
	if subscription.TimeoutSeconds == 0 {
		subscription.TimeoutSeconds = 30
	}

	if err := s.integrationRepo.CreateWebhookSubscription(ctx, subscription); err != nil {
		return nil, fmt.Errorf("failed to create webhook subscription: %w", err)
	}

	return subscription, nil
}

func (s *IntegrationService) ListWebhookSubscriptions(ctx context.Context, tenantID, projectID uuid.UUID, integrationID *uuid.UUID) ([]*models.WebhookSubscription, error) {
	return s.integrationRepo.ListWebhookSubscriptions(ctx, tenantID, projectID, integrationID)
}

func (s *IntegrationService) DeliverWebhook(ctx context.Context, tenantID uuid.UUID, event models.WebhookEvent, payload interface{}) error {
	// Get all active webhook subscriptions for this event
	subscriptions, err := s.integrationRepo.ListWebhookSubscriptions(ctx, tenantID, uuid.Nil, nil)
	if err != nil {
		return fmt.Errorf("failed to get webhook subscriptions: %w", err)
	}

	for _, subscription := range subscriptions {
		if !subscription.IsActive {
			continue
		}

		// Check if subscription includes this event
		eventIncluded := false
		for _, subscribedEvent := range subscription.Events {
			if subscribedEvent == string(event) {
				eventIncluded = true
				break
			}
		}

		if !eventIncluded {
			continue
		}

		// Create delivery record
		payloadMap, ok := payload.(models.JSONMap)
		if !ok {
			// Convert to JSONMap if not already
			payloadMap = models.JSONMap{"data": payload}
		}
		
		delivery := &models.WebhookDelivery{
			ID:             uuid.New(),
			TenantID:       tenantID,
			ProjectID:      subscription.ProjectID,
			SubscriptionID: subscription.ID,
			EventType:      event,
			Payload:        payloadMap,
			DeliveryAttempt: 1,
			CreatedAt:      time.Now(),
		}

		// Attempt delivery
		if err := s.webhookService.DeliverWebhook(ctx, subscription, delivery); err != nil {
			// Log error but continue with other subscriptions
			fmt.Printf("Failed to deliver webhook to %s: %v\n", subscription.WebhookURL, err)
		}
	}

	return nil
}

// Integration-specific configuration methods
func (s *IntegrationService) CreateSlackConfiguration(ctx context.Context, tenantID uuid.UUID, req *models.CreateSlackConfigurationRequest) (*models.SlackConfiguration, error) {
	config := &models.SlackConfiguration{
		ID:                   uuid.New(),
		IntegrationID:        req.IntegrationID,
		TenantID:             tenantID,
		BotToken:             req.BotToken,
		TeamID:               req.TeamID,
		TeamName:             req.TeamName,
		BotUserID:            req.BotUserID,
		DefaultChannel:       req.DefaultChannel,
		NotificationSettings: req.NotificationSettings,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	if err := s.integrationRepo.CreateSlackConfiguration(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create Slack configuration: %w", err)
	}

	return config, nil
}

func (s *IntegrationService) CreateJiraConfiguration(ctx context.Context, tenantID uuid.UUID, req *models.CreateJiraConfigurationRequest) (*models.JiraConfiguration, error) {
	config := &models.JiraConfiguration{
		ID:            uuid.New(),
		IntegrationID: req.IntegrationID,
		TenantID:      tenantID,
		InstanceURL:   req.InstanceURL,
		ProjectKey:    req.ProjectKey,
		IssueType:     req.IssueType,
		FieldMappings: req.FieldMappings,
		SyncSettings:  req.SyncSettings,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.integrationRepo.CreateJiraConfiguration(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create JIRA configuration: %w", err)
	}

	return config, nil
}

func (s *IntegrationService) CreateCalendlyConfiguration(ctx context.Context, tenantID uuid.UUID, req *models.CreateCalendlyConfigurationRequest) (*models.CalendlyConfiguration, error) {
	config := &models.CalendlyConfiguration{
		ID:                req.IntegrationID, // Use integration ID as primary key
		IntegrationID:     req.IntegrationID,
		TenantID:          tenantID,
		OrganizationURI:   req.OrganizationURI,
		UserURI:           req.UserURI,
		WebhookSigningKey: req.WebhookSigningKey,
		AutoCreateTickets: req.AutoCreateTickets,
		DefaultTicketType: req.DefaultTicketType,
		DefaultPriority:   req.DefaultPriority,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.integrationRepo.CreateCalendlyConfiguration(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create Calendly configuration: %w", err)
	}

	return config, nil
}

func (s *IntegrationService) CreateZapierConfiguration(ctx context.Context, tenantID uuid.UUID, req *models.CreateZapierConfigurationRequest) (*models.ZapierConfiguration, error) {
	config := &models.ZapierConfiguration{
		ID:                uuid.New(),
		IntegrationID:     req.IntegrationID,
		TenantID:          tenantID,
		WebhookURL:        req.WebhookURL,
		AuthMethod:        req.AuthMethod,
		AuthConfig:        req.AuthConfig,
		TriggerEvents:     req.TriggerEvents,
		FieldMappings:     req.FieldMappings,
		TransformSettings: req.TransformSettings,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.integrationRepo.CreateZapierConfiguration(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create Zapier configuration: %w", err)
	}

	return config, nil
}

// Sync logging
func (s *IntegrationService) LogSync(ctx context.Context, tenantID, projectID, integrationID uuid.UUID, operation, status string, externalID *string, requestPayload, responsePayload interface{}, errorMsg *string, durationMs *int) error {
	var reqPayload, respPayload models.JSONMap
	
	if requestPayload != nil {
		if reqMap, ok := requestPayload.(models.JSONMap); ok {
			reqPayload = reqMap
		} else {
			reqPayload = models.JSONMap{"data": requestPayload}
		}
	}
	
	if responsePayload != nil {
		if respMap, ok := responsePayload.(models.JSONMap); ok {
			respPayload = respMap
		} else {
			respPayload = models.JSONMap{"data": responsePayload}
		}
	}

	log := &models.IntegrationSyncLog{
		ID:              uuid.New(),
		TenantID:        tenantID,
		ProjectID:       projectID,
		IntegrationID:   integrationID,
		Operation:       operation,
		Status:          status,
		ExternalID:      externalID,
		RequestPayload:  reqPayload,
		ResponsePayload: respPayload,
		ErrorMessage:    errorMsg,
		DurationMs:      durationMs,
		CreatedAt:       time.Now(),
	}

	return s.integrationRepo.CreateIntegrationSyncLog(ctx, log)
}

// Private helper methods
func (s *IntegrationService) validateIntegrationConfig(integrationType models.IntegrationType, config models.JSONMap) error {
	// Add validation logic based on integration type
	switch integrationType {
	case models.IntegrationTypeSlack:
		return s.validateSlackConfig(config)
	case models.IntegrationTypeJira:
		return s.validateJiraConfig(config)
	case models.IntegrationTypeCalendly:
		return s.validateCalendlyConfig(config)
	case models.IntegrationTypeZapier:
		return s.validateZapierConfig(config)
	case models.IntegrationTypeWebhook:
		return s.validateWebhookConfig(config)
	default:
		return nil // Allow custom integrations with any config
	}
}

func (s *IntegrationService) validateSlackConfig(config models.JSONMap) error {
	// Validate Slack-specific configuration
	return nil
}

func (s *IntegrationService) validateJiraConfig(config models.JSONMap) error {
	// Validate JIRA-specific configuration
	return nil
}

func (s *IntegrationService) validateCalendlyConfig(config models.JSONMap) error {
	// Validate Calendly-specific configuration
	return nil
}

func (s *IntegrationService) validateZapierConfig(config models.JSONMap) error {
	// Validate Zapier-specific configuration
	return nil
}

func (s *IntegrationService) validateWebhookConfig(config models.JSONMap) error {
	// Validate webhook-specific configuration
	return nil
}

func (s *IntegrationService) testSlackIntegration(ctx context.Context, integration *models.Integration) error {
	// Implement Slack API test
	return nil
}

func (s *IntegrationService) testJiraIntegration(ctx context.Context, integration *models.Integration) error {
	// Implement JIRA API test
	return nil
}

func (s *IntegrationService) testCalendlyIntegration(ctx context.Context, integration *models.Integration) error {
	// Implement Calendly API test
	return nil
}

func (s *IntegrationService) testZapierIntegration(ctx context.Context, integration *models.Integration) error {
	// Implement Zapier webhook test
	return nil
}

func (s *IntegrationService) testWebhookIntegration(ctx context.Context, integration *models.Integration) error {
	// Implement webhook test
	return nil
}

func (s *IntegrationService) generateWebhookSecret() string {
	// Generate a secure random secret for webhook verification
	return uuid.New().String()
}

// New methods for enhanced integration system

// Integration Templates and Categories
func (s *IntegrationService) ListCategoriesWithTemplates(ctx context.Context, featured *bool) ([]*models.IntegrationCategoryWithTemplates, error) {
	return s.integrationRepo.ListCategoriesWithTemplates(ctx, featured)
}

func (s *IntegrationService) ListIntegrationTemplates(ctx context.Context, categoryID *uuid.UUID, featured *bool) ([]*models.IntegrationTemplate, error) {
	return s.integrationRepo.ListIntegrationTemplates(ctx, categoryID, featured)
}

func (s *IntegrationService) GetIntegrationTemplateByType(ctx context.Context, integrationType models.IntegrationType) (*models.IntegrationTemplate, error) {
	return s.integrationRepo.GetIntegrationTemplateByType(ctx, integrationType)
}

// OAuth Flow Management
func (s *IntegrationService) StartOAuthFlow(ctx context.Context, tenantID, projectID uuid.UUID, integrationType models.IntegrationType, redirectURL *string) (string, string, error) {
	// Generate state token for OAuth flow
	stateToken := uuid.New().String()
	
	// Create OAuth flow record
	flow := &models.OAuthFlow{
		ID:              uuid.New(),
		TenantID:        tenantID,
		ProjectID:       projectID,
		IntegrationType: integrationType,
		StateToken:      stateToken,
		RedirectURL:     redirectURL,
		ExpiresAt:       time.Now().Add(15 * time.Minute), // 15 minutes expiry
		CreatedAt:       time.Now(),
	}

	if err := s.integrationRepo.CreateOAuthFlow(ctx, flow); err != nil {
		return "", "", fmt.Errorf("failed to create OAuth flow: %w", err)
	}

	// Generate OAuth URL based on integration type
	oauthURL, err := s.generateOAuthURL(integrationType, stateToken, redirectURL)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate OAuth URL: %w", err)
	}

	return oauthURL, stateToken, nil
}

func (s *IntegrationService) HandleOAuthCallback(ctx context.Context, integrationType models.IntegrationType, code, state string) (*models.Integration, error) {
	// Get OAuth flow by state token
	flow, err := s.integrationRepo.GetOAuthFlowByState(ctx, state)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired OAuth state: %w", err)
	}

	// Check if flow has expired
	if time.Now().After(flow.ExpiresAt) {
		// Clean up expired flow
		s.integrationRepo.DeleteOAuthFlow(ctx, state)
		return nil, fmt.Errorf("OAuth flow has expired")
	}

	// Exchange code for access token
	authData, err := s.exchangeOAuthCode(ctx, integrationType, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange OAuth code: %w", err)
	}

	// Get integration template for default configuration
	template, err := s.GetIntegrationTemplateByType(ctx, integrationType)
	if err != nil {
		return nil, fmt.Errorf("failed to get integration template: %w", err)
	}

	// Create integration with OAuth data
	integration := &models.Integration{
		ID:         uuid.New(),
		TenantID:   flow.TenantID,
		ProjectID:  flow.ProjectID,
		Type:       integrationType,
		Name:       template.DisplayName,
		Status:     models.IntegrationStatusActive,
		Config:     template.DefaultConfig,
		AuthMethod: models.AuthMethodOAuth,
		AuthData:   authData,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.integrationRepo.CreateIntegration(ctx, integration); err != nil {
		return nil, fmt.Errorf("failed to create integration: %w", err)
	}

	// Clean up OAuth flow
	s.integrationRepo.DeleteOAuthFlow(ctx, state)

	return integration, nil
}

// Enhanced integration listing with template information
func (s *IntegrationService) ListIntegrationsWithTemplates(ctx context.Context, tenantID, projectID uuid.UUID, integrationType *models.IntegrationType, status *models.IntegrationStatus) ([]*models.IntegrationWithTemplate, error) {
	return s.integrationRepo.ListIntegrationsWithTemplates(ctx, tenantID, projectID, integrationType, status)
}

// Integration Metrics
func (s *IntegrationService) GetIntegrationMetrics(ctx context.Context, tenantID, integrationID uuid.UUID) (*models.IntegrationMetrics, error) {
	// This would typically query a metrics store or aggregate from logs
	// For now, return a placeholder implementation
	metrics := &models.IntegrationMetrics{
		IntegrationID:      integrationID,
		TotalRequests:      0,
		SuccessfulRequests: 0,
		FailedRequests:     0,
		AverageLatencyMs:   0.0,
		ErrorRate:          0.0,
	}

	// TODO: Implement actual metrics collection from webhook logs, sync logs, etc.
	return metrics, nil
}

// OAuth helper methods
func (s *IntegrationService) generateOAuthURL(integrationType models.IntegrationType, state string, redirectURL *string) (string, error) {
	switch integrationType {
	case models.IntegrationTypeSlack:
		return s.generateSlackOAuthURL(state, redirectURL), nil
	case models.IntegrationTypeJira:
		return s.generateJiraOAuthURL(state, redirectURL), nil
	case models.IntegrationTypeGitHub:
		return s.generateGitHubOAuthURL(state, redirectURL), nil
	case models.IntegrationTypeLinear:
		return s.generateLinearOAuthURL(state, redirectURL), nil
	case models.IntegrationTypeCalendly:
		return s.generateCalendlyOAuthURL(state, redirectURL), nil
	default:
		return "", fmt.Errorf("OAuth not supported for integration type: %s", integrationType)
	}
}

func (s *IntegrationService) exchangeOAuthCode(ctx context.Context, integrationType models.IntegrationType, code string) (models.JSONMap, error) {
	switch integrationType {
	case models.IntegrationTypeSlack:
		return s.exchangeSlackOAuthCode(ctx, code)
	case models.IntegrationTypeJira:
		return s.exchangeJiraOAuthCode(ctx, code)
	case models.IntegrationTypeGitHub:
		return s.exchangeGitHubOAuthCode(ctx, code)
	case models.IntegrationTypeLinear:
		return s.exchangeLinearOAuthCode(ctx, code)
	case models.IntegrationTypeCalendly:
		return s.exchangeCalendlyOAuthCode(ctx, code)
	default:
		return nil, fmt.Errorf("OAuth not supported for integration type: %s", integrationType)
	}
}

// Provider-specific OAuth URL generators (placeholder implementations)
func (s *IntegrationService) generateSlackOAuthURL(state string, redirectURL *string) string {
	// TODO: Implement actual Slack OAuth URL generation
	return fmt.Sprintf("https://slack.com/oauth/v2/authorize?client_id=CLIENT_ID&scope=chat:write,channels:read&state=%s", state)
}

func (s *IntegrationService) generateJiraOAuthURL(state string, redirectURL *string) string {
	// TODO: Implement actual Jira OAuth URL generation
	return fmt.Sprintf("https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=CLIENT_ID&scope=read:jira-work&state=%s", state)
}

func (s *IntegrationService) generateGitHubOAuthURL(state string, redirectURL *string) string {
	// TODO: Implement actual GitHub OAuth URL generation
	return fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=CLIENT_ID&scope=repo,issues&state=%s", state)
}

func (s *IntegrationService) generateLinearOAuthURL(state string, redirectURL *string) string {
	// TODO: Implement actual Linear OAuth URL generation
	return fmt.Sprintf("https://linear.app/oauth/authorize?client_id=CLIENT_ID&scope=read,write&state=%s", state)
}

func (s *IntegrationService) generateCalendlyOAuthURL(state string, redirectURL *string) string {
	// TODO: Implement actual Calendly OAuth URL generation
	return fmt.Sprintf("https://auth.calendly.com/oauth/authorize?client_id=CLIENT_ID&scope=default&state=%s", state)
}

// Provider-specific OAuth code exchange (placeholder implementations)
func (s *IntegrationService) exchangeSlackOAuthCode(ctx context.Context, code string) (models.JSONMap, error) {
	// TODO: Implement actual Slack OAuth token exchange
	return models.JSONMap{
		"access_token": "xoxb-example-token",
		"team_id":      "T1234567890",
		"team_name":    "Example Team",
		"bot_user_id":  "U1234567890",
	}, nil
}

func (s *IntegrationService) exchangeJiraOAuthCode(ctx context.Context, code string) (models.JSONMap, error) {
	// TODO: Implement actual Jira OAuth token exchange
	return models.JSONMap{
		"access_token":  "example-access-token",
		"refresh_token": "example-refresh-token",
		"expires_in":    3600,
		"site_url":      "https://example.atlassian.net",
	}, nil
}

func (s *IntegrationService) exchangeGitHubOAuthCode(ctx context.Context, code string) (models.JSONMap, error) {
	// TODO: Implement actual GitHub OAuth token exchange
	return models.JSONMap{
		"access_token": "gho_example-token",
		"token_type":   "bearer",
		"scope":        "repo,issues",
	}, nil
}

func (s *IntegrationService) exchangeLinearOAuthCode(ctx context.Context, code string) (models.JSONMap, error) {
	// TODO: Implement actual Linear OAuth token exchange
	return models.JSONMap{
		"access_token": "lin_api_example-token",
		"token_type":   "Bearer",
		"expires_in":   86400,
	}, nil
}

func (s *IntegrationService) exchangeCalendlyOAuthCode(ctx context.Context, code string) (models.JSONMap, error) {
	// TODO: Implement actual Calendly OAuth token exchange
	return models.JSONMap{
		"access_token":  "example-access-token",
		"refresh_token": "example-refresh-token",
		"expires_in":    3600,
		"owner":         "https://api.calendly.com/users/AAAAAAAAAAAAAAAA",
	}, nil
}
