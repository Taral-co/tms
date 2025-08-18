// Chat types for agent console
export interface ChatWidget {
  id: string
  tenant_id: string
  project_id: string
  domain_id: string
  name: string
  is_active: boolean
  primary_color: string
  secondary_color: string
  position: 'bottom-right' | 'bottom-left'
  welcome_message: string
  offline_message: string
  auto_open_delay: number
  show_agent_avatars: boolean
  allow_file_uploads: boolean
  require_email: boolean
  business_hours: Record<string, any>
  embed_code?: string
  domain_name?: string
  // Enhanced properties from migration 019
  widget_shape?: 'rounded' | 'square' | 'minimal' | 'professional' | 'modern' | 'classic'
  chat_bubble_style?: 'modern' | 'classic' | 'minimal' | 'rounded'
  widget_size?: 'small' | 'medium' | 'large'
  animation_style?: 'smooth' | 'bounce' | 'fade' | 'slide'
  agent_name?: string
  agent_avatar_url?: string
  sound_enabled?: boolean
  show_powered_by?: boolean
  use_ai?: boolean
  custom_greeting?: string
  away_message?: string
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  tenant_id: string
  project_id: string
  widget_id: string
  session_token: string
  customer_id?: string
  ticket_id?: string
  status: 'active' | 'ended' | 'transferred'
  visitor_info: Record<string, any>
  assigned_agent_id?: string
  assigned_at?: string
  started_at: string
  ended_at?: string
  last_activity_at: string
  created_at: string
  updated_at: string
  assigned_agent_name?: string
  customer_name?: string
  customer_email?: string
  widget_name?: string
}

export interface ChatMessage {
  id: string
  tenant_id: string
  project_id: string
  session_id: string
  message_type: 'text' | 'file' | 'image' | 'system'
  content: string
  author_type: 'visitor' | 'agent' | 'system'
  author_id?: string
  author_name: string
  metadata: Record<string, any>
  is_private: boolean
  read_by_visitor: boolean
  read_by_agent: boolean
  read_at?: string
  created_at: string
}

export interface CreateChatWidgetRequest {
  domain_id: string
  name: string
  primary_color?: string
  secondary_color?: string
  position?: 'bottom-right' | 'bottom-left'
  welcome_message?: string
  offline_message?: string
  auto_open_delay?: number
  show_agent_avatars?: boolean
  allow_file_uploads?: boolean
  require_email?: boolean
  business_hours?: Record<string, any>
}

export interface UpdateChatWidgetRequest {
  name?: string
  is_active?: boolean
  primary_color?: string
  secondary_color?: string
  position?: 'bottom-right' | 'bottom-left'
  welcome_message?: string
  offline_message?: string
  auto_open_delay?: number
  show_agent_avatars?: boolean
  allow_file_uploads?: boolean
  require_email?: boolean
  business_hours?: Record<string, any>
}

export interface SendChatMessageRequest {
  content: string
  message_type?: 'text' | 'file' | 'image'
  is_private?: boolean
  metadata?: Record<string, any>
}

export interface AssignChatSessionRequest {
  agent_id: string
}

export interface ChatSessionFilters {
  status?: string
  assigned_agent_id?: string
  widget_id?: string
  limit?: number
}
