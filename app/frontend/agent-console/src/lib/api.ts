import axios, { AxiosInstance, AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
    tenant_id: string
  }
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  customer_id: string
  assigned_agent_id?: string
  tenant_id: string
  project_id: string
  created_at: string
  updated_at: string
  customer?: {
    id: string
    name: string
    email: string
  }
  assigned_agent?: {
    id: string
    name: string
    email: string
  }
}

export interface CreateTicketRequest {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  customer_id: string
  project_id: string
}

export interface UpdateTicketRequest {
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigned_agent_id?: string
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
    // Request interceptor to add auth token and tenant ID
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      const tenantId = localStorage.getItem('tenant_id') || this.tenantId

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      if (tenantId && !config.url?.includes('/tenants/')) {
        // Add tenant ID to URL path for tenant-scoped endpoints
        const segments = config.url?.split('/') || []
        if (segments.length > 0 && !segments.includes(tenantId)) {
          config.url = `/tenants/${tenantId}${config.url}`
        }
      }

      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('tenant_id')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  setTenantId(tenantId: string) {
    this.tenantId = tenantId
    localStorage.setItem('tenant_id', tenantId)
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const tenantId = localStorage.getItem('tenant_id') || 'default'
    const response: AxiosResponse<LoginResponse> = await this.client.post(
      `/tenants/${tenantId}/auth/login`,
      data
    )
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
      localStorage.setItem('tenant_id', response.data.user.tenant_id)
      this.setTenantId(response.data.user.tenant_id)
    }
    
    return response.data
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('tenant_id')
    this.tenantId = null
  }

  // Ticket endpoints
  async getTickets(): Promise<Ticket[]> {
    const response: AxiosResponse<Ticket[]> = await this.client.get('/tickets')
    return response.data
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

  // Analytics endpoints
  async getAnalytics(period: string = '7d') {
    const response = await this.client.get(`/analytics?period=${period}`)
    return response.data
  }
}

export const apiClient = new APIClient()
export default apiClient
