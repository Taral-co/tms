-- +goose Up
-- +goose StatementBegin

-- Update the integrations table to follow the generic schema approach
-- Add auth_method and auth_data columns for OAuth and API key management
ALTER TABLE integrations 
ADD COLUMN auth_method TEXT CHECK (auth_method IN ('oauth', 'api_key', 'none')) DEFAULT 'none',
ADD COLUMN auth_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Comment on the new columns
COMMENT ON COLUMN integrations.auth_method IS 'Authentication method: oauth (preferred), api_key (fallback), or none';
COMMENT ON COLUMN integrations.auth_data IS 'Encrypted authentication data: tokens, keys, OAuth metadata';

-- Add more integration types to support 100s of providers
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'microsoft_teams';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'github';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'linear';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'asana';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'trello';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'monday';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'notion';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'airtable';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'hubspot';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'salesforce';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'zendesk';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'freshdesk';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'intercom';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'crisp';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'discord';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'telegram';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'google_drive';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'dropbox';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'box';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'onedrive';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'aws_s3';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'azure_storage';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'google_cloud_storage';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'stripe';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'paypal';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'square';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'twilio';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'sendgrid';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'mailchimp';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'constant_contact';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'google_calendar';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'outlook_calendar';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'zoom';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'google_meet';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'microsoft_teams_meeting';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'shopify';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'woocommerce';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'magento';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'bigcommerce';

-- Update OAuth provider types to support more providers
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'github';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'linear';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'asana';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'trello';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'notion';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'hubspot';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'salesforce';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'zendesk';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'freshdesk';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'intercom';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'discord';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'stripe';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'shopify';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'zoom';
ALTER TYPE oauth_provider ADD VALUE IF NOT EXISTS 'calendly';

-- Create integration categories table for better organization
CREATE TABLE integration_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Icon identifier for UI
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO integration_categories (name, display_name, description, icon, sort_order) VALUES
('communication', 'Communication', 'Chat platforms, messaging, and team collaboration tools', 'message-circle', 10),
('project_management', 'Project Management', 'Task tracking, project planning, and workflow tools', 'folder', 20),
('crm_sales', 'CRM & Sales', 'Customer relationship management and sales tools', 'users', 30),
('support_helpdesk', 'Support & Helpdesk', 'Customer support and help desk platforms', 'headphones', 40),
('calendar_scheduling', 'Calendar & Scheduling', 'Calendar integration and appointment scheduling', 'calendar', 50),
('file_storage', 'File Storage', 'Cloud storage and file sharing services', 'cloud', 60),
('payment_billing', 'Payment & Billing', 'Payment processing and billing systems', 'credit-card', 70),
('email_marketing', 'Email & Marketing', 'Email marketing and automation platforms', 'mail', 80),
('development', 'Development', 'Code repositories, development tools, and DevOps', 'code', 90),
('ecommerce', 'E-commerce', 'Online stores and e-commerce platforms', 'shopping-cart', 100),
('automation', 'Automation', 'Workflow automation and integration platforms', 'zap', 110),
('analytics', 'Analytics', 'Analytics and reporting tools', 'bar-chart', 120),
('social_media', 'Social Media', 'Social media platforms and management tools', 'share-2', 130),
('custom', 'Custom & Webhooks', 'Custom integrations and webhook endpoints', 'settings', 140);

-- Create integration templates table for predefined configurations
CREATE TABLE integration_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES integration_categories(id) ON DELETE CASCADE,
    type integration_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT, -- URL to provider logo
    website_url TEXT, -- Provider website
    documentation_url TEXT, -- Integration documentation
    auth_method TEXT CHECK (auth_method IN ('oauth', 'api_key', 'none')) NOT NULL,
    config_schema JSONB NOT NULL DEFAULT '{}', -- JSON schema for configuration
    default_config JSONB NOT NULL DEFAULT '{}', -- Default configuration values
    supported_events TEXT[] NOT NULL DEFAULT '{}', -- Supported webhook events
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(type)
);

-- Insert integration templates for popular providers
INSERT INTO integration_templates (category_id, type, name, display_name, description, auth_method, supported_events, is_featured, sort_order) VALUES
-- Communication
((SELECT id FROM integration_categories WHERE name = 'communication'), 'slack', 'slack', 'Slack', 'Send notifications and manage tickets through Slack channels', 'oauth', ARRAY['ticket.created', 'ticket.updated', 'message.created'], true, 10),
((SELECT id FROM integration_categories WHERE name = 'communication'), 'microsoft_teams', 'microsoft_teams', 'Microsoft Teams', 'Integrate with Microsoft Teams for notifications and collaboration', 'oauth', ARRAY['ticket.created', 'ticket.updated', 'message.created'], true, 20),
((SELECT id FROM integration_categories WHERE name = 'communication'), 'discord', 'discord', 'Discord', 'Send notifications to Discord channels', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 30),

