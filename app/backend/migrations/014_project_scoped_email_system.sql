-- +goose Up
-- Project-scoped email system with validation

-- Add project_id to email_connectors to make them project-scoped
ALTER TABLE email_connectors ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add validation fields to email_connectors
ALTER TABLE email_connectors ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE email_connectors ADD COLUMN validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validating', 'validated', 'failed'));
ALTER TABLE email_connectors ADD COLUMN validation_error TEXT;
ALTER TABLE email_connectors ADD COLUMN last_validation_at TIMESTAMPTZ;

-- Add project_id to email_mailboxes to make them project-scoped
ALTER TABLE email_mailboxes ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Update unique constraints to include project_id
DROP INDEX IF EXISTS idx_email_connectors_tenant_name;
CREATE UNIQUE INDEX idx_email_connectors_tenant_project_name ON email_connectors(tenant_id, project_id, name) WHERE project_id IS NOT NULL;

DROP INDEX IF EXISTS idx_email_mailboxes_tenant_address;
CREATE UNIQUE INDEX idx_email_mailboxes_tenant_project_address ON email_mailboxes(tenant_id, project_id, address) WHERE project_id IS NOT NULL;

-- Add indexes for performance
CREATE INDEX idx_email_connectors_project_validation ON email_connectors(project_id, validation_status) WHERE project_id IS NOT NULL;
CREATE INDEX idx_email_mailboxes_project ON email_mailboxes(project_id) WHERE project_id IS NOT NULL;

-- Update email_inbox to be project-scoped via mailbox
-- This is already handled by the existing project_id field

-- Add domain validation table for tracking email domain ownership
CREATE TABLE email_domain_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    validation_token TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id, project_id, domain)
);

-- Add indexes for domain validations
CREATE INDEX idx_email_domain_validations_tenant_project ON email_domain_validations(tenant_id, project_id);
CREATE INDEX idx_email_domain_validations_status ON email_domain_validations(status, expires_at);

-- +goose Down
-- Remove domain validation table
DROP TABLE IF EXISTS email_domain_validations;

-- Remove indexes
DROP INDEX IF EXISTS idx_email_mailboxes_project;
DROP INDEX IF EXISTS idx_email_connectors_project_validation;
DROP INDEX IF EXISTS idx_email_mailboxes_tenant_project_address;
DROP INDEX IF EXISTS idx_email_connectors_tenant_project_name;

-- Remove validation fields from email_connectors
ALTER TABLE email_connectors DROP COLUMN IF EXISTS last_validation_at;
ALTER TABLE email_connectors DROP COLUMN IF EXISTS validation_error;
ALTER TABLE email_connectors DROP COLUMN IF EXISTS validation_status;
ALTER TABLE email_connectors DROP COLUMN IF EXISTS is_validated;
ALTER TABLE email_connectors DROP COLUMN IF EXISTS project_id;

-- Remove project_id from email_mailboxes
ALTER TABLE email_mailboxes DROP COLUMN IF EXISTS project_id;

-- Restore original unique constraints
CREATE UNIQUE INDEX idx_email_connectors_tenant_name ON email_connectors(tenant_id, name);
CREATE UNIQUE INDEX idx_email_mailboxes_tenant_address ON email_mailboxes(tenant_id, address);
