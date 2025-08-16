import { ChatMessage, ChatSession, ChatWidget, InitiateChatRequest, SendMessageRequest } from './types'

export class ChatAPI {
  private baseUrl: string

  constructor(apiUrl: string = 'http://localhost:8080/v1') {
    this.baseUrl = apiUrl
  }

  async getWidgetByDomain(domain: string): Promise<ChatWidget> {
    const response = await fetch(`${this.baseUrl}/public/chat/widgets/domain/${domain}`)
    if (!response.ok) {
      throw new Error(`Failed to get widget: ${response.statusText}`)
    }
    return response.json()
  }

  async initiateChat(widgetId: string, request: InitiateChatRequest): Promise<{ session_id: string, session_token: string }> {
    const response = await fetch(`${this.baseUrl}/public/chat/widgets/${widgetId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to initiate chat: ${response.statusText}`)
    }
    
    return response.json()
  }

  async getSession(sessionToken: string): Promise<ChatSession> {
    const response = await fetch(`${this.baseUrl}/public/chat/sessions/${sessionToken}`)
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`)
    }
    return response.json()
  }

  async getMessages(sessionToken: string): Promise<{ messages: ChatMessage[] }> {
    const response = await fetch(`${this.baseUrl}/public/chat/sessions/${sessionToken}/messages`)
    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`)
    }
    return response.json()
  }

  async sendMessage(sessionToken: string, request: SendMessageRequest): Promise<ChatMessage> {
    const response = await fetch(`${this.baseUrl}/public/chat/sessions/${sessionToken}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`)
    }
    
    return response.json()
  }

  async markMessagesAsRead(sessionToken: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/public/chat/sessions/${sessionToken}/read`, {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to mark messages as read: ${response.statusText}`)
    }
  }

  getWebSocketUrl(sessionToken: string): string {
    const wsUrl = this.baseUrl.replace('http', 'ws')
    return `${wsUrl}/public/chat/ws?session_token=${sessionToken}`
  }
}
