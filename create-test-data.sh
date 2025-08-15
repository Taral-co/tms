#!/bin/bash

# Script to insert test data for magic link testing

echo "🗄️ Creating test data for magic link functionality..."

# Database connection (adjust these values based on your setup)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="tms"
DB_USER="postgres"
DB_PASSWORD=""

# Test UUIDs
TENANT_ID="123e4567-e89b-12d3-a456-426614174000"
PROJECT_ID="123e4567-e89b-12d3-a456-426614174001" 
TICKET_ID="123e4567-e89b-12d3-a456-426614174002"
CUSTOMER_ID="123e4567-e89b-12d3-a456-426614174003"
AGENT_ID="123e4567-e89b-12d3-a456-426614174004"

echo "📝 Creating SQL statements..."

# Create SQL commands
cat > /tmp/test_data.sql << EOF
-- Insert test tenant
INSERT INTO tenants (id, name, status, created_at, updated_at) 
VALUES ('$TENANT_ID', 'Test Company', 'active', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Insert test project
INSERT INTO projects (id, name, key, tenant_id, status, created_at, updated_at) 
VALUES ('$PROJECT_ID', 'Test Project', 'TEST', '$TENANT_ID', 'active', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Insert test customer
INSERT INTO customers (id, name, email, tenant_id, created_at, updated_at) 
VALUES ('$CUSTOMER_ID', 'John Doe', 'john.doe@example.com', '$TENANT_ID', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Insert test agent
INSERT INTO agents (id, name, email, status, tenant_id, created_at, updated_at) 
VALUES ('$AGENT_ID', 'Support Agent', 'agent@test.com', 'active', '$TENANT_ID', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Insert test ticket
INSERT INTO tickets (id, tenant_id, project_id, number, subject, status, priority, type, source, requester_id, customer_name, created_at, updated_at) 
VALUES ('$TICKET_ID', '$TENANT_ID', '$PROJECT_ID', 1, 'Test Support Ticket', 'open', 'normal', 'question', 'web', '$CUSTOMER_ID', 'John Doe', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Insert test messages
INSERT INTO ticket_messages (id, ticket_id, tenant_id, project_id, author_type, author_id, body, is_private, created_at) 
VALUES 
  (gen_random_uuid(), '$TICKET_ID', '$TENANT_ID', '$PROJECT_ID', 'customer', '$CUSTOMER_ID', 'Hello, I need help with my account setup. I cannot access the dashboard after creating my account.', false, NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), '$TICKET_ID', '$TENANT_ID', '$PROJECT_ID', 'agent', '$AGENT_ID', 'Hi John! Thank you for reaching out. I will help you with your account setup. Can you please tell me what error message you are seeing when trying to access the dashboard?', false, NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), '$TICKET_ID', '$TENANT_ID', '$PROJECT_ID', 'customer', '$CUSTOMER_ID', 'I see a message saying "Access Denied - Please contact administrator". I have tried clearing my browser cache but it does not help.', false, NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Display the created data
SELECT 'Test data created successfully!' as status;
SELECT 'Tenant ID: $TENANT_ID' as info;
SELECT 'Project ID: $PROJECT_ID' as info;
SELECT 'Ticket ID: $TICKET_ID' as info;
SELECT 'Customer ID: $CUSTOMER_ID' as info;
EOF

echo "💾 Executing SQL commands..."

# Execute the SQL (uncomment the method that works for your setup)

# Method 1: Using psql with password prompt
# psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/test_data.sql

# Method 2: Using psql with connection string (adjust as needed)
# psql "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" -f /tmp/test_data.sql

# Method 3: Docker postgres (if running in Docker)
# docker exec -i postgres_container psql -U $DB_USER -d $DB_NAME -f /tmp/test_data.sql

echo ""
echo "⚠️  To complete setup, run one of these commands:"
echo ""
echo "For local PostgreSQL:"
echo "psql -h localhost -p 5432 -U postgres -d tms -f /tmp/test_data.sql"
echo ""
echo "For Docker PostgreSQL:"
echo "docker exec -i \$(docker ps --filter name=postgres --format '{{.Names}}') psql -U postgres -d tms -f /tmp/test_data.sql"
echo ""
echo "For connection string:"
echo "psql 'postgresql://postgres@localhost:5432/tms' -f /tmp/test_data.sql"
echo ""
echo "✅ After running the SQL, test the magic link with:"
echo "./test-magic-link.sh"

# Clean up
# rm /tmp/test_data.sql

echo ""
echo "🔗 Test Magic Link URL will be:"
echo "http://localhost:3001/tickets/[GENERATED_TOKEN]"
