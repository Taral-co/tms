-- +goose Up
-- Remove email address fields from email_connectors table since mailboxes now handle sender identity

-- Drop the unique index that uses from_address
DROP INDEX IF EXISTS idx_email_connectors_tenant_project_from_address;

-- Remove email identity columns from email_connectors
ALTER TABLE email_connectors DROP COLUMN IF EXISTS from_name;
ALTER TABLE email_connectors DROP COLUMN IF EXISTS from_address;
ALTER TABLE email_connectors DROP COLUMN IF EXISTS reply_to_address;

-- +goose Down
-- Re-add email identity columns to email_connectors
ALTER TABLE email_connectors ADD COLUMN from_name TEXT;
ALTER TABLE email_connectors ADD COLUMN from_address TEXT;
ALTER TABLE email_connectors ADD COLUMN reply_to_address TEXT;

-- Recreate the unique index
CREATE UNIQUE INDEX idx_email_connectors_tenant_project_from_address 
ON email_connectors(tenant_id, project_id, from_address) 
WHERE project_id IS NOT NULL AND from_address IS NOT NULL;
