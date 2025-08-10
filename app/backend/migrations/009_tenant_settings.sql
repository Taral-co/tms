-- +goose Up
-- +goose StatementBegin

-- Create settings table for tenant-level configuration
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

-- Create index for faster lookups
CREATE INDEX idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, setting_key);

-- Insert default settings for existing tenants
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT 
    t.id as tenant_id,
    'email_settings' as setting_key,
    jsonb_build_object(
        'smtp_host', '',
        'smtp_port', 587,
        'smtp_username', '',
        'smtp_password', '',
        'smtp_encryption', 'tls',
        'from_email', '',
        'from_name', '',
        'enable_email_notifications', true,
        'enable_email_to_ticket', false
    ) as setting_value
FROM tenants t;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT 
    t.id as tenant_id,
    'branding_settings' as setting_key,
    jsonb_build_object(
        'company_name', 'Your Company',
        'logo_url', '',
        'support_url', '',
        'primary_color', '#3b82f6',
        'accent_color', '#10b981',
        'secondary_color', '#64748b',
        'custom_css', '',
        'favicon_url', '',
        'header_logo_height', 40,
        'enable_custom_branding', false
    ) as setting_value
FROM tenants t;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT 
    t.id as tenant_id,
    'automation_settings' as setting_key,
    jsonb_build_object(
        'enable_auto_assignment', false,
        'assignment_strategy', 'round_robin',
        'max_tickets_per_agent', 10,
        'enable_escalation', false,
        'escalation_threshold_hours', 24,
        'enable_auto_reply', false,
        'auto_reply_template', 'Thank you for contacting our support team. We have received your ticket and will respond within 24 hours.'
    ) as setting_value
FROM tenants t;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_tenant_settings_tenant_key;
DROP TABLE IF EXISTS tenant_settings;

-- +goose StatementEnd
