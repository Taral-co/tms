import { z } from 'zod'

// User and authentication types
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'agent', 'customer']),
  tenant_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string()
})

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'inactive', 'suspended']),
  created_at: z.string(),
  updated_at: z.string()
})

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  tenant_id: z.string().uuid(),
  status: z.enum(['active', 'inactive']),
  created_at: z.string(),
  updated_at: z.string()
})

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  tenant_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string()
})

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['agent', 'admin']),
  tenant_id: z.string().uuid(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
})

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  user: UserSchema
})

// Ticket types
export const TicketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed', 'pending'])
export const TicketPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export const TicketTypeSchema = z.enum(['question', 'incident', 'problem', 'task'])
export const TicketSourceSchema = z.enum(['email', 'web', 'api', 'chat', 'phone'])

export const TicketSchema = z.object({
  id: z.string().uuid(),
  number: z.number(),
  tenant_id: z.string().uuid(),
  project_id: z.string().uuid(),
  subject: z.string(),
  status: TicketStatusSchema,
  priority: TicketPrioritySchema,
  type: TicketTypeSchema,
  source: TicketSourceSchema,
  customer_id: z.string().uuid(),
  assignee_agent_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  tags: z.array(z.string()).optional(),
  customer: CustomerSchema.optional(),
  assigned_agent: AgentSchema.optional(),
  project: ProjectSchema.optional()
})

// Message types
export const MessageSenderTypeSchema = z.enum(['customer', 'agent', 'system'])

export const MessageSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  sender_type: MessageSenderTypeSchema,
  sender_id: z.string().uuid(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    original_filename: z.string(),
    content_type: z.string(),
    size: z.number(),
    storage_path: z.string()
  })).optional()
})

// Integration types
export const IntegrationTypeSchema = z.enum(['email', 'webhook', 'api', 'chat'])
export const IntegrationStatusSchema = z.enum(['active', 'inactive', 'error'])

export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: IntegrationTypeSchema,
  status: IntegrationStatusSchema,
  config: z.record(z.any()),
  tenant_id: z.string().uuid(),
  project_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string()
})

// Notification types
export const NotificationTypeSchema = z.enum(['info', 'warning', 'error', 'success'])

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: NotificationTypeSchema,
  recipient_type: z.enum(['user', 'tenant', 'system']),
  recipient_id: z.string().uuid(),
  is_read: z.boolean(),
  tenant_id: z.string().uuid(),
  created_at: z.string()
})

// API Response types
export const ApiResponseSchema = z.object({
  data: z.any(),
  message: z.string().optional(),
  success: z.boolean()
})

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
  field: z.string().optional()
})

// Cursor-based pagination
export const CursorInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: z.string().nullable(),
  endCursor: z.string().nullable()
})

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    edges: z.array(z.object({
      node: itemSchema,
      cursor: z.string()
    })),
    pageInfo: CursorInfoSchema,
    totalCount: z.number()
  })

// Request schemas
export const CreateTicketRequestSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  priority: TicketPrioritySchema.default('normal'),
  type: TicketTypeSchema.default('question'),
  customer_id: z.string().uuid(),
  project_id: z.string().uuid(),
  tags: z.array(z.string()).optional()
})

export const UpdateTicketRequestSchema = z.object({
  subject: z.string().optional(),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  assignee_agent_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional()
})

export const CreateMessageRequestSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.instanceof(File)).optional()
})

// Query parameter schemas
export const BaseQueryParamsSchema = z.object({
  first: z.number().int().positive().max(100).optional(),
  after: z.string().optional(),
  last: z.number().int().positive().max(100).optional(),
  before: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional()
})

export const TicketFiltersSchema = z.object({
  status: z.array(TicketStatusSchema).optional(),
  priority: z.array(TicketPrioritySchema).optional(),
  type: z.array(TicketTypeSchema).optional(),
  source: z.array(TicketSourceSchema).optional(),
  assignee_agent_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  updated_after: z.string().datetime().optional(),
  updated_before: z.string().datetime().optional(),
  tags: z.array(z.string()).optional()
})

export const DateRangeParamsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// Infer TypeScript types from Zod schemas
export type User = z.infer<typeof UserSchema>
export type Tenant = z.infer<typeof TenantSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Customer = z.infer<typeof CustomerSchema>
export type Agent = z.infer<typeof AgentSchema>
export type Ticket = z.infer<typeof TicketSchema>
export type Message = z.infer<typeof MessageSchema>
export type Integration = z.infer<typeof IntegrationSchema>
export type Notification = z.infer<typeof NotificationSchema>

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type CreateTicketRequest = z.infer<typeof CreateTicketRequestSchema>
export type UpdateTicketRequest = z.infer<typeof UpdateTicketRequestSchema>
export type CreateMessageRequest = z.infer<typeof CreateMessageRequestSchema>

export type ApiResponse<T = any> = {
  data: T
  message?: string
  success: boolean
}

export type ApiError = z.infer<typeof ApiErrorSchema>
export type CursorInfo = z.infer<typeof CursorInfoSchema>
export type PaginatedResponse<T> = {
  edges: Array<{ node: T; cursor: string }>
  pageInfo: CursorInfo
  totalCount: number
}

export type BaseQueryParams = z.infer<typeof BaseQueryParamsSchema>
export type TicketFilters = z.infer<typeof TicketFiltersSchema>
export type DateRangeParams = z.infer<typeof DateRangeParamsSchema>

// Utility types
export type TicketStatus = z.infer<typeof TicketStatusSchema>
export type TicketPriority = z.infer<typeof TicketPrioritySchema>
export type TicketType = z.infer<typeof TicketTypeSchema>
export type TicketSource = z.infer<typeof TicketSourceSchema>
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>
export type NotificationType = z.infer<typeof NotificationTypeSchema>
export type MessageSenderType = z.infer<typeof MessageSenderTypeSchema>
export type UserRole = User['role']

// API Client interface
export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
  signal?: AbortSignal
}

export interface ApiClient {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>
}

// Tenant context
export interface TenantContext {
  tenantId: string
  projectId?: string
}
