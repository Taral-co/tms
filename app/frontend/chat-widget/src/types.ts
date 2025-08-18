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
  visitor_name?: string
  last_activity?: string
}

export interface ChatWidget {
  id: string
  name: string
  primary_color: string
  secondary_color: string
  position: 'bottom-right' | 'bottom-left'
  widget_shape: 'rounded' | 'square' | 'minimal' | 'professional' | 'modern' | 'classic'
  chat_bubble_style: 'modern' | 'classic' | 'minimal' | 'rounded'
  widget_size: 'small' | 'medium' | 'large'
  animation_style: 'smooth' | 'bounce' | 'fade' | 'slide'
  custom_css?: string
  welcome_message: string
  offline_message: string
  custom_greeting?: string
  away_message: string
  agent_name: string
  agent_avatar_url?: string
  auto_open_delay: number
  show_agent_avatars: boolean
  allow_file_uploads: boolean
  require_email: boolean
  sound_enabled: boolean
  show_powered_by: boolean
  use_ai: boolean
  business_hours: Record<string, any>
}

export interface WidgetTheme {
  name: string
  shape: ChatWidget['widget_shape']
  description: string
  preview: string
  borderRadius: string
  shadow: string
  animation: string
  layout: 'compact' | 'standard' | 'spacious'
}

export interface SessionData {
  session_id: string
  session_token: string
  widget_id: string
  visitor_name: string
  visitor_email?: string
  created_at: string
  last_activity: string
  messages?: ChatMessage[]
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
  sender_name: string
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
  enableSessionPersistence?: boolean
  debugMode?: boolean
}

export interface NotificationSound {
  message: string
  notification: string
  error: string
}

export interface BusinessHours {
  enabled: boolean
  timezone: string
  schedule: {
    [key: string]: {
      open: string
      close: string
      enabled: boolean
    }
  }
}

export interface WidgetState {
  isOpen: boolean
  isMinimized: boolean
  hasUnread: boolean
  agentStatus: 'online' | 'away' | 'offline'
  currentSession?: SessionData
}
