-- +goose Up
-- Email Inbox Tables for storing actual emails and sync functionality

-- Email inbox to store actual email contents
CREATE TABLE email_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Email identifiers
    message_id TEXT NOT NULL, -- RFC5322 Message-ID
    thread_id TEXT, -- Thread/conversation identifier
    uid INTEGER, -- IMAP UID
    mailbox_address TEXT NOT NULL,
    
    -- Email metadata
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    reply_to_addresses TEXT[],
    subject TEXT NOT NULL,
    
    -- Email content
    body_text TEXT,
    body_html TEXT,
    snippet TEXT, -- Short preview text
    
    -- Email attributes
    is_read BOOLEAN DEFAULT false,
    is_reply BOOLEAN DEFAULT false, -- Is this a reply to another email
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    size_bytes INTEGER,
    
    -- Email dates
    sent_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Processing status
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'processing', 'error')),
    processing_error TEXT,
    
    -- Ticket association
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    is_converted_to_ticket BOOLEAN DEFAULT false,
    
    -- Email connector reference
    connector_id UUID REFERENCES email_connectors(id) ON DELETE CASCADE,
    
    -- Headers and raw data
    headers JSONB,
    raw_email BYTEA, -- Store raw email for debugging if needed
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, message_id, mailbox_address)
);

-- Email attachments
CREATE TABLE email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES email_inbox(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    content_id TEXT, -- For inline attachments
    is_inline BOOLEAN DEFAULT false,
    
    -- File storage (could be local, S3, etc.)
    storage_path TEXT,
    storage_url TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email sync status tracking
CREATE TABLE email_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connector_id UUID NOT NULL REFERENCES email_connectors(id) ON DELETE CASCADE,
    mailbox_address TEXT NOT NULL,
    
    last_sync_at TIMESTAMPTZ,
    last_uid INTEGER DEFAULT 0, -- Last IMAP UID processed
    last_message_date TIMESTAMPTZ, -- Date of last message synced
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
    sync_error TEXT,
    emails_synced_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id, connector_id, mailbox_address)
);

-- Indexes for performance
CREATE INDEX idx_email_inbox_tenant_project ON email_inbox(tenant_id, project_id);
CREATE INDEX idx_email_inbox_mailbox_received ON email_inbox(mailbox_address, received_at DESC);
CREATE INDEX idx_email_inbox_thread ON email_inbox(tenant_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_email_inbox_ticket ON email_inbox(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_email_inbox_sync_status ON email_inbox(tenant_id, sync_status);
CREATE INDEX idx_email_inbox_is_read ON email_inbox(tenant_id, is_read);
CREATE INDEX idx_email_inbox_is_reply ON email_inbox(tenant_id, is_reply);
CREATE INDEX idx_email_attachments_email ON email_attachments(email_id);
CREATE INDEX idx_email_sync_status_connector ON email_sync_status(connector_id, mailbox_address);

-- Enable RLS
ALTER TABLE email_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY email_inbox_tenant ON email_inbox
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_attachments_tenant ON email_attachments
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_sync_status_tenant ON email_sync_status
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- +goose Down
DROP TABLE IF EXISTS email_sync_status CASCADE;
DROP TABLE IF EXISTS email_attachments CASCADE;
DROP TABLE IF EXISTS email_inbox CASCADE;
