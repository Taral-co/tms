-- +goose Up
-- Chat widget configurations for projects
CREATE TABLE chat_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES email_domain_validations(id) ON DELETE CASCADE,
    
    -- Widget configuration
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Appearance settings
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#f3f4f6',
    position VARCHAR(20) DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
    welcome_message TEXT DEFAULT 'Hello! How can we help you?',
    offline_message TEXT DEFAULT 'We are currently offline. Please leave a message.',
    
    -- Behavior settings
    auto_open_delay INTEGER DEFAULT 0, -- seconds, 0 = no auto-open
    show_agent_avatars BOOLEAN DEFAULT true,
    allow_file_uploads BOOLEAN DEFAULT true,
    require_email BOOLEAN DEFAULT true,
    
    -- Business hours (stored as JSON)
    business_hours JSONB DEFAULT '{"enabled": false}',
    
    -- Widget script and embed settings
    embed_code TEXT, -- Generated embed code
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id, project_id, domain_id)
);

-- Chat sessions - represents active/historical chat conversations
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    widget_id UUID NOT NULL REFERENCES chat_widgets(id) ON DELETE CASCADE,
    
    -- Session identity
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- If customer is known
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL, -- Associated ticket if created
    
    -- Session metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'transferred')),
    visitor_info JSONB DEFAULT '{}', -- Browser, IP, referrer, etc.
    
    -- Agent assignment
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages within sessions
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Message content
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    content TEXT NOT NULL,
    
    -- Author information
    author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('visitor', 'agent', 'system')),
    author_id UUID, -- agent_id if author_type = 'agent', NULL for visitor/system
    author_name VARCHAR(255), -- Visitor name or agent name
    
    -- Message metadata
    metadata JSONB DEFAULT '{}', -- File info, system message details, etc.
    is_private BOOLEAN DEFAULT false, -- Private notes between agents
    
    -- Read tracking
    read_by_visitor BOOLEAN DEFAULT false,
    read_by_agent BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat session participants (for group chats or agent transfers)
CREATE TABLE chat_session_participants (
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('primary', 'participant', 'observer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    PRIMARY KEY (session_id, agent_id)
);

-- Indexes for performance
CREATE INDEX idx_chat_widgets_tenant_project ON chat_widgets(tenant_id, project_id);
CREATE INDEX idx_chat_widgets_domain ON chat_widgets(domain_id) WHERE is_active = true;

CREATE INDEX idx_chat_sessions_tenant_project ON chat_sessions(tenant_id, project_id);
CREATE INDEX idx_chat_sessions_widget ON chat_sessions(widget_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status, last_activity_at);
CREATE INDEX idx_chat_sessions_assigned_agent ON chat_sessions(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_customer ON chat_sessions(customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_chat_messages_author ON chat_messages(author_type, author_id);
CREATE INDEX idx_chat_messages_unread_visitor ON chat_messages(session_id, read_by_visitor) WHERE author_type = 'agent';
CREATE INDEX idx_chat_messages_unread_agent ON chat_messages(session_id, read_by_agent) WHERE author_type = 'visitor';

CREATE INDEX idx_chat_participants_agent ON chat_session_participants(agent_id, left_at);

-- Row Level Security
ALTER TABLE chat_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_session_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY chat_widgets_tenant_isolation ON chat_widgets FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY chat_sessions_tenant_isolation ON chat_sessions FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY chat_messages_tenant_isolation ON chat_messages FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
CREATE POLICY chat_participants_tenant_isolation ON chat_session_participants FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- +goose Down
DROP TABLE IF EXISTS chat_session_participants;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS chat_widgets;
