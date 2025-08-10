-- Add API keys table for enterprise tenant/project management
-- +goose Up
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- NULL for tenant-level keys
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA-256 hash of the actual key
    key_prefix VARCHAR(20) NOT NULL, -- First few chars for preview (e.g., "tms_abc123...")
    scopes JSONB DEFAULT '[]'::jsonb, -- Array of permission scopes
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- NULL for non-expiring keys
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES agents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique names per tenant
    CONSTRAINT unique_api_key_name_per_tenant UNIQUE (tenant_id, name)
);

-- Create indexes for performance
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_tenant_active ON api_keys(tenant_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY api_keys_tenant_isolation ON api_keys
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- +goose Down
DROP TABLE IF EXISTS api_keys CASCADE;
