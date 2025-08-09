// Base API types
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  error: string
  details?: string
  code?: string
  field?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>
}

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
  signal?: AbortSignal
}

// Query parameters
export interface BaseQueryParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

// Tenant context
export interface TenantContext {
  tenantId: string
  projectId?: string
}

// Entity Types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'agent' | 'customer'
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  tenant_id: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  email: string
  role: 'agent' | 'admin'
  tenant_id: string
  is_active: boolean
  created_at: string
  updated_at: string
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
  
  // Relations
  customer?: Customer
  assigned_agent?: Agent
  project?: Project
  messages?: Message[]
}

export interface Message {
  id: string
  ticket_id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_id: string
  content: string
  created_at: string
  
  // Relations
  sender?: User | Customer | Agent
  attachments?: FileAttachment[]
}

export interface FileAttachment {
  id: string
  filename: string
  original_filename: string
  content_type: string
  size: number
  storage_path: string
  tenant_id: string
  uploaded_by: string
  created_at: string
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

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  recipient_type: 'user' | 'tenant' | 'system'
  recipient_id: string
  is_read: boolean
  tenant_id: string
  created_at: string
}

// Request Types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
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

export interface CreateMessageRequest {
  content: string
  attachments?: File[]
}

// Filter Types
export interface TicketFilters {
  status?: string[]
  priority?: string[]
  assigned_agent_id?: string
  customer_id?: string
  project_id?: string
  created_after?: string
  created_before?: string
}

// Utility Types
export type TicketStatus = Ticket['status']
export type TicketPriority = Ticket['priority']
export type IntegrationType = Integration['type']
export type UserRole = User['role']
export type NotificationType = Notification['type']
