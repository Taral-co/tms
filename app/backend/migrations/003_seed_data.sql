-- +goose Up
-- +goose StatementBegin

-- Insert default roles
INSERT INTO roles (role, description) VALUES
    ('tenant_admin', 'Full access to tenant and all projects'),
    ('project_admin', 'Full access to a specific project'),
    ('supervisor', 'Read/write tickets, manage assignments in project'),
    ('agent', 'Read/write assigned tickets in project'),
    ('read_only', 'Read-only access to tickets in project');

-- Insert role permissions
INSERT INTO role_permissions (role, perm) VALUES
    -- tenant_admin permissions
    ('tenant_admin', 'tenant.manage'),
    ('tenant_admin', 'project.create'),
    ('tenant_admin', 'project.manage'),
    ('tenant_admin', 'ticket.read'),
    ('tenant_admin', 'ticket.write'),
    ('tenant_admin', 'ticket.assign'),
    ('tenant_admin', 'ticket.close'),
    ('tenant_admin', 'note.private.read'),
    ('tenant_admin', 'note.private.write'),
    ('tenant_admin', 'agent.manage'),
    ('tenant_admin', 'sla.manage'),
    ('tenant_admin', 'webhook.manage'),
    
    -- project_admin permissions
    ('project_admin', 'project.manage'),
    ('project_admin', 'ticket.read'),
    ('project_admin', 'ticket.write'),
    ('project_admin', 'ticket.assign'),
    ('project_admin', 'ticket.close'),
    ('project_admin', 'note.private.read'),
    ('project_admin', 'note.private.write'),
    ('project_admin', 'agent.manage'),
    ('project_admin', 'sla.manage'),
    
    -- supervisor permissions
    ('supervisor', 'ticket.read'),
    ('supervisor', 'ticket.write'),
    ('supervisor', 'ticket.assign'),
    ('supervisor', 'ticket.close'),
    ('supervisor', 'note.private.read'),
    ('supervisor', 'note.private.write'),
    
    -- agent permissions
    ('agent', 'ticket.read'),
    ('agent', 'ticket.write'),
    ('agent', 'ticket.assign.self'),
    
    -- read_only permissions
    ('read_only', 'ticket.read');

-- Insert sample tenant
INSERT INTO tenants (id, name, status, region) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corporation', 'active', 'us-east-1');

-- Insert sample projects
INSERT INTO projects (id, tenant_id, key, name) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'SUPPORT', 'Customer Support'),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'OPS', 'Operations');

-- Insert sample organizations
INSERT INTO organizations (id, tenant_id, name) VALUES
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Example Corp'),
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Test Industries');

-- Insert sample customers
INSERT INTO customers (id, tenant_id, email, name, org_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'john.doe@example.com', 'John Doe', '550e8400-e29b-41d4-a716-446655440010'),
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'jane.smith@test.com', 'Jane Smith', '550e8400-e29b-41d4-a716-446655440011'),
    ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000', 'bob.wilson@example.com', 'Bob Wilson', '550e8400-e29b-41d4-a716-446655440010');

-- Insert sample agents (password: 'password123' hashed with bcrypt)
INSERT INTO agents (id, tenant_id, email, name, password_hash) VALUES
    ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', 'admin@acme.com', 'Admin User', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', 'agent1@acme.com', 'Alice Agent', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', 'agent2@acme.com', 'Bob Agent', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', 'supervisor@acme.com', 'Charlie Supervisor', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', 'readonly@acme.com', 'David Readonly', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert agent project roles
