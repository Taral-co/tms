-- +goose Up
-- +goose StatementBegin

-- Create the role enum type
CREATE TYPE role_type AS ENUM (
    'tenant_admin',
    'project_admin', 
    'supervisor',
    'agent',
    'read_only'
);

-- Drop foreign key constraints that reference roles table
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_fkey;
ALTER TABLE agent_project_roles DROP CONSTRAINT IF EXISTS agent_project_roles_role_fkey;

-- Update the roles table to use the new enum type
ALTER TABLE roles ALTER COLUMN role TYPE role_type USING role::role_type;

-- Update the role_permissions table to use the new enum type
ALTER TABLE role_permissions ALTER COLUMN role TYPE role_type USING role::role_type;

-- Update the agent_project_roles table to use the new enum type
ALTER TABLE agent_project_roles ALTER COLUMN role TYPE role_type USING role::role_type;

-- Re-add foreign key constraints
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_fkey 
    FOREIGN KEY (role) REFERENCES roles(role) ON DELETE CASCADE;

ALTER TABLE agent_project_roles ADD CONSTRAINT agent_project_roles_role_fkey 
    FOREIGN KEY (role) REFERENCES roles(role);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop foreign key constraints
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_fkey;
ALTER TABLE agent_project_roles DROP CONSTRAINT IF EXISTS agent_project_roles_role_fkey;

-- Revert agent_project_roles table back to VARCHAR
ALTER TABLE agent_project_roles ALTER COLUMN role TYPE VARCHAR(50) USING role::text;

-- Revert role_permissions table back to VARCHAR
ALTER TABLE role_permissions ALTER COLUMN role TYPE VARCHAR(50) USING role::text;

-- Revert roles table back to VARCHAR
ALTER TABLE roles ALTER COLUMN role TYPE VARCHAR(50) USING role::text;

-- Re-add foreign key constraints with VARCHAR
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_fkey 
    FOREIGN KEY (role) REFERENCES roles(role) ON DELETE CASCADE;

ALTER TABLE agent_project_roles ADD CONSTRAINT agent_project_roles_role_fkey 
    FOREIGN KEY (role) REFERENCES roles(role);

-- Drop the enum type
DROP TYPE IF EXISTS role_type;

-- +goose StatementEnd
