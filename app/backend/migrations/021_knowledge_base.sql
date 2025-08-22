-- +goose Up
-- +goose StatementBegin

-- Knowledge base categories for organizing articles
CREATE TABLE kb_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES kb_categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, name)
);

-- Knowledge base articles
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
    
    -- Article content
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- SEO and search
    slug VARCHAR(500) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_public BOOLEAN DEFAULT true,
    
    -- Authoring
    author_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id, project_id, slug)
);

-- Auto-generated knowledge base entries from tickets
CREATE TABLE kb_auto_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Source information
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('ticket', 'email', 'chat')),
    source_id UUID NOT NULL,
    
    -- Generated content
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    keywords TEXT[] DEFAULT '{}',
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
    reviewed_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    -- Link to approved article (if converted)
    article_id UUID REFERENCES kb_articles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge base search index for full-text search
CREATE TABLE kb_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Reference to source
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    auto_entry_id UUID REFERENCES kb_auto_entries(id) ON DELETE CASCADE,
    
    -- Search content
    title_vector tsvector,
    content_vector tsvector,
    combined_vector tsvector,
    
    -- Metadata for ranking
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    recency_score DECIMAL(5,2) DEFAULT 1.0,
    relevance_boost DECIMAL(3,2) DEFAULT 1.0,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CHECK ((article_id IS NOT NULL AND auto_entry_id IS NULL) OR (article_id IS NULL AND auto_entry_id IS NOT NULL))
);

-- Article usage analytics
CREATE TABLE kb_article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    
    -- Viewer information (if available)
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Context
    source VARCHAR(50), -- 'search', 'category', 'related', 'direct'
    search_query TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Session context
    session_id VARCHAR(255),
    chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge base feedback
CREATE TABLE kb_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    
    -- Feedback provider
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Feedback
    is_helpful BOOLEAN NOT NULL,
    comment TEXT,
    
    -- Context
    chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_kb_categories_tenant_project ON kb_categories(tenant_id, project_id);
CREATE INDEX idx_kb_categories_parent ON kb_categories(parent_id);

CREATE INDEX idx_kb_articles_tenant_project ON kb_articles(tenant_id, project_id);
CREATE INDEX idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX idx_kb_articles_status ON kb_articles(status);
CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_articles_tags ON kb_articles USING GIN(tags);
CREATE INDEX idx_kb_articles_keywords ON kb_articles USING GIN(keywords);

CREATE INDEX idx_kb_auto_entries_tenant_project ON kb_auto_entries(tenant_id, project_id);
CREATE INDEX idx_kb_auto_entries_source ON kb_auto_entries(source_type, source_id);
CREATE INDEX idx_kb_auto_entries_status ON kb_auto_entries(status);

CREATE INDEX idx_kb_search_index_tenant_project ON kb_search_index(tenant_id, project_id);
CREATE INDEX idx_kb_search_index_title_vector ON kb_search_index USING GIN(title_vector);
CREATE INDEX idx_kb_search_index_content_vector ON kb_search_index USING GIN(content_vector);
CREATE INDEX idx_kb_search_index_combined_vector ON kb_search_index USING GIN(combined_vector);

CREATE INDEX idx_kb_article_views_tenant_project ON kb_article_views(tenant_id, project_id);
CREATE INDEX idx_kb_article_views_article ON kb_article_views(article_id);
CREATE INDEX idx_kb_article_views_created_at ON kb_article_views(created_at);

CREATE INDEX idx_kb_feedback_tenant_project ON kb_feedback(tenant_id, project_id);
CREATE INDEX idx_kb_feedback_article ON kb_feedback(article_id);

-- Functions to update search vectors automatically
CREATE OR REPLACE FUNCTION update_kb_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
    -- Update search vectors when article content changes
    IF TG_TABLE_NAME = 'kb_articles' THEN
        UPDATE kb_search_index 
        SET 
            title_vector = to_tsvector('english', NEW.title),
            content_vector = to_tsvector('english', NEW.content || ' ' || COALESCE(NEW.summary, '')),
            combined_vector = to_tsvector('english', NEW.title || ' ' || NEW.content || ' ' || COALESCE(NEW.summary, '') || ' ' || array_to_string(NEW.tags, ' ') || ' ' || array_to_string(NEW.keywords, ' ')),
            updated_at = NOW()
        WHERE article_id = NEW.id;
        
        -- Insert if doesn't exist
        IF NOT FOUND THEN
            INSERT INTO kb_search_index (tenant_id, project_id, article_id, title_vector, content_vector, combined_vector)
            VALUES (
                NEW.tenant_id,
                NEW.project_id,
                NEW.id,
                to_tsvector('english', NEW.title),
                to_tsvector('english', NEW.content || ' ' || COALESCE(NEW.summary, '')),
                to_tsvector('english', NEW.title || ' ' || NEW.content || ' ' || COALESCE(NEW.summary, '') || ' ' || array_to_string(NEW.tags, ' ') || ' ' || array_to_string(NEW.keywords, ' '))
            );
        END IF;
    END IF;
    
    -- Update search vectors when auto entry content changes
    IF TG_TABLE_NAME = 'kb_auto_entries' THEN
        UPDATE kb_search_index 
        SET 
            title_vector = to_tsvector('english', NEW.title),
            content_vector = to_tsvector('english', NEW.content || ' ' || COALESCE(NEW.summary, '')),
            combined_vector = to_tsvector('english', NEW.title || ' ' || NEW.content || ' ' || COALESCE(NEW.summary, '') || ' ' || array_to_string(NEW.keywords, ' ')),
            updated_at = NOW()
        WHERE auto_entry_id = NEW.id;
        
        -- Insert if doesn't exist
        IF NOT FOUND THEN
            INSERT INTO kb_search_index (tenant_id, project_id, auto_entry_id, title_vector, content_vector, combined_vector)
            VALUES (
                NEW.tenant_id,
                NEW.project_id,
                NEW.id,
                to_tsvector('english', NEW.title),
                to_tsvector('english', NEW.content || ' ' || COALESCE(NEW.summary, '')),
                to_tsvector('english', NEW.title || ' ' || NEW.content || ' ' || COALESCE(NEW.summary, '') || ' ' || array_to_string(NEW.keywords, ' '))
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_article_search_vectors
    AFTER INSERT OR UPDATE ON kb_articles
    FOR EACH ROW EXECUTE FUNCTION update_kb_search_vectors();

CREATE TRIGGER trigger_update_auto_entry_search_vectors
    AFTER INSERT OR UPDATE ON kb_auto_entries
    FOR EACH ROW EXECUTE FUNCTION update_kb_search_vectors();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS trigger_update_article_search_vectors ON kb_articles;
DROP TRIGGER IF EXISTS trigger_update_auto_entry_search_vectors ON kb_auto_entries;
DROP FUNCTION IF EXISTS update_kb_search_vectors();

DROP TABLE IF EXISTS kb_feedback CASCADE;
DROP TABLE IF EXISTS kb_article_views CASCADE;
DROP TABLE IF EXISTS kb_search_index CASCADE;
DROP TABLE IF EXISTS kb_auto_entries CASCADE;
DROP TABLE IF EXISTS kb_articles CASCADE;
DROP TABLE IF EXISTS kb_categories CASCADE;

-- +goose StatementEnd
