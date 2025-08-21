// Notification types for the frontend
export interface Notification {
  id: string
  tenant_id: string
  project_id?: string
  agent_id: string
  type: 'ticket_assigned' | 'ticket_updated' | 'ticket_escalated' | 'ticket_resolved' | 
        'message_received' | 'mention_received' | 'sla_warning' | 'sla_breach' |
        'system_alert' | 'maintenance_notice' | 'feature_announcement'
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  channels: ('web' | 'email' | 'slack' | 'sms' | 'push')[]
  action_url?: string
  metadata?: Record<string, any>
  is_read: boolean
  read_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface NotificationCount {
  total: number
  unread: number
}

export interface NotificationSettings {
  sound_enabled: boolean
  browser_notifications: boolean
  email_notifications: boolean
  notification_types: {
    ticket_assigned: boolean
    ticket_updated: boolean
    ticket_escalated: boolean
    ticket_resolved: boolean
    message_received: boolean
    mention_received: boolean
    sla_warning: boolean
    sla_breach: boolean
    system_alert: boolean
    maintenance_notice: boolean
    feature_announcement: boolean
  }
}
