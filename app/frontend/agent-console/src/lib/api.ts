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
  sender_type: 'customer' | 'agent' | 'system'
  sender_id: string
  content: string
  created_at: string
  attachments?: {
    id: string
    filename: string
    content_type: string
    size: number
    url: string
  }[]
}

export interface CreateMessageRequest {
  content: string
  attachments?: File[]
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
  type: 'email' | 'webhook' | 'api' | 'chat'
  status: 'active' | 'inactive' | 'error'
  config: Record<string, any>
  tenant_id: string
  project_id: string
  created_at: string
  updated_at: string
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
          config.url.startsWith('/integrations') || 
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

  // Message endpoints
  async getTicketMessages(ticketId: string): Promise<Message[]> {
    const response: AxiosResponse<Message[]> = await this.client.get(`/tickets/${ticketId}/messages`)
    return response.data
  }

  async createMessage(ticketId: string, data: CreateMessageRequest): Promise<Message> {
    const formData = new FormData()
    formData.append('content', data.content)
    
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file)
      })
    }

    const response: AxiosResponse<Message> = await this.client.post(
      `/tickets/${ticketId}/messages`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
}

export const apiClient = new APIClient()
export default apiClient
