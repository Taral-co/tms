// Session storage and persistence utilities
import type { SessionData, ChatMessage } from './types'

const STORAGE_KEYS = {
  SESSION: 'tms_chat_session',
  MESSAGES: 'tms_chat_messages',
  VISITOR_INFO: 'tms_visitor_info',
  WIDGET_STATE: 'tms_widget_state'
} as const

export interface StoredVisitorInfo {
  name: string
  email?: string
  fingerprint: string
  last_visit: string
}

export interface WidgetStateData {
  is_minimized: boolean
  unread_count: number
  last_interaction: string
}

export class SessionStorage {
  private widgetId: string
  private storagePrefix: string

  constructor(widgetId: string) {
    this.widgetId = widgetId
    this.storagePrefix = `tms_${widgetId}_`
  }

  private getKey(key: string): string {
    return `${this.storagePrefix}${key}`
  }

  private isStorageAvailable(): boolean {
    try {
      const test = '__tms_storage_test__'
      localStorage.setItem(test, 'test')
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  // Session management
  saveSession(session: SessionData): void {
    if (!this.isStorageAvailable()) return

    try {
      const sessionData = {
        ...session,
        last_activity: new Date().toISOString()
      }
      localStorage.setItem(this.getKey(STORAGE_KEYS.SESSION), JSON.stringify(sessionData))
    } catch (error) {
      console.warn('Failed to save session:', error)
    }
  }

  getSession(): SessionData | null {
    if (!this.isStorageAvailable()) return null

    try {
      const stored = localStorage.getItem(this.getKey(STORAGE_KEYS.SESSION))
      if (!stored) return null

      const session = JSON.parse(stored) as SessionData
      
      // Check if session is expired (24 hours)
      const lastActivity = new Date(session.last_activity)
      const now = new Date()
      const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff > 24) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.warn('Failed to get session:', error)
      return null
    }
  }

  clearSession(): void {
    if (!this.isStorageAvailable()) return

    try {
      localStorage.removeItem(this.getKey(STORAGE_KEYS.SESSION))
      localStorage.removeItem(this.getKey(STORAGE_KEYS.MESSAGES))
    } catch (error) {
      console.warn('Failed to clear session:', error)
    }
  }

  updateSessionActivity(): void {
    const session = this.getSession()
    if (session) {
      session.last_activity = new Date().toISOString()
      this.saveSession(session)
    }
  }

  // Messages management
  saveMessages(messages: ChatMessage[]): void {
    if (!this.isStorageAvailable()) return

    try {
      // Only store last 50 messages to prevent storage bloat
      const messagesToStore = messages.slice(-50)
      localStorage.setItem(this.getKey(STORAGE_KEYS.MESSAGES), JSON.stringify(messagesToStore))
    } catch (error) {
      console.warn('Failed to save messages:', error)
    }
  }

  getMessages(): ChatMessage[] {
    if (!this.isStorageAvailable()) return []

    try {
      const stored = localStorage.getItem(this.getKey(STORAGE_KEYS.MESSAGES))
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to get messages:', error)
      return []
    }
  }

  addMessage(message: ChatMessage): void {
    const messages = this.getMessages()
    messages.push(message)
    this.saveMessages(messages)
  }

  // Visitor info management
  saveVisitorInfo(info: StoredVisitorInfo): void {
    if (!this.isStorageAvailable()) return

    try {
      localStorage.setItem(this.getKey(STORAGE_KEYS.VISITOR_INFO), JSON.stringify(info))
    } catch (error) {
      console.warn('Failed to save visitor info:', error)
    }
  }

  getVisitorInfo(): StoredVisitorInfo | null {
    if (!this.isStorageAvailable()) return null

    try {
      const stored = localStorage.getItem(this.getKey(STORAGE_KEYS.VISITOR_INFO))
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('Failed to get visitor info:', error)
      return null
    }
  }

  // Widget state management
  saveWidgetState(state: WidgetStateData): void {
    if (!this.isStorageAvailable()) return

    try {
      localStorage.setItem(this.getKey(STORAGE_KEYS.WIDGET_STATE), JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save widget state:', error)
    }
  }

  getWidgetState(): WidgetStateData | null {
    if (!this.isStorageAvailable()) return null

    try {
      const stored = localStorage.getItem(this.getKey(STORAGE_KEYS.WIDGET_STATE))
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.warn('Failed to get widget state:', error)
      return null
    }
  }

  // Utility methods
  hasActiveSession(): boolean {
    const session = this.getSession()
    return session !== null && session.session_token !== ''
  }

  getSessionAge(): number {
    const session = this.getSession()
    if (!session) return 0

    const lastActivity = new Date(session.last_activity)
    const now = new Date()
    return Math.floor((now.getTime() - lastActivity.getTime()) / 1000) // seconds
  }

  cleanup(): void {
    if (!this.isStorageAvailable()) return

    try {
      // Remove old storage entries for this widget
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.storagePrefix)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to cleanup storage:', error)
    }
  }

  // Export/import for debugging
  exportData(): Record<string, any> {
    return {
      session: this.getSession(),
      messages: this.getMessages(),
      visitorInfo: this.getVisitorInfo(),
      widgetState: this.getWidgetState()
    }
  }

  importData(data: Record<string, any>): void {
    if (data.session) this.saveSession(data.session)
    if (data.messages) this.saveMessages(data.messages)
    if (data.visitorInfo) this.saveVisitorInfo(data.visitorInfo)
    if (data.widgetState) this.saveWidgetState(data.widgetState)
  }
}

// Global utilities
export function generateVisitorFingerprint(): Promise<string> {
  // This is a simplified version - you might want to use a more sophisticated fingerprinting library
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      canvas.width = 200
      canvas.height = 50
      ctx.fillStyle = '#f60'
      ctx.fillRect(0, 0, 200, 50)
      ctx.fillStyle = '#069'
      ctx.font = '14px Arial'
      ctx.fillText(`${navigator.userAgent.slice(0, 50)}`, 2, 20)
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|')
      
      // Simple hash function
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      
      resolve(Math.abs(hash).toString(36))
    } else {
      resolve(Math.random().toString(36).substring(2))
    }
  })
}

export function isBusinessHours(businessHours: any): boolean {
  if (!businessHours?.enabled) return true

  try {
    const now = new Date()
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const day = dayNames[now.getDay()]
    const time = now.toTimeString().slice(0, 5) // HH:MM
    
    const schedule = businessHours.schedule?.[day]
    if (!schedule?.enabled) return false
    
    return time >= schedule.open && time <= schedule.close
  } catch {
    return true // Default to available if parsing fails
  }
}
