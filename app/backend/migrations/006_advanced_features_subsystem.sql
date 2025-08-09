-- +goose Up
-- +goose StatementBegin

-- File storage and object management
CREATE TYPE storage_provider AS ENUM ('minio', 's3', 'azure_blob', 'gcs');
CREATE TYPE attachment_type AS ENUM ('ticket_attachment', 'message_attachment', 'agent_avatar', 'org_logo', 'knowledge_article');

CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_provider storage_provider NOT NULL DEFAULT 'minio',
    storage_path TEXT NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL,
    attachment_type attachment_type NOT NULL DEFAULT 'ticket_attachment',
    related_entity_type VARCHAR(50), -- 'ticket', 'message', 'agent', 'organization'
    related_entity_id UUID,
    checksum VARCHAR(64), -- SHA-256 checksum for integrity
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ, -- For temporary files
    uploaded_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search and indexing
CREATE TYPE search_entity_type AS ENUM ('ticket', 'message', 'customer', 'agent', 'organization', 'knowledge_article');

CREATE TABLE search_indexes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    entity_type search_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    search_vector tsvector,
    content_hash VARCHAR(64), -- To detect changes
    last_indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- Background job system
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying');
CREATE TYPE job_type AS ENUM (
    'email_send', 'email_process', 'notification_send', 
    'integration_sync', 'webhook_delivery', 'report_generation',
    'data_export', 'data_import', 'cleanup', 'backup'
);

CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    job_type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    priority INTEGER NOT NULL DEFAULT 0, -- Higher values = higher priority
    worker_id VARCHAR(100), -- ID of the worker processing this job
    parent_job_id UUID REFERENCES background_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rate limiting and throttling
CREATE TABLE rate_limit_buckets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL, -- IP, user ID, API key, etc.
    bucket_type VARCHAR(100) NOT NULL, -- 'api_request', 'email_send', 'webhook_call', etc.
    current_count INTEGER NOT NULL DEFAULT 0,
    max_count INTEGER NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_duration INTERVAL NOT NULL,
    last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(identifier, bucket_type, window_start)
);

-- Observability and monitoring
CREATE TYPE metric_type AS ENUM ('counter', 'gauge', 'histogram', 'timer');

CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_type metric_type NOT NULL,
    value NUMERIC NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE application_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL, -- 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
    message TEXT NOT NULL,
    component VARCHAR(100), -- 'api', 'worker', 'integration', etc.
    operation VARCHAR(100), -- 'create_ticket', 'send_email', etc.
    correlation_id UUID, -- For tracing requests across services
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    context_data JSONB NOT NULL DEFAULT '{}',
    stack_trace TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Caching layer metadata
CREATE TABLE cache_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    cache_key VARCHAR(512) NOT NULL,
    cache_value BYTEA, -- Stored as binary for flexibility
    content_type VARCHAR(100) NOT NULL DEFAULT 'application/json',
    ttl_seconds INTEGER NOT NULL DEFAULT 3600,
    hit_count INTEGER NOT NULL DEFAULT 0,
    last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cache_key)
);

-- Knowledge base and documentation
CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived', 'under_review');
CREATE TYPE article_visibility AS ENUM ('public', 'internal', 'private');

CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    status article_status NOT NULL DEFAULT 'draft',
    visibility article_visibility NOT NULL DEFAULT 'internal',
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    view_count INTEGER NOT NULL DEFAULT 0,
    vote_score INTEGER NOT NULL DEFAULT 0, -- Helpful/not helpful votes
    author_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    reviewer_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_slug_per_project UNIQUE(project_id, slug)
);

-- Notification system
CREATE TYPE notification_type AS ENUM (
    'ticket_assigned', 'ticket_updated', 'ticket_escalated', 'ticket_resolved',
    'message_received', 'mention_received', 'sla_warning', 'sla_breach',
    'system_alert', 'maintenance_notice', 'feature_announcement'
);
CREATE TYPE notification_channel AS ENUM ('web', 'email', 'slack', 'sms', 'push');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    recipient_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'normal',
    channels notification_channel[] NOT NULL DEFAULT ARRAY['web']::notification_channel[],
    action_url TEXT, -- URL to navigate to when clicked
    metadata JSONB NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- For temporary notifications
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification delivery tracking
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    external_id VARCHAR(255), -- ID from external service (email service, SMS service, etc.)
    error_message TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics and reporting
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_category VARCHAR(100) NOT NULL, -- 'user_action', 'system_event', 'business_metric'
    properties JSONB NOT NULL DEFAULT '{}',
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_file_attachments_tenant_project ON file_attachments(tenant_id, project_id);
CREATE INDEX idx_file_attachments_entity ON file_attachments(related_entity_type, related_entity_id);
CREATE INDEX idx_file_attachments_type ON file_attachments(attachment_type);
CREATE INDEX idx_file_attachments_expires_at ON file_attachments(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_search_indexes_tenant_project ON search_indexes(tenant_id, project_id);
CREATE INDEX idx_search_indexes_entity ON search_indexes(entity_type, entity_id);
CREATE INDEX idx_search_indexes_vector ON search_indexes USING GIN(search_vector);
CREATE INDEX idx_search_indexes_last_indexed ON search_indexes(last_indexed_at);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_scheduled_at ON background_jobs(scheduled_at);
CREATE INDEX idx_background_jobs_priority ON background_jobs(priority DESC);
CREATE INDEX idx_background_jobs_type_status ON background_jobs(job_type, status);
CREATE INDEX idx_background_jobs_worker_id ON background_jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_background_jobs_parent ON background_jobs(parent_job_id) WHERE parent_job_id IS NOT NULL;

CREATE INDEX idx_rate_limit_buckets_identifier ON rate_limit_buckets(identifier, bucket_type);
CREATE INDEX idx_rate_limit_buckets_window ON rate_limit_buckets(window_start, window_duration);

CREATE INDEX idx_metrics_tenant_project ON metrics(tenant_id, project_id);
CREATE INDEX idx_metrics_name_timestamp ON metrics(metric_name, timestamp);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);

