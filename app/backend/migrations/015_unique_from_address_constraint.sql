-- +goose Up
-- Add unique constraint for email connector from_address per tenant and project

-- Add unique constraint to prevent duplicate from_address per tenant and project
CREATE UNIQUE INDEX idx_email_connectors_tenant_project_from_address 
ON email_connectors(tenant_id, project_id, from_address) 
WHERE project_id IS NOT NULL AND from_address IS NOT NULL;

-- +goose Down
-- Remove the unique constraint
DROP INDEX IF EXISTS idx_email_connectors_tenant_project_from_address;
