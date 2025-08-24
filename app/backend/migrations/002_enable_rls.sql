-- +goose Up
-- +goose StatementBegin

-- Enable Row Level Security on multi-tenant tables

-- Tenants RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_tenant_policy ON tenants 
    USING (id = current_setting('app.tenant_id', true)::uuid);

-- Projects RLS  
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_tenant_policy ON projects 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Agents RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_tenant_policy ON agents 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Agent Project Roles RLS
ALTER TABLE agent_project_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_project_roles_tenant_policy ON agent_project_roles 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY agent_project_roles_project_policy ON agent_project_roles 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- Customers RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_tenant_policy ON customers 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Organizations RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant_policy ON organizations 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Tickets RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_tenant_policy ON tickets 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tickets_project_policy ON tickets 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- Ticket Messages RLS
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_messages_tenant_policy ON ticket_messages 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY ticket_messages_project_policy ON ticket_messages 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- Ticket Tags RLS
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_tags_tenant_policy ON ticket_tags 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY ticket_tags_project_policy ON ticket_tags 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- Attachments RLS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY attachments_tenant_policy ON attachments 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY attachments_project_policy ON attachments 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- SLA Policies RLS
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_policies_tenant_policy ON sla_policies 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY sla_policies_project_policy ON sla_policies 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- Webhooks RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhooks_tenant_policy ON webhooks 
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY webhooks_project_policy ON webhooks 
    USING (project_id = ANY (string_to_array(current_setting('app.project_ids', true), ',')::uuid[]));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop all RLS policies
DROP POLICY IF EXISTS webhooks_project_policy ON webhooks;
DROP POLICY IF EXISTS webhooks_tenant_policy ON webhooks;
DROP POLICY IF EXISTS sla_policies_project_policy ON sla_policies;
DROP POLICY IF EXISTS sla_policies_tenant_policy ON sla_policies;
DROP POLICY IF EXISTS attachments_project_policy ON attachments;
DROP POLICY IF EXISTS attachments_tenant_policy ON attachments;
DROP POLICY IF EXISTS ticket_tags_project_policy ON ticket_tags;
DROP POLICY IF EXISTS ticket_tags_tenant_policy ON ticket_tags;
DROP POLICY IF EXISTS ticket_messages_project_policy ON ticket_messages;
DROP POLICY IF EXISTS ticket_messages_tenant_policy ON ticket_messages;
DROP POLICY IF EXISTS tickets_project_policy ON tickets;
DROP POLICY IF EXISTS tickets_tenant_policy ON tickets;
DROP POLICY IF EXISTS organizations_tenant_policy ON organizations;
DROP POLICY IF EXISTS customers_tenant_policy ON customers;
DROP POLICY IF EXISTS agent_project_roles_project_policy ON agent_project_roles;
DROP POLICY IF EXISTS agent_project_roles_tenant_policy ON agent_project_roles;
DROP POLICY IF EXISTS agents_tenant_policy ON agents;
DROP POLICY IF EXISTS projects_tenant_policy ON projects;
DROP POLICY IF EXISTS tenants_tenant_policy ON tenants;

-- Disable RLS
ALTER TABLE webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_project_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

-- +goose StatementEnd