CREATE INDEX idx_application_logs_tenant_project ON application_logs(tenant_id, project_id);
CREATE INDEX idx_application_logs_level_timestamp ON application_logs(level, timestamp);
CREATE INDEX idx_application_logs_component_operation ON application_logs(component, operation);
CREATE INDEX idx_application_logs_correlation_id ON application_logs(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE INDEX idx_cache_entries_key ON cache_entries(cache_key);
CREATE INDEX idx_cache_entries_expires_at ON cache_entries(expires_at);
CREATE INDEX idx_cache_entries_tenant ON cache_entries(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX idx_knowledge_articles_tenant_project ON knowledge_articles(tenant_id, project_id);
CREATE INDEX idx_knowledge_articles_status_visibility ON knowledge_articles(status, visibility);
CREATE INDEX idx_knowledge_articles_category ON knowledge_articles(category) WHERE category IS NOT NULL;
CREATE INDEX idx_knowledge_articles_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX idx_knowledge_articles_published_at ON knowledge_articles(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX idx_notifications_recipient ON notifications(recipient_agent_id);
CREATE INDEX idx_notifications_type_priority ON notifications(type, priority);
CREATE INDEX idx_notifications_is_read ON notifications(is_read, created_at);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_notification_deliveries_notification ON notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_channel_status ON notification_deliveries(channel, status);

CREATE INDEX idx_analytics_events_tenant_project ON analytics_events(tenant_id, project_id);
CREATE INDEX idx_analytics_events_name_timestamp ON analytics_events(event_name, timestamp);
CREATE INDEX idx_analytics_events_category_timestamp ON analytics_events(event_category, timestamp);
CREATE INDEX idx_analytics_events_agent ON analytics_events(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_analytics_events_customer ON analytics_events(customer_id) WHERE customer_id IS NOT NULL;

-- Row Level Security policies
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY file_attachments_tenant_policy ON file_attachments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY search_indexes_tenant_policy ON search_indexes
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY background_jobs_tenant_policy ON background_jobs
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY rate_limit_buckets_tenant_policy ON rate_limit_buckets
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY metrics_tenant_policy ON metrics
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY application_logs_tenant_policy ON application_logs
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY cache_entries_tenant_policy ON cache_entries
    USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY knowledge_articles_tenant_policy ON knowledge_articles
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY notifications_tenant_policy ON notifications
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY notification_deliveries_tenant_policy ON notification_deliveries
    USING (EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.id = notification_deliveries.notification_id 
        AND n.tenant_id = current_setting('app.current_tenant_id')::UUID
    ));

CREATE POLICY analytics_events_tenant_policy ON analytics_events
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Triggers for updated_at timestamps
CREATE TRIGGER trigger_file_attachments_updated_at
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_search_indexes_updated_at
    BEFORE UPDATE ON search_indexes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_background_jobs_updated_at
    BEFORE UPDATE ON background_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_rate_limit_buckets_updated_at
    BEFORE UPDATE ON rate_limit_buckets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cache_entries_updated_at
    BEFORE UPDATE ON cache_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_knowledge_articles_updated_at
    BEFORE UPDATE ON knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_notification_deliveries_updated_at
    BEFORE UPDATE ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_notification_deliveries_updated_at ON notification_deliveries;
DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
DROP TRIGGER IF EXISTS trigger_knowledge_articles_updated_at ON knowledge_articles;
DROP TRIGGER IF EXISTS trigger_cache_entries_updated_at ON cache_entries;
DROP TRIGGER IF EXISTS trigger_rate_limit_buckets_updated_at ON rate_limit_buckets;
DROP TRIGGER IF EXISTS trigger_background_jobs_updated_at ON background_jobs;
DROP TRIGGER IF EXISTS trigger_search_indexes_updated_at ON search_indexes;
DROP TRIGGER IF EXISTS trigger_file_attachments_updated_at ON file_attachments;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS knowledge_articles;
DROP TABLE IF EXISTS cache_entries;
DROP TABLE IF EXISTS application_logs;
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS rate_limit_buckets;
DROP TABLE IF EXISTS background_jobs;
DROP TABLE IF EXISTS search_indexes;
DROP TABLE IF EXISTS file_attachments;

-- Drop types
DROP TYPE IF EXISTS notification_priority;
DROP TYPE IF EXISTS notification_channel;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS article_visibility;
DROP TYPE IF EXISTS article_status;
DROP TYPE IF EXISTS metric_type;
DROP TYPE IF EXISTS job_type;
DROP TYPE IF EXISTS job_status;
DROP TYPE IF EXISTS search_entity_type;
DROP TYPE IF EXISTS attachment_type;
DROP TYPE IF EXISTS storage_provider;

-- +goose StatementEnd
