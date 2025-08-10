-- +goose Up
-- +goose StatementBegin

-- This migration is a placeholder/update for tenant settings
-- The table already exists from previous migrations, so we just ensure the structure is correct

-- Ensure the table exists with correct structure (idempotent)
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, setting_key);

-- No additional data insertion since the previous migration handles that

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- No action needed on rollback since this is just a verification migration

-- +goose StatementEnd