-- Project Management  
((SELECT id FROM integration_categories WHERE name = 'project_management'), 'jira', 'jira', 'Jira', 'Sync tickets with Jira issues for project tracking', 'oauth', ARRAY['ticket.created', 'ticket.updated', 'ticket.status_changed'], true, 10),
((SELECT id FROM integration_categories WHERE name = 'project_management'), 'linear', 'linear', 'Linear', 'Create and sync issues with Linear project management', 'oauth', ARRAY['ticket.created', 'ticket.updated'], true, 20),
((SELECT id FROM integration_categories WHERE name = 'project_management'), 'asana', 'asana', 'Asana', 'Track tickets as tasks in Asana projects', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 30),
((SELECT id FROM integration_categories WHERE name = 'project_management'), 'trello', 'trello', 'Trello', 'Create Trello cards from support tickets', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 40),
((SELECT id FROM integration_categories WHERE name = 'project_management'), 'notion', 'notion', 'Notion', 'Log tickets and updates in Notion databases', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 50),

-- Calendar & Scheduling
((SELECT id FROM integration_categories WHERE name = 'calendar_scheduling'), 'calendly', 'calendly', 'Calendly', 'Create tickets from Calendly appointments and meetings', 'oauth', ARRAY['ticket.created'], true, 10),
((SELECT id FROM integration_categories WHERE name = 'calendar_scheduling'), 'google_calendar', 'google_calendar', 'Google Calendar', 'Schedule follow-ups and meetings directly from tickets', 'oauth', ARRAY['ticket.updated'], false, 20),
((SELECT id FROM integration_categories WHERE name = 'calendar_scheduling'), 'outlook_calendar', 'outlook_calendar', 'Outlook Calendar', 'Integrate with Outlook for meeting scheduling', 'oauth', ARRAY['ticket.updated'], false, 30),

-- Automation
((SELECT id FROM integration_categories WHERE name = 'automation'), 'zapier', 'zapier', 'Zapier', 'Connect with 1000+ apps through Zapier automation', 'api_key', ARRAY['ticket.created', 'ticket.updated', 'ticket.status_changed', 'message.created'], true, 10),
((SELECT id FROM integration_categories WHERE name = 'automation'), 'webhook', 'webhook', 'Custom Webhooks', 'Send data to any external service via HTTP webhooks', 'api_key', ARRAY['ticket.created', 'ticket.updated', 'ticket.status_changed', 'message.created', 'agent.assigned'], false, 20),

-- Development
((SELECT id FROM integration_categories WHERE name = 'development'), 'github', 'github', 'GitHub', 'Link tickets to GitHub issues and pull requests', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 10),

-- Support & Helpdesk
((SELECT id FROM integration_categories WHERE name = 'support_helpdesk'), 'zendesk', 'zendesk', 'Zendesk', 'Migrate or sync tickets with Zendesk', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 10),
((SELECT id FROM integration_categories WHERE name = 'support_helpdesk'), 'freshdesk', 'freshdesk', 'Freshdesk', 'Integrate with Freshdesk for ticket synchronization', 'oauth', ARRAY['ticket.created', 'ticket.updated'], false, 20),
((SELECT id FROM integration_categories WHERE name = 'support_helpdesk'), 'intercom', 'intercom', 'Intercom', 'Sync conversations and customer data with Intercom', 'oauth', ARRAY['ticket.created', 'message.created'], false, 30);

-- Create OAuth flow states table for tracking OAuth processes
CREATE TABLE oauth_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_type integration_type NOT NULL,
    state_token VARCHAR(255) NOT NULL UNIQUE,
    redirect_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX idx_integration_categories_sort_order ON integration_categories(sort_order);
CREATE INDEX idx_integration_categories_is_active ON integration_categories(is_active);

CREATE INDEX idx_integration_templates_category_id ON integration_templates(category_id);
CREATE INDEX idx_integration_templates_type ON integration_templates(type);
CREATE INDEX idx_integration_templates_is_featured ON integration_templates(is_featured);
CREATE INDEX idx_integration_templates_is_active ON integration_templates(is_active);
CREATE INDEX idx_integration_templates_sort_order ON integration_templates(sort_order);

CREATE INDEX idx_oauth_flows_tenant_id ON oauth_flows(tenant_id);
CREATE INDEX idx_oauth_flows_state_token ON oauth_flows(state_token);
CREATE INDEX idx_oauth_flows_expires_at ON oauth_flows(expires_at);

-- Add new indexes for auth columns
CREATE INDEX idx_integrations_auth_method ON integrations(auth_method);

-- RLS for new tables
ALTER TABLE integration_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies (categories and templates are global, oauth_flows are tenant-scoped)
CREATE POLICY integration_categories_public_policy ON integration_categories
    USING (TRUE); -- Categories are publicly readable

CREATE POLICY integration_templates_public_policy ON integration_templates
    USING (TRUE); -- Templates are publicly readable

CREATE POLICY oauth_flows_tenant_policy ON oauth_flows
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Triggers for updated_at
CREATE TRIGGER trigger_integration_templates_updated_at
    BEFORE UPDATE ON integration_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_integration_templates_updated_at ON integration_templates;

-- Drop tables
DROP TABLE IF EXISTS oauth_flows;
DROP TABLE IF EXISTS integration_templates;
DROP TABLE IF EXISTS integration_categories;

-- Remove new columns
ALTER TABLE integrations DROP COLUMN IF EXISTS auth_data;
ALTER TABLE integrations DROP COLUMN IF EXISTS auth_method;

-- Note: We don't drop enum values as PostgreSQL doesn't support it easily
-- The enum values will remain but won't be used

-- +goose StatementEnd
