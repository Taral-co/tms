// Ticket priority levels
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

// Ticket status options
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'

// Base ticket interface
export interface Ticket {
  id: string
  tenant_id: string
  project_id: string
  ticket_number: string
  subject: string
  description?: string
  status: TicketStatus
  priority: TicketPriority
  customer_email: string
  customer_name?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  tags?: string[]
  metadata?: Record<string, any>
}

// Public ticket view (limited fields for public access)
export interface PublicTicket {
  id: string
  ticket_number: string
  subject: string
  description?: string
  status: TicketStatus
  priority: TicketPriority
  customer_email: string
  customer_name?: string
  created_at: string
  updated_at: string
}

// Ticket message/comment
export interface TicketMessage {
  id: string
  ticket_id: string
  content: string
  sender_email: string
  sender_name?: string
  is_internal: boolean
  created_at: string
  updated_at: string
  attachments?: TicketAttachment[]
}

// File attachments
export interface TicketAttachment {
  id: string
  message_id: string
  filename: string
  content_type: string
  size: number
  url: string
  created_at: string
}

// Ticket creation request
export interface CreateTicketRequest {
  subject: string
  description?: string
  priority: TicketPriority
  customer_email: string
  customer_name?: string
  project_id: string
  tags?: string[]
}

// Ticket update request
export interface UpdateTicketRequest {
  subject?: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  assigned_to?: string
  tags?: string[]
}

// Message creation request
export interface CreateMessageRequest {
  content: string
  is_internal?: boolean
  attachments?: File[]
}

// Ticket filters for listing
export interface TicketFilters {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  assigned_to?: string[]
  customer_email?: string
  project_id?: string
  tags?: string[]
  created_after?: string
  created_before?: string
  search?: string
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// API response for ticket listing
export interface TicketListResponse {
  tickets: Ticket[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// Ticket analytics/stats
export interface TicketStats {
  total: number
  open: number
  in_progress: number
  waiting_on_customer: number
  resolved: number
  closed: number
  by_priority: Record<TicketPriority, number>
  avg_resolution_time_hours?: number
  avg_first_response_time_hours?: number
}
