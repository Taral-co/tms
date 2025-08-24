-- +goose Up
-- +goose StatementBegin

-- Integration types supported by the system
CREATE TYPE integration_type AS ENUM ('slack', 'jira', 'calendly', 'zapier', 'webhook', 'custom');

-- OAuth provider types (add new providers to existing oauth_provider enum if it exists)
DO $$ BEGIN
    CREATE TYPE oauth_provider AS ENUM ('google', 'microsoft', 'slack', 'jira', 'custom');
EXCEPTION
    WHEN duplicate_object THEN
        -- Add new values to existing enum if they don't exist
        ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'slack';
        ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'jira';
        ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'custom';
END $$;

-- Integration status
CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error', 'configuring');

-- Webhook event types
CREATE TYPE webhook_event AS ENUM (
    'ticket.created', 'ticket.updated', 'ticket.status_changed',
    'message.created', 'message.updated',
    'agent.assigned', 'agent.unassigned',
    'escalation.triggered', 'sla.breached'
);

-- Integration configurations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type integration_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    status integration_status NOT NULL DEFAULT 'configuring',
    config JSONB NOT NULL DEFAULT '{}', -- Integration-specific configuration
    oauth_token_id UUID, -- References oauth_tokens table
    webhook_url TEXT, -- For webhook-based integrations
    webhook_secret VARCHAR(255), -- Secret for webhook verification
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_integration_per_project UNIQUE(tenant_id, project_id, type, name)
);

-- Add foreign key constraint for oauth_token_id to existing oauth_tokens table
ALTER TABLE integrations ADD CONSTRAINT fk_integrations_oauth_token_id 
    FOREIGN KEY (oauth_token_id) REFERENCES oauth_tokens(id) ON DELETE SET NULL;

-- Webhook subscriptions for external services
CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    events webhook_event[] NOT NULL,
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_type webhook_event NOT NULL,
    payload JSONB NOT NULL,
    request_headers JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    delivery_attempt INTEGER NOT NULL DEFAULT 1,
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integration sync logs for tracking external sync operations
CREATE TABLE integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL, -- 'sync_tickets', 'create_issue', 'update_status', etc.
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'pending'
    external_id VARCHAR(255), -- ID in external system
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slack-specific configurations
CREATE TABLE slack_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bot_token TEXT NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    team_name VARCHAR(255),
    bot_user_id VARCHAR(255),
    default_channel VARCHAR(255), -- Default channel for notifications
    notification_settings JSONB NOT NULL DEFAULT '{}', -- Which events to notify about
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(integration_id)
);

-- Slack channel mappings for project-specific notifications
CREATE TABLE slack_channel_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slack_config_id UUID NOT NULL REFERENCES slack_configurations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255),
    events webhook_event[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_slack_channel_mapping UNIQUE(slack_config_id, project_id)
);

-- JIRA-specific configurations
CREATE TABLE jira_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    instance_url TEXT NOT NULL,
    project_key VARCHAR(100) NOT NULL,
    issue_type VARCHAR(100) NOT NULL DEFAULT 'Task',
    field_mappings JSONB NOT NULL DEFAULT '{}', -- Maps TMS fields to JIRA fields
    sync_settings JSONB NOT NULL DEFAULT '{}', -- Bidirectional sync configuration
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(integration_id)
);

-- JIRA issue mappings for tracking linked tickets
CREATE TABLE jira_issue_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jira_config_id UUID NOT NULL REFERENCES jira_configurations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    jira_issue_key VARCHAR(255) NOT NULL,
    jira_issue_id VARCHAR(255) NOT NULL,
    sync_direction VARCHAR(50) NOT NULL DEFAULT 'bidirectional', -- 'to_jira', 'from_jira', 'bidirectional'
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(jira_config_id, ticket_id),
    UNIQUE(jira_config_id, jira_issue_key)
);

-- Calendly-specific configurations
CREATE TABLE calendly_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_uri TEXT NOT NULL,
    user_uri TEXT,
    webhook_signing_key TEXT,
    auto_create_tickets BOOLEAN NOT NULL DEFAULT FALSE,
    default_ticket_type ticket_type NOT NULL DEFAULT 'question',
    default_priority ticket_priority NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(integration_id)
);

-- Calendly event mappings for tracking scheduled meetings
CREATE TABLE calendly_event_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calendly_config_id UUID NOT NULL REFERENCES calendly_configurations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    calendly_event_uuid VARCHAR(255) NOT NULL,
    event_type_uuid VARCHAR(255),
    meeting_start_time TIMESTAMPTZ,
    meeting_end_time TIMESTAMPTZ,
    invitee_email VARCHAR(255),
    invitee_name VARCHAR(255),
    meeting_status VARCHAR(50), -- 'scheduled', 'canceled', 'completed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(calendly_config_id, calendly_event_uuid)
);

-- Zapier-specific configurations (webhook-based)
CREATE TABLE zapier_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    auth_method VARCHAR(50) NOT NULL DEFAULT 'api_key', -- 'api_key', 'basic', 'oauth'
    auth_config JSONB NOT NULL DEFAULT '{}',
    trigger_events webhook_event[] NOT NULL,
    field_mappings JSONB NOT NULL DEFAULT '{}',
    transform_settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(integration_id)
);

