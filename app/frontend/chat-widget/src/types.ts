// Chat Widget Types
export interface ChatMessage {
  id: string
  content: string
  author_type: 'visitor' | 'agent' | 'system'
  author_name: string
  created_at: string
  message_type: 'text' | 'file' | 'image'
  is_private: boolean
}

export interface ChatSession {
  id: string
  session_token: string
  widget_id: string
  status: 'active' | 'ended'
  assigned_agent_name?: string
}

export interface ChatWidget {
  id: string
  name: string
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
}

export interface InitiateChatRequest {
  visitor_name: string
  visitor_email?: string
  initial_message?: string
  visitor_info: Record<string, any>
}

export interface SendMessageRequest {
  content: string
  message_type?: 'text' | 'file' | 'image'
}

export interface WSMessage {
  type: 'chat_message' | 'typing_start' | 'typing_stop' | 'session_update' | 'agent_joined' | 'error'
  session_id: string
  data: any
  timestamp: string
}

export interface ChatWidgetOptions {
  apiUrl?: string
  widgetId: string
  domain: string
}
