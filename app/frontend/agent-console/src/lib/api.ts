import axios, { AxiosInstance, AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1'

export interface User {
  id: string
  email: string
  name: string
  role: string
  tenant_id: string
  current_project_id?: string
}

export interface Project {
  id: string
  tenant_id: string
  key: string
  name: string
  status?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
  projects?: Project[]
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}

export interface TicketsResponse {
  tickets: Ticket[]
  next_cursor?: string
}

export interface Ticket {
  id: string
  number: number
  subject: string
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  type: 'question' | 'incident' | 'problem' | 'task'
  source: 'web' | 'email' | 'api' | 'phone' | 'chat'
  requester_id: string
  customer_name: string
  assignee_agent_id?: string
  tenant_id: string
  project_id: string
  created_at: string
  updated_at: string
  assigned_agent?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateTicketRequest {
  subject: string
  description?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  type: 'question' | 'incident' | 'problem' | 'task'
  source: 'web' | 'email' | 'api' | 'phone' | 'chat'
  requester_id: string
}

export interface EmailSettings {
  // SMTP Configuration
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  smtp_encryption: 'tls' | 'ssl' | 'none'
  
  // IMAP Configuration
  imap_host: string
  imap_port: number
  imap_username: string
  imap_password: string
  imap_encryption: 'tls' | 'ssl' | 'none'
  imap_folder: string
  
  // Email Settings
  from_email: string
  from_name: string
  enable_email_notifications: boolean
  enable_email_to_ticket: boolean
}

export interface DnsMetaData {
  dns_record: string
  dns_value: string
}

export interface DomainValidation {
  id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  validation_token?: string
  metadata: DnsMetaData
  verification_proof?: string
  file_name?: string
  file_content?: string
  verified_at?: string
  created_at: string
  updated_at: string
  project_id?: string
  project_name?: string
}

export interface BrandingSettings {
  company_name: string
  logo_url: string
  support_url: string
  primary_color: string
  accent_color: string
  secondary_color: string
  custom_css: string
  favicon_url: string
  header_logo_height: number
  enable_custom_branding: boolean
}

export interface AutomationSettings {
  enable_auto_assignment: boolean
  assignment_strategy: string
  max_tickets_per_agent: number
  enable_escalation: boolean
  escalation_threshold_hours: number
  enable_auto_reply: boolean
  auto_reply_template: string
}

export interface UpdateTicketRequest {
  subject?: string
  description?: string
  status?: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  assignee_agent_id?: string
}

export interface Message {
  id: string
  ticket_id: string
  author_type: 'customer' | 'agent' | 'system'
  author_id: string
  body: string
  is_private: boolean
  created_at: string
  attachments?: {
    id: string
    filename: string
    content_type: string
    size: number
    url: string
  }[]
}

export interface MessagesResponse {
  messages: Message[]
  next_cursor?: string
}

export interface CreateMessageRequest {
  content: string
  attachments?: File[]
}

export interface ReassignTicketRequest {
  assignee_agent_id?: string
  note?: string
}

export interface CustomerValidationResult {
  success: boolean
  message: string
  smtp_configured: boolean
  otp_sent?: boolean
}

export interface MagicLinkResult {
  success: boolean
  message: string
  smtp_configured: boolean
  link_sent?: boolean
}

export interface EmailInbox {
  id: string
  message_id: string
  from_address: string
  from_name?: string
  to_addresses: string[]
  subject: string
  snippet?: string
  body_text?: string
  body_html?: string
  sent_at: string
  received_at: string
  is_read: boolean
  is_reply: boolean
  has_attachments: boolean
  attachment_count: number
  is_converted_to_ticket: boolean
  ticket_id?: string
  mailbox_address: string
}

export interface EmailInboxResponse {
  emails: EmailInbox[]
  total: number
}

export interface EmailFilter {
  search?: string
  mailbox?: string
  is_read?: boolean
  is_reply?: boolean
  has_attachments?: boolean
  from_date?: string
  to_date?: string
  page?: number
  limit?: number
}

export interface ConvertToTicketRequest {
  type: string
  priority: string
}

export interface EmailConnector {
  id: string
  project_id: string
  name: string
  type: 'inbound_imap' | 'outbound_smtp'
  from_address: string
  reply_to_address: string
  imap_host?: string
  imap_port?: number
  imap_username?: string
  smtp_host: string
  smtp_port: number
  smtp_username: string
  is_validated: boolean
  validation_status: 'pending' | 'validating' | 'validated' | 'failed'
  created_at: string
  updated_at: string
}

export interface EmailMailbox {
  id: string
  project_id: string
  address: string
  inbound_connector_id: string
  allow_new_ticket: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailConnectorRequest {
  name: string
  type: 'inbound_imap' | 'outbound_smtp'
  from_address: string
  reply_to_address: string
  imap_host?: string
  imap_port?: number
  imap_username?: string
  imap_password?: string
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
}

export interface EmailMailboxRequest {
  address: string
  inbound_connector_id: string
  allow_new_ticket: boolean
}

export interface ValidateConnectorRequest {
  email: string
}

export interface VerifyOTPRequest {
  email: string
  otp: string
}

export interface ApiKey {
  id: string
  name: string
  key_preview: string
  created_at: string
  last_used?: string
  is_active: boolean
}

export interface Agent {
  id: string
  name: string
  email: string
  created_at: string
  is_active: boolean
  roles?: Array<{
    role: string
    project_id?: string
    project_name?: string
  }>
}

export interface AgentProject {
  id: string
  name: string
  role: string
}

export interface Integration {
  id: string
  name: string
  type: 'slack' | 'jira' | 'calendly' | 'zapier' | 'webhook' | 'custom' | 'microsoft_teams' | 'github' | 'linear' | 'asana' | 'trello' | 'notion' | 'hubspot' | 'salesforce' | 'zendesk' | 'freshdesk' | 'intercom' | 'discord' | 'google_calendar' | 'zoom' | 'stripe' | 'shopify' | 'email' | 'api' | 'chat'
  status: 'active' | 'inactive' | 'error' | 'configuring'
  config: Record<string, any>
  auth_method?: 'oauth' | 'api_key' | 'none'
  auth_data?: Record<string, any>
  tenant_id: string
  project_id: string
  last_sync_at?: string
  last_error?: string
  created_at: string
  updated_at: string
}

export interface IntegrationCategory {
  id: string
  name: string
  display_name: string
  description?: string
  icon?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface IntegrationTemplate {
  id: string
  category_id: string
  type: string
  name: string
  display_name: string
  description?: string
  logo_url?: string
  website_url?: string
  documentation_url?: string
  auth_method: 'oauth' | 'api_key' | 'none'
  config_schema: Record<string, any>
  default_config: Record<string, any>
  supported_events: string[]
  is_featured: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface IntegrationCategoryWithTemplates extends IntegrationCategory {
  templates: IntegrationTemplate[]
}

export interface IntegrationWithTemplate extends Integration {
  template?: IntegrationTemplate
  category?: IntegrationCategory
}

class APIClient {
  private client: AxiosInstance
  private tenantId: string | null = null
  private projectId: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and build proper URLs
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      const tenantId = localStorage.getItem('tenant_id') || this.tenantId
      const projectId = localStorage.getItem('project_id') || this.projectId

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Build the correct URL structure based on the endpoint
      if (config.url && tenantId) {
        // Auth endpoints: /tenants/{tenant_id}/auth/*
        if (config.url.includes('/auth/') && !config.url.includes('/tenants/')) {
          config.url = `/tenants/${tenantId}${config.url}`
        }
        // Tenant-level endpoints: /tenants/{tenant_id}/* (projects, agents, api-keys at tenant level)
        else if ((
          config.url.startsWith('/projects') || 
          config.url.startsWith('/agents') || 
          config.url.startsWith('/api-keys')
        ) && !config.url.includes('/tenants/')) {
          config.url = `/tenants/${tenantId}${config.url}`
        }
        // Project-scoped endpoints: /tenants/{tenant_id}/projects/{project_id}/* (tickets, integrations, email)
        else if (projectId && (
          config.url.startsWith('/tickets') || 
          config.url.startsWith('/integrations') ||
          config.url.startsWith('/email') || 
          config.url.startsWith('/settings') ||
          config.url.startsWith('/analytics')
        ) && !config.url.includes('/tenants/')) {
          config.url = `/tenants/${tenantId}/projects/${projectId}${config.url}`
        }
      }

      return config
    })

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Try to refresh the token
            await this.refreshToken()
            
            // Retry the original request with new token
            const token = localStorage.getItem('auth_token')
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            
            return this.client(originalRequest)
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('auth_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('tenant_id')
            localStorage.removeItem('user_data')
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  setTenantId(tenantId: string) {
    this.tenantId = tenantId
    localStorage.setItem('tenant_id', tenantId)
  }

  setProjectId(projectId: string) {
    this.projectId = projectId
    localStorage.setItem('project_id', projectId)
  }

  // Enterprise admin endpoints (cross-tenant)
  async getTenants(): Promise<Array<{id: string, name: string, status: string, region: string, created_at: string, updated_at: string}>> {
    // Use enterprise route that bypasses tenant-scoped interceptor
    const enterpriseClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
    })
    
    const response = await enterpriseClient.get('/enterprise/tenants')
    return response.data.tenants || []
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const tenantId = localStorage.getItem('tenant_id') || '550e8400-e29b-41d4-a716-446655440000'
    
    // Create a separate axios instance for login to avoid the interceptor adding tenant to URL
    const loginClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const response = await loginClient.post<LoginResponse>(`/tenants/${tenantId}/auth/login`, {
      email: data.email,
      password: data.password
    })
    
    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token)
    }
    
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token)
    }

    // Set default project (Customer Support project)
    const defaultProjectId = '550e8400-e29b-41d4-a716-446655440001'
    this.setProjectId(defaultProjectId)
    
    return response.data
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = localStorage.getItem('refresh_token')
    const tenantId = localStorage.getItem('tenant_id') || '550e8400-e29b-41d4-a716-446655440000'
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const refreshClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await refreshClient.post<RefreshTokenResponse>(`/tenants/${tenantId}/auth/refresh`, {
      refresh_token: refreshToken
    })

    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token)
    }

    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token)
    }

    return response.data
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('tenant_id')
    localStorage.removeItem('project_id')
    localStorage.removeItem('user_data')
    this.tenantId = null
    this.projectId = null
  }

  // Project endpoints
  async getProjects(): Promise<Project[]> {
    console.log("beullani")
    const response: AxiosResponse<Project[]> = await this.client.get('/projects')
    return response.data
  }

  async getProject(id: string): Promise<Project> {
    const response: AxiosResponse<Project> = await this.client.get(`/projects/${id}`)
    return response.data
  }

  async createProject(data: { key: string; name: string }): Promise<Project> {
    const response: AxiosResponse<Project> = await this.client.post('/projects', data)
    return response.data
  }

  async updateProject(id: string, data: { key: string; name: string; status: string }): Promise<Project> {
    const response: AxiosResponse<Project> = await this.client.put(`/projects/${id}`, data)
    return response.data
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.delete(`/projects/${id}`)
  }

  // Agent endpoints (tenant-scoped)
  async getAgents(): Promise<Agent[]> {
    const response = await this.client.get('/agents')
    return response.data.agents || []
  }

  async createAgent(data: { name: string; email: string; password: string; role: string }): Promise<Agent> {
    const response = await this.client.post('/agents', data)
    return response.data
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    const response = await this.client.patch(`/agents/${id}`, data)
    return response.data
  }

  async deleteAgent(id: string): Promise<void> {
    await this.client.delete(`/agents/${id}`)
  }

  // Agent project assignment endpoints
  async getAgentProjects(agentId: string): Promise<AgentProject[]> {
    const response = await this.client.get(`/agents/${agentId}/projects`)
    return response.data.projects || []
  }

  async assignAgentToProject(agentId: string, projectId: string, role: string): Promise<void> {
    await this.client.post(`/agents/${agentId}/projects/${projectId}`, { role })
  }

  async removeAgentFromProject(agentId: string, projectId: string): Promise<void> {
    await this.client.delete(`/agents/${agentId}/projects/${projectId}`)
  }

  // Ticket endpoints
  async getTickets(): Promise<Ticket[]> {
    const response: AxiosResponse<TicketsResponse> = await this.client.get('/tickets')
    return response.data.tickets
  }

  async getTicket(id: string): Promise<Ticket> {
    const response: AxiosResponse<Ticket> = await this.client.get(`/tickets/${id}`)
    return response.data
  }

  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    const response: AxiosResponse<Ticket> = await this.client.post('/tickets', data)
    return response.data
  }

  async updateTicket(id: string, data: UpdateTicketRequest): Promise<Ticket> {
    const response: AxiosResponse<Ticket> = await this.client.put(`/tickets/${id}`, data)
    return response.data
  }

  async deleteTicket(id: string): Promise<void> {
    await this.client.delete(`/tickets/${id}`)
  }

  async reassignTicket(id: string, data: ReassignTicketRequest): Promise<Ticket> {
    const response: AxiosResponse<Ticket> = await this.client.post(`/tickets/${id}/reassign`, data)
    return response.data
  }

  async validateCustomer(ticketId: string): Promise<CustomerValidationResult> {
    const response: AxiosResponse<CustomerValidationResult> = await this.client.post(`/tickets/${ticketId}/validate-customer`)
    return response.data
  }

  async sendMagicLinkToCustomer(ticketId: string): Promise<MagicLinkResult> {
    const response: AxiosResponse<MagicLinkResult> = await this.client.post(`/tickets/${ticketId}/send-magic-link`)
    return response.data
  }

  // Message endpoints
  async getTicketMessages(ticketId: string, cursor?: string, limit?: number): Promise<MessagesResponse> {
    const params = new URLSearchParams()
    if (cursor) params.append('cursor', cursor)
    if (limit) params.append('limit', limit.toString())
    
    const response: AxiosResponse<MessagesResponse> = await this.client.get(
      `/tickets/${ticketId}/messages?${params.toString()}`
    )
    return response.data
  }

  async createMessage(ticketId: string, data: CreateMessageRequest): Promise<Message> {
    const response: AxiosResponse<Message> = await this.client.post(
      `/tickets/${ticketId}/messages`,
      {
        body: data.content,
        is_private: false
      }
    )
    return response.data
  }

  // Integration endpoints
  async getIntegrations(): Promise<Integration[]> {
    const response: AxiosResponse<Integration[]> = await this.client.get('/integrations')
    return response.data
  }

  async getIntegration(id: string): Promise<Integration> {
    const response: AxiosResponse<Integration> = await this.client.get(`/integrations/${id}`)
    return response.data
  }

  async createIntegration(data: Partial<Integration>): Promise<Integration> {
    const response: AxiosResponse<Integration> = await this.client.post('/integrations', data)
    return response.data
  }

  async updateIntegration(id: string, data: Partial<Integration>): Promise<Integration> {
    const response: AxiosResponse<Integration> = await this.client.put(`/integrations/${id}`, data)
    return response.data
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.client.delete(`/integrations/${id}`)
  }

  // Enhanced integration endpoints
  async getIntegrationCategories(featured?: boolean): Promise<{ categories: IntegrationCategoryWithTemplates[] }> {
    const params = featured ? { featured: 'true' } : {}
    const response = await this.client.get('/integrations/categories', { params })
    return response.data
  }

  async getIntegrationTemplates(categoryId?: string, featured?: boolean): Promise<{ templates: IntegrationTemplate[] }> {
    const params: Record<string, string> = {}
    if (categoryId) params.category_id = categoryId
    if (featured !== undefined) params.featured = featured.toString()
    const response = await this.client.get('/integrations/templates', { params })
    return response.data
  }

  async getIntegrationTemplate(type: string): Promise<IntegrationTemplate> {
    const response: AxiosResponse<IntegrationTemplate> = await this.client.get(`/integrations/templates/${type}`)
    return response.data
  }

  async getIntegrationsWithTemplates(type?: string, status?: string): Promise<{ integrations: IntegrationWithTemplate[] }> {
    const params: Record<string, string> = {}
    if (type) params.type = type
    if (status) params.status = status
    const response = await this.client.get('/integrations/with-templates', { params })
    return response.data
  }

  async startOAuthFlow(integrationType: string, redirectUrl?: string): Promise<{ oauth_url: string; state: string }> {
    const response = await this.client.post('/integrations/oauth/start', {
      integration_type: integrationType,
      redirect_url: redirectUrl
    })
    return response.data
  }

  async handleOAuthCallback(type: string, code: string, state: string): Promise<Integration> {
    const response: AxiosResponse<Integration> = await this.client.post(`/integrations/${type}/oauth/callback`, {
      code,
      state
    })
    return response.data
  }

  async testIntegration(id: string): Promise<{ result: string; message: string }> {
    const response = await this.client.post(`/integrations/${id}/test`)
    return response.data
  }

  async getIntegrationMetrics(id: string): Promise<any> {
    const response = await this.client.get(`/integrations/${id}/metrics`)
    return response.data
  }

  // API Key endpoints (project-scoped)
  async getApiKeys(): Promise<ApiKey[]> {
    const response = await this.client.get('/api-keys')
    return response.data || []
  }

  async createApiKey(data: { name: string }): Promise<ApiKey & { key: string }> {
    const response = await this.client.post('/api-keys', data)
    return response.data
  }

  async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const response = await this.client.patch(`/api-keys/${id}`, data)
    return response.data.api_key
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.client.delete(`/api-keys/${id}`)
  }

  // Email Inbox endpoints  
  async getEmailInbox(filter: EmailFilter = {}): Promise<EmailInboxResponse> {
    const params = new URLSearchParams()
    if (filter.search) params.append('search', filter.search)
    if (filter.mailbox) params.append('mailbox', filter.mailbox)
    if (filter.is_read !== undefined) params.append('is_read', filter.is_read.toString())
    if (filter.is_reply !== undefined) params.append('is_reply', filter.is_reply.toString())
    if (filter.has_attachments !== undefined) params.append('has_attachments', filter.has_attachments.toString())
    if (filter.from_date) params.append('from_date', filter.from_date)
    if (filter.to_date) params.append('to_date', filter.to_date)
    if (filter.page) params.append('page', filter.page.toString())
    if (filter.limit) params.append('limit', filter.limit.toString())

    const response: AxiosResponse<EmailInboxResponse> = await this.client.get(`/email/inbox?${params}`)
    return response.data
  }

  async syncEmails(): Promise<void> {
    await this.client.post('/email/inbox/sync')
  }

  async convertEmailToTicket(emailId: string, ticketData: ConvertToTicketRequest): Promise<void> {
    await this.client.post(`/email/inbox/${emailId}/convert-to-ticket`, ticketData)
  }

  async markEmailAsRead(emailId: string): Promise<void> {
    await this.client.post(`/email/inbox/${emailId}/mark-read`)
  }

  async replyToEmail(emailId: string, body: string): Promise<void> {
    await this.client.post(`/email/inbox/${emailId}/reply`, { body })
  }

  // Analytics endpoints
  async getAnalytics(period: string = '7d') {
    const response = await this.client.get(`/analytics?period=${period}`)
    return response.data
  }

  // Settings endpoints
  async getEmailSettings(): Promise<EmailSettings> {
    const response = await this.client.get('/settings/email')
    return response.data
  }

  async updateEmailSettings(data: EmailSettings): Promise<EmailSettings> {
    const response = await this.client.put('/settings/email', data)
    return response.data
  }

  async getBrandingSettings(): Promise<BrandingSettings> {
    const response = await this.client.get('/settings/branding')
    return response.data
  }

  async updateBrandingSettings(data: BrandingSettings): Promise<BrandingSettings> {
    const response = await this.client.put('/settings/branding', data)
    return response.data
  }

  async getAutomationSettings(): Promise<AutomationSettings> {
    const response = await this.client.get('/settings/automation')
    return response.data
  }

  async updateAutomationSettings(data: AutomationSettings): Promise<AutomationSettings> {
    const response = await this.client.put('/settings/automation', data)
    return response.data
  }

  // Email Connector endpoints
  async getEmailConnectors(): Promise<{ connectors: EmailConnector[] }> {
    const response: AxiosResponse<{ connectors: EmailConnector[] }> = await this.client.get('/email/connectors')
    return response.data
  }

  async getEmailConnector(id: string): Promise<EmailConnector> {
    const response: AxiosResponse<EmailConnector> = await this.client.get(`/email/connectors/${id}`)
    return response.data
  }

  async createEmailConnector(data: EmailConnectorRequest): Promise<EmailConnector> {
    const response: AxiosResponse<EmailConnector> = await this.client.post('/email/connectors', data)
    return response.data
  }

  async updateEmailConnector(id: string, data: EmailConnectorRequest): Promise<EmailConnector> {
    const response: AxiosResponse<EmailConnector> = await this.client.put(`/email/connectors/${id}`, data)
    return response.data
  }

  async deleteEmailConnector(id: string): Promise<void> {
    await this.client.delete(`/email/connectors/${id}`)
  }

  async validateEmailConnector(id: string, data: ValidateConnectorRequest): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.post(`/email/connectors/${id}/validate`, data)
    return response.data
  }

  async verifyEmailConnectorOTP(id: string, data: VerifyOTPRequest): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.post(`/email/connectors/${id}/verify-otp`, data)
    return response.data
  }

  // Email Mailbox endpoints
  async getEmailMailboxes(): Promise<{ mailboxes: EmailMailbox[] }> {
    const response: AxiosResponse<{ mailboxes: EmailMailbox[] }> = await this.client.get('/email/mailboxes')
    return response.data
  }

  async createEmailMailbox(data: EmailMailboxRequest): Promise<EmailMailbox> {
    const response: AxiosResponse<EmailMailbox> = await this.client.post('/email/mailboxes', data)
    return response.data
  }

  async updateEmailMailbox(id: string, data: EmailMailboxRequest): Promise<EmailMailbox> {
    const response: AxiosResponse<EmailMailbox> = await this.client.put(`/email/mailboxes/${id}`, data)
    return response.data
  }

  async deleteEmailMailbox(id: string): Promise<void> {
    await this.client.delete(`/email/mailboxes/${id}`)
  }

  // Domain Validation endpoints
  async getDomainValidations(): Promise<DomainValidation[]> {
    const response: AxiosResponse<{ domains: DomainValidation[] }> = await this.client.get(`/email/domains`)
    return response.data.domains
  }

  async createDomainValidation(data: { domain: string; }): Promise<DomainValidation> {
    const response: AxiosResponse<DomainValidation> = await this.client.post(`/email/domains`, data)
    return response.data
  }

  async verifyDomainValidation(domainId: string, data: { proof: string }): Promise<{ success: boolean; message: string }> {
    const response: AxiosResponse<{ success: boolean; message: string }> = await this.client.post(`/email/domains/${domainId}/verify`, data)
    return response.data
  }

  async deleteDomainValidation(domainId: string): Promise<void> {
    await this.client.delete(`/email/domains/${domainId}`)
  }
}

export const apiClient = new APIClient()
export default apiClient