-- Indexes for performance
CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX idx_integrations_project_id ON integrations(project_id);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_last_sync_at ON integrations(last_sync_at);

CREATE INDEX idx_webhook_subscriptions_integration_id ON webhook_subscriptions(integration_id);
CREATE INDEX idx_webhook_subscriptions_is_active ON webhook_subscriptions(is_active);

CREATE INDEX idx_webhook_deliveries_subscription_id ON webhook_deliveries(subscription_id);
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);
CREATE INDEX idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at);

CREATE INDEX idx_integration_sync_logs_integration_id ON integration_sync_logs(integration_id);
CREATE INDEX idx_integration_sync_logs_operation ON integration_sync_logs(operation);
CREATE INDEX idx_integration_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX idx_integration_sync_logs_created_at ON integration_sync_logs(created_at);

CREATE INDEX idx_slack_configurations_team_id ON slack_configurations(team_id);
CREATE INDEX idx_slack_channel_mappings_project_id ON slack_channel_mappings(project_id);
CREATE INDEX idx_slack_channel_mappings_is_active ON slack_channel_mappings(is_active);

CREATE INDEX idx_jira_configurations_project_key ON jira_configurations(project_key);
CREATE INDEX idx_jira_issue_mappings_ticket_id ON jira_issue_mappings(ticket_id);
CREATE INDEX idx_jira_issue_mappings_jira_issue_key ON jira_issue_mappings(jira_issue_key);

CREATE INDEX idx_calendly_event_mappings_ticket_id ON calendly_event_mappings(ticket_id);
CREATE INDEX idx_calendly_event_mappings_event_uuid ON calendly_event_mappings(calendly_event_uuid);
CREATE INDEX idx_calendly_event_mappings_meeting_start_time ON calendly_event_mappings(meeting_start_time);

CREATE INDEX idx_integration_rate_limits_integration_id ON integration_rate_limits(integration_id);
CREATE INDEX idx_integration_rate_limits_minute_reset_at ON integration_rate_limits(minute_reset_at);
CREATE INDEX idx_integration_rate_limits_hour_reset_at ON integration_rate_limits(hour_reset_at);

-- Row Level Security policies
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_issue_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendly_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendly_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY integrations_tenant_policy ON integrations
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY webhook_subscriptions_tenant_policy ON webhook_subscriptions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY webhook_deliveries_tenant_policy ON webhook_deliveries
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY integration_sync_logs_tenant_policy ON integration_sync_logs
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY slack_configurations_tenant_policy ON slack_configurations
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY slack_channel_mappings_tenant_policy ON slack_channel_mappings
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY jira_configurations_tenant_policy ON jira_configurations
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY jira_issue_mappings_tenant_policy ON jira_issue_mappings
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY calendly_configurations_tenant_policy ON calendly_configurations
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY calendly_event_mappings_tenant_policy ON calendly_event_mappings
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY zapier_configurations_tenant_policy ON zapier_configurations
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY integration_rate_limits_tenant_policy ON integration_rate_limits
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_webhook_subscriptions_updated_at
    BEFORE UPDATE ON webhook_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_slack_configurations_updated_at
    BEFORE UPDATE ON slack_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_jira_configurations_updated_at
    BEFORE UPDATE ON jira_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_calendly_configurations_updated_at
    BEFORE UPDATE ON calendly_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_zapier_configurations_updated_at
    BEFORE UPDATE ON zapier_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_zapier_configurations_updated_at ON zapier_configurations;
DROP TRIGGER IF EXISTS trigger_calendly_configurations_updated_at ON calendly_configurations;
DROP TRIGGER IF EXISTS trigger_jira_configurations_updated_at ON jira_configurations;
DROP TRIGGER IF EXISTS trigger_slack_configurations_updated_at ON slack_configurations;
DROP TRIGGER IF EXISTS trigger_webhook_subscriptions_updated_at ON webhook_subscriptions;
DROP TRIGGER IF EXISTS trigger_oauth_tokens_updated_at ON oauth_tokens;
DROP TRIGGER IF EXISTS trigger_integrations_updated_at ON integrations;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS integration_rate_limits;
DROP TABLE IF EXISTS zapier_configurations;
DROP TABLE IF EXISTS calendly_event_mappings;
DROP TABLE IF EXISTS calendly_configurations;
DROP TABLE IF EXISTS jira_issue_mappings;
DROP TABLE IF EXISTS jira_configurations;
DROP TABLE IF EXISTS slack_channel_mappings;
DROP TABLE IF EXISTS slack_configurations;
DROP TABLE IF EXISTS integration_sync_logs;
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhook_subscriptions;
DROP TABLE IF EXISTS integrations;
DROP TABLE IF EXISTS oauth_tokens;

-- Drop types
DROP TYPE IF EXISTS webhook_event;
DROP TYPE IF EXISTS integration_status;
DROP TYPE IF EXISTS oauth_provider;
DROP TYPE IF EXISTS integration_type;

-- +goose StatementEnd