INSERT INTO agent_project_roles (agent_id, tenant_id, project_id, role) VALUES
    -- Admin has tenant_admin role on both projects
    ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'tenant_admin'),
    ('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'tenant_admin'),
    
    -- Alice is an agent on support project
    ('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'agent'),
    
    -- Bob is an agent on operations project
    ('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'agent'),
    
    -- Charlie is supervisor on both projects
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'supervisor'),
    ('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'supervisor'),
    
    -- David has read-only access to support project
    ('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'read_only');

-- Insert sample SLA policies
INSERT INTO sla_policies (id, tenant_id, project_id, name, first_response_minutes, resolution_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Standard Support SLA', 240, 1440),
    ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'Operations SLA', 60, 480);

-- Insert sample tickets
INSERT INTO tickets (id, tenant_id, project_id, subject, status, priority, type, source, requester_id, assignee_agent_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Login issues with mobile app', 'open', 'high', 'problem', 'email', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440031'),
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Feature request: Dark mode', 'open', 'low', 'task', 'web', '550e8400-e29b-41d4-a716-446655440021', NULL),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'Server performance issues', 'open', 'urgent', 'incident', 'api', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440032'),
    ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'How to reset password?', 'resolved', 'normal', 'question', 'email', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440031'),
    ('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Billing inquiry about upgrade', 'pending', 'normal', 'question', 'web', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440031');

-- Insert sample ticket messages
INSERT INTO ticket_messages (id, tenant_id, project_id, ticket_id, author_type, author_id, body, is_private) VALUES
    -- Login issues ticket messages
    ('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440050', 'customer', '550e8400-e29b-41d4-a716-446655440020', 'I cannot login to the mobile app. It keeps saying "Invalid credentials" even though I am using the correct password.', false),
    ('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440050', 'agent', '550e8400-e29b-41d4-a716-446655440031', 'Thank you for contacting us. Let me help you with this login issue. Can you please try clearing the app cache and try again?', false),
    ('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440050', 'agent', '550e8400-e29b-41d4-a716-446655440031', 'Internal note: User might be affected by the authentication service issue we had last week. Will need to reset their session.', true),
    
    -- Feature request messages
    ('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', 'customer', '550e8400-e29b-41d4-a716-446655440021', 'It would be great if you could add a dark mode option to the app. Many users prefer dark themes, especially for late-night usage.', false),
    
    -- Server performance messages
    ('550e8400-e29b-41d4-a716-446655440064', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440052', 'customer', '550e8400-e29b-41d4-a716-446655440022', 'Our API calls are timing out frequently. The response times have increased significantly since yesterday.', false),
    ('550e8400-e29b-41d4-a716-446655440065', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440052', 'agent', '550e8400-e29b-41d4-a716-446655440032', 'I am investigating this issue. We are seeing increased load on our servers. Scaling up the infrastructure now.', false),
    
    -- Password reset messages  
    ('550e8400-e29b-41d4-a716-446655440066', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440053', 'customer', '550e8400-e29b-41d4-a716-446655440020', 'I forgot my password and need to reset it. How can I do that?', false),
    ('550e8400-e29b-41d4-a716-446655440067', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440053', 'agent', '550e8400-e29b-41d4-a716-446655440031', 'You can reset your password by clicking the "Forgot Password" link on the login page. You will receive an email with reset instructions.', false),
    ('550e8400-e29b-41d4-a716-446655440068', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440053', 'customer', '550e8400-e29b-41d4-a716-446655440020', 'Perfect, that worked! Thank you for the help.', false),
    
    -- Billing inquiry messages
    ('550e8400-e29b-41d4-a716-446655440069', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440054', 'customer', '550e8400-e29b-41d4-a716-446655440021', 'I am interested in upgrading to the premium plan. Can you provide more details about the pricing and features?', false),
    ('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440054', 'agent', '550e8400-e29b-41d4-a716-446655440031', 'Thank you for your interest! I have sent you an email with detailed pricing information and a comparison of features. Our sales team will also reach out to discuss your specific needs.', false);

-- Insert sample ticket tags
INSERT INTO ticket_tags (ticket_id, tenant_id, project_id, tag) VALUES
    ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'mobile'),
    ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'authentication'),
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'feature-request'),
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'ui'),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'performance'),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'api'),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'urgent'),
    ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'password'),
    ('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'billing'),
    ('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'upgrade');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Clean up all sample data
DELETE FROM ticket_tags;
DELETE FROM ticket_messages;
DELETE FROM tickets;
DELETE FROM sla_policies;
DELETE FROM agent_project_roles;
DELETE FROM agents;
DELETE FROM customers;
DELETE FROM organizations;
DELETE FROM projects;
DELETE FROM tenants;
DELETE FROM role_permissions;
DELETE FROM roles;

-- +goose StatementEnd