-- +goose Up
-- Email Subsystem Tables

-- OAuth tokens for email providers
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
    account_email TEXT NOT NULL,
    access_token_enc BYTEA NOT NULL,
    refresh_token_enc BYTEA,
    expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email connectors (IMAP/SMTP/OAuth)
CREATE TABLE email_connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('inbound_imap', 'outbound_smtp', 'outbound_provider')),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- IMAP settings
    imap_host TEXT,
    imap_port INTEGER,
    imap_use_tls BOOLEAN DEFAULT true,
    imap_username TEXT,
    imap_password_enc BYTEA,
    imap_folder TEXT DEFAULT 'INBOX',
    imap_seen_strategy TEXT DEFAULT 'mark_seen_after_parse' CHECK (imap_seen_strategy IN ('mark_seen_after_parse', 'never', 'immediate')),
    
    -- SMTP settings
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_use_tls BOOLEAN DEFAULT true,
    smtp_username TEXT,
    smtp_password_enc BYTEA,
    
    -- OAuth reference
    oauth_provider TEXT CHECK (oauth_provider IN ('google', 'microsoft')),
    oauth_account_email TEXT,
    oauth_token_ref UUID REFERENCES oauth_tokens(id),
    
    -- From identity & branding
    from_name TEXT,
    from_address TEXT,
    reply_to_address TEXT,
    
    -- DKIM settings
    dkim_selector TEXT,
    dkim_public_key TEXT,
    dkim_private_key_enc BYTEA,
    return_path_domain TEXT,
    
    -- Provider webhook
    provider_webhook_secret TEXT,
    last_health JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email mailboxes (logical inbound addresses)
CREATE TABLE email_mailboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    inbound_connector_id UUID NOT NULL REFERENCES email_connectors(id) ON DELETE CASCADE,
    default_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    routing_rules JSONB DEFAULT '[]'::jsonb,
    allow_new_ticket BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, address)
);

-- Email transports (outbound)
CREATE TABLE email_transports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    outbound_connector_id UUID NOT NULL REFERENCES email_connectors(id) ON DELETE CASCADE,
    envelope_from_domain TEXT,
    dkim_selector TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inbound email processing log
CREATE TABLE email_inbound_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mailbox_address TEXT,
    message_id TEXT,
    thread_ref TEXT,
    from_address TEXT,
    to_addresses TEXT[],
    cc_addresses TEXT[],
    subject TEXT,
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected', 'error')),
    reason TEXT,
    ticket_id UUID REFERENCES tickets(id),
    project_id UUID REFERENCES projects(id),
    raw_headers BYTEA,
    raw_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outbound email log
CREATE TABLE email_outbound_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transport_id UUID NOT NULL REFERENCES email_transports(id),
    message_id TEXT,
    to_addresses TEXT[],
    subject TEXT,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'bounced', 'deferred', 'error')),
    bounce_reason TEXT,
    ticket_id UUID REFERENCES tickets(id),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email bounces
CREATE TABLE email_bounces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id TEXT,
    recipient TEXT,
    bounce_type TEXT NOT NULL CHECK (bounce_type IN ('hard', 'soft', 'complaint')),
    bounce_raw JSONB,
    occurred_at TIMESTAMPTZ NOT NULL,
    ticket_id UUID REFERENCES tickets(id),
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email suppressions
CREATE TABLE email_suppressions (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, address)
);

-- Ticket mail routing (VERP tokens)
CREATE TABLE ticket_mail_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    public_token TEXT NOT NULL,
    reply_address TEXT NOT NULL,
    message_id_root TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE (tenant_id, ticket_id)
);

-- Indexes for performance
CREATE INDEX idx_email_connectors_tenant ON email_connectors(tenant_id) WHERE is_active = true;
CREATE INDEX idx_email_mailboxes_tenant ON email_mailboxes(tenant_id);
CREATE INDEX idx_email_inbound_log_tenant_status ON email_inbound_log(tenant_id, status);
CREATE INDEX idx_email_outbound_log_tenant_status ON email_outbound_log(tenant_id, status);
CREATE INDEX idx_email_bounces_tenant ON email_bounces(tenant_id);
CREATE INDEX idx_ticket_mail_routing_token ON ticket_mail_routing(public_token) WHERE revoked_at IS NULL;
CREATE INDEX idx_ticket_mail_routing_ticket ON ticket_mail_routing(tenant_id, ticket_id) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_inbound_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbound_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_bounces ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_mail_routing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY oauth_tokens_tenant ON oauth_tokens
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_connectors_tenant ON email_connectors
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_mailboxes_tenant ON email_mailboxes
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_transports_tenant ON email_transports
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_inbound_log_tenant ON email_inbound_log
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_outbound_log_tenant ON email_outbound_log
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_bounces_tenant ON email_bounces
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY email_suppressions_tenant ON email_suppressions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY ticket_mail_routing_tenant ON ticket_mail_routing
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- +goose Down
DROP TABLE IF EXISTS ticket_mail_routing CASCADE;
DROP TABLE IF EXISTS email_suppressions CASCADE;
DROP TABLE IF EXISTS email_bounces CASCADE;
DROP TABLE IF EXISTS email_outbound_log CASCADE;
DROP TABLE IF EXISTS email_inbound_log CASCADE;
DROP TABLE IF EXISTS email_transports CASCADE;
DROP TABLE IF EXISTS email_mailboxes CASCADE;
DROP TABLE IF EXISTS email_connectors CASCADE;
DROP TABLE IF EXISTS oauth_tokens CASCADE;
