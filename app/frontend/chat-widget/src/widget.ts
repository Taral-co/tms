import { EventEmitter } from './events'
import { ChatAPI } from './api'
import { ChatMessage, ChatSession, ChatWidget, ChatWidgetOptions, WSMessage, SessionData, WidgetState } from './types'
import { SessionStorage, generateVisitorFingerprint, isBusinessHours } from './storage'
import { injectWidgetCSS, getWidgetTheme, playNotificationSound } from './themes'

type Events = {
  'message:received': ChatMessage
  'message:sent': ChatMessage
  'session:started': ChatSession
  'session:ended': ChatSession
  'agent:joined': { agent_name: string }
  'agent:typing': { agent_name: string }
  'error': string
}

export class TMSChatWidget {
  private api: ChatAPI
  private emitter = new EventEmitter<Events>()
  private widget: ChatWidget | null = null
  private session: ChatSession | null = null
  private container: HTMLElement | null = null
  private toggleButton: HTMLElement | null = null
  private websocket: WebSocket | null = null
  private isOpen: boolean = false
  private messages: ChatMessage[] = []
  private isTyping: boolean = false
  private storage: SessionStorage
  private unreadCount: number = 0
  private isBusinessHoursOpen: boolean = true
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 3000

  constructor(private options: ChatWidgetOptions) {
    this.api = new ChatAPI(options.apiUrl)
    this.storage = new SessionStorage(options.widgetId)
    this.init()
  }

  private getBubbleStyleIcon(style?: string): string {
    switch (style) {
      case 'modern':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>`
      case 'classic':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>`
      case 'minimal':
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16v12H5.17L4 17.17V4m0-2c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"/>
        </svg>`
      case 'bot':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot-icon lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`
      default:
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>`
    }
  }

  private async init() {
    try {
      // Check for existing session first
      await this.restoreSession()
      
      // Get widget configuration
      this.widget = await this.api.getWidgetByDomain(this.options.domain)
      
      if (!this.widget) {
        throw new Error('Widget not found for domain')
      }

      // Check business hours
      this.isBusinessHoursOpen = isBusinessHours(this.widget.business_hours)
      
      // Inject CSS styles
      injectWidgetCSS(this.widget)
      
      // Create and inject widget UI
      this.createWidget()
      
      // Load existing messages if we have a session
      if (this.session) {
        await this.loadMessages()
        this.connectWebSocket()
      }
      
      // Auto-open if configured and no existing session
      if (this.widget.auto_open_delay > 0 && !this.session) {
        setTimeout(() => this.open(), this.widget.auto_open_delay * 1000)
      }
      
    } catch (error) {
      console.error('Failed to initialize chat widget:', error)
      this.emitter.emit('error', 'Failed to initialize chat widget')
    }
  }

  private async restoreSession() {
    const existingSession = this.storage.getSession()
    if (existingSession) {
      this.session = {
        id: existingSession.session_id,
        session_token: existingSession.session_token,
        widget_id: existingSession.widget_id,
        status: 'active'
      }
      
      // Load cached messages
      this.messages = this.storage.getMessages()
      this.storage.updateSessionActivity()
    }
  }

  private createWidget() {
    if (!this.widget) return

    const theme = getWidgetTheme(this.widget)

    // Create main container
    this.container = document.createElement('div')
    this.container.id = 'tms-chat-widget'
    this.container.className = 'tms-widget-container'

    // Create header with agent info
    const headerHTML = `
      <div class="tms-chat-header">
        <div class="tms-agent-info">
          ${this.widget.show_agent_avatars && this.widget.agent_avatar_url ? 
            `<div class="tms-agent-avatar">
              <img src="${this.widget.agent_avatar_url}" alt="${this.widget.agent_name}" />
            </div>` :
            `<div class="tms-agent-avatar">${this.widget.agent_name.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div style="font-weight: 600; font-size: 16px;">${this.widget.agent_name}</div>
            <div id="tms-chat-status" style="font-size: 12px; opacity: 0.9;">
              ${this.isBusinessHoursOpen ? 'Online' : 'Away'}
            </div>
          </div>
        </div>
        <button id="tms-chat-close" style="
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        " aria-label="Close chat">×</button>
      </div>
    `

    // Create body with messages area
    const bodyHTML = `
      <div id="tms-chat-body" style="
        height: calc(100% - 140px);
        display: flex;
        flex-direction: column;
        background: #f8f9fa;
      ">
        <div id="tms-chat-messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          scroll-behavior: smooth;
        "></div>
        
        <div id="tms-chat-typing" style="
          padding: 8px 16px;
          font-size: 12px;
          color: #666;
          min-height: 20px;
          font-style: italic;
        "></div>
        
        <div id="tms-chat-input-container" style="
          padding: 16px;
          border-top: 1px solid #e9ecef;
          background: white;
        ">
          <div style="display: flex; gap: 8px; align-items: flex-end;">
            ${this.widget.allow_file_uploads ? `
              <label for="tms-file-input" style="
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
              " title="Attach file">
                📎
                <input id="tms-file-input" type="file" style="display: none;" accept="image/*,.pdf,.doc,.docx,.txt" />
              </label>
            ` : ''}
            <textarea 
              id="tms-chat-input" 
              placeholder="Type your message..."
              rows="1"
              style="
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 20px;
                outline: none;
                font-size: 14px;
                font-family: inherit;
                resize: none;
                max-height: 100px;
                min-height: 40px;
                line-height: 1.4;
              "
            ></textarea>
            <button id="tms-chat-send" style="
              background: ${this.widget.primary_color};
              color: white;
              border: none;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              transition: all 0.2s;
            " title="Send message" aria-label="Send message">
              →
            </button>
          </div>
          ${this.widget.show_powered_by ? `
            <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #9ca3af;">
              Powered by TMS Chat
            </div>
          ` : ''}
        </div>
      </div>
    `

    this.container.innerHTML = headerHTML + bodyHTML

    // Create toggle button with notification badge
    this.toggleButton = document.createElement('button')
    this.toggleButton.id = 'tms-chat-toggle'
    this.toggleButton.className = 'tms-toggle-button'
    this.toggleButton.setAttribute('aria-label', 'Open chat')
    this.toggleButton.innerHTML = `
      ${this.getBubbleStyleIcon(this.widget.chat_bubble_style)}
      ${this.unreadCount > 0 ? `
        <div class="tms-notification-badge">${this.unreadCount > 9 ? '9+' : this.unreadCount}</div>
      ` : ''}
    `

    // Append to document
    document.body.appendChild(this.container)
    document.body.appendChild(this.toggleButton)

    // Add event listeners
    this.attachEventListeners()

    // Show initial message if we have cached messages
    if (this.messages.length > 0) {
      this.messages.forEach(msg => this.displayMessage(msg))
    } else if (!this.session) {
      // Show welcome message for new visitors
      this.showWelcomeMessage()
    }
  }

  private showWelcomeMessage() {
    if (!this.widget) return
    
    const welcomeMsg = this.widget.custom_greeting || this.widget.welcome_message
    const message: ChatMessage = {
      id: 'welcome-' + Date.now(),
      content: welcomeMsg,
      author_type: 'system',
      author_name: this.widget.agent_name,
      created_at: new Date().toISOString(),
      message_type: 'text',
      is_private: false
    }
    
    this.displayMessage(message)
  }

  private displayMessage(message: ChatMessage) {
    const messagesContainer = document.getElementById('tms-chat-messages')
    if (!messagesContainer) return

    const messageEl = document.createElement('div')
    messageEl.style.cssText = `
      margin-bottom: 12px;
      display: flex;
      ${message.author_type === 'visitor' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `

    const isVisitor = message.author_type === 'visitor'
    const isSystem = message.author_type === 'system'
    
    // Use theme-based message bubble class
    messageEl.innerHTML = `
      <div class="tms-message-bubble ${isVisitor ? 'visitor' : 'agent'}" style="${
        isSystem ? 'background: #e2e8f0; color: #475569; font-style: italic;' : ''
      }">
        ${!isVisitor && !isSystem && this.widget?.show_agent_avatars ? 
          `<div style="font-size: 12px; opacity: 0.7; margin-bottom: 2px;">${message.author_name}</div>` : 
          ''
        }
        <div>${this.escapeHtml(message.content)}</div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
          ${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `

    messagesContainer.appendChild(messageEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight

    // Play notification sound for new messages
    if (message.author_type === 'agent' && this.widget?.sound_enabled) {
      playNotificationSound('message', true)
    }
  }

  private attachEventListeners() {
    if (!this.container || !this.toggleButton) return

    const closeButton = this.container.querySelector('#tms-chat-close')
    const sendButton = this.container.querySelector('#tms-chat-send')
    const input = this.container.querySelector('#tms-chat-input') as HTMLTextAreaElement
    const fileInput = this.container.querySelector('#tms-file-input') as HTMLInputElement

    // Toggle button
    this.toggleButton.addEventListener('click', () => this.toggle())

    // Close button
    closeButton?.addEventListener('click', () => this.close())

    // Send button
    sendButton?.addEventListener('click', () => this.sendMessage())

    // Input field - auto-resize and send on Enter
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    input?.addEventListener('input', () => {
      this.handleTyping()
      this.autoResizeTextarea(input)
    })

    // File upload
    fileInput?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        this.handleFileUpload(files[0])
      }
    })

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  private autoResizeTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto'
    const maxHeight = 100
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = newHeight + 'px'
  }

  private async handleFileUpload(file: File) {
    if (!this.session || !this.widget?.allow_file_uploads) return

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      this.showError('File size must be less than 10MB')
      return
    }

    try {
      // Here you would implement file upload to your backend
      // For now, just show a placeholder message
      const message: ChatMessage = {
        id: 'file-' + Date.now(),
        content: `📎 Uploaded: ${file.name}`,
        author_type: 'visitor',
        author_name: 'You',
        created_at: new Date().toISOString(),
        message_type: 'file',
        is_private: false
      }
      
      this.addMessage(message)
    } catch (error) {
      this.showError('Failed to upload file')
    }
  }

  private showError(message: string) {
    // Create a temporary error message
    const errorMsg: ChatMessage = {
      id: 'error-' + Date.now(),
      content: `⚠️ ${message}`,
      author_type: 'system',
      author_name: 'System',
      created_at: new Date().toISOString(),
      message_type: 'text',
      is_private: false
    }
    
    this.displayMessage(errorMsg)
    
    if (this.widget?.sound_enabled) {
      playNotificationSound('error', true)
    }
  }

  private async open() {
    if (!this.widget || !this.container) return

    // Add opening animation class
    this.container.classList.add('opening')
    this.container.classList.add('open')
    this.isOpen = true

    // Update toggle button accessibility
    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-label', 'Close chat')
    }

    // Start chat session if not already started
    if (!this.session) {
      await this.startChatSession()
    } else {
      // Update activity for existing session
      this.storage.updateSessionActivity()
    }

    // Focus input after opening
    setTimeout(() => {
      const input = document.getElementById('tms-chat-input')
      input?.focus()
    }, 300)
  }

  private close() {
    if (!this.container) return
    
    this.container.classList.add('closing')
    this.container.classList.remove('open')
    this.isOpen = false

    // Update toggle button
    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-label', 'Open chat')
    }

    // Clear notification badge
    this.unreadCount = 0
    this.updateNotificationBadge()

    // Save widget state
    this.storage.saveWidgetState({
      is_minimized: false,
      unread_count: 0,
      last_interaction: new Date().toISOString()
    })

    setTimeout(() => {
      this.container?.classList.remove('opening', 'closing')
    }, 300)
  }

  private toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private updateNotificationBadge() {
    if (!this.toggleButton) return

    const badge = this.toggleButton.querySelector('.tms-notification-badge')
    if (this.unreadCount > 0) {
      if (!badge) {
        const badgeEl = document.createElement('div')
        badgeEl.className = 'tms-notification-badge'
        badgeEl.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount.toString()
        this.toggleButton.appendChild(badgeEl)
      } else {
        badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount.toString()
      }
    } else if (badge) {
      badge.remove()
    }
  }

  private updateToggleButtonIcon() {
    if (!this.toggleButton || !this.widget) return
    
    const currentBadge = this.toggleButton.querySelector('.tms-notification-badge')
    const badgeHTML = currentBadge ? currentBadge.outerHTML : ''
    
    this.toggleButton.innerHTML = `
      ${this.getBubbleStyleIcon(this.widget.chat_bubble_style)}
      ${badgeHTML}
    `
  }

  private async startChatSession() {
    if (!this.widget) return

    try {
      // Get or prompt for visitor info
      let visitorName = 'Anonymous'
      let visitorEmail: string | undefined

      const storedVisitor = this.storage.getVisitorInfo()
      if (storedVisitor) {
        visitorName = storedVisitor.name
        visitorEmail = storedVisitor.email
      } else {
        const visitorInfo = await this.promptForVisitorInfo()
        if (!visitorInfo) return

        visitorName = visitorInfo.name
        visitorEmail = visitorInfo.email

        // Store visitor info for future sessions
        const fingerprint = await generateVisitorFingerprint()
        this.storage.saveVisitorInfo({
          name: visitorName,
          email: visitorEmail,
          fingerprint,
          last_visit: new Date().toISOString()
        })
      }

      // Prepare visitor context
      const visitorContext = {
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
        visitor_id: await generateVisitorFingerprint(),
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }

      // Initiate chat session
      const response = await this.api.initiateChat(this.widget.id, {
        visitor_name: visitorName,
        visitor_email: visitorEmail,
        visitor_info: visitorContext
      })

      this.session = {
        id: response.session_id,
        session_token: response.session_token,
        widget_id: this.widget.id,
        status: 'active'
      }

      // Save session to storage
      this.storage.saveSession({
        session_id: response.session_id,
        session_token: response.session_token,
        widget_id: this.widget.id,
        visitor_name: visitorName,
        visitor_email: visitorEmail,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })

      // Connect WebSocket for real-time communication
      this.connectWebSocket()

      // Load existing messages
      await this.loadMessages()

      this.emitter.emit('session:started', this.session)

    } catch (error) {
      console.error('Failed to start chat session:', error)
      this.emitter.emit('error', 'Failed to start chat session')
      
      // Show error in chat
      this.showError('Unable to connect. Please try again.')
    }
  }

  private async promptForVisitorInfo(): Promise<{name: string; email?: string} | null> {
    console.log('Creating visitor info modal...')
    return new Promise((resolve) => {
      const modal = document.createElement('div')
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10002;
      `

      modal.innerHTML = `
        <div style="
          background: white;
          padding: 24px;
          border-radius: 8px;
          width: 300px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        ">
          <h3 style="margin: 0 0 16px 0; color: #333;">Start Chat</h3>
          <input 
            id="visitor-name" 
            type="text" 
            placeholder="Your name"
            style="
              width: 100%;
              padding: 10px;
              margin-bottom: 16px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            "
          />
          ${this.widget?.require_email ? `
            <input 
              id="visitor-email" 
              type="email" 
              placeholder="Your email"
              style="
                width: 100%;
                padding: 10px;
                margin-bottom: 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
              "
            />
          ` : ''}
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="cancel-chat" style="
              padding: 8px 16px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 4px;
              cursor: pointer;
            ">Cancel</button>
            <button id="start-chat" style="
              padding: 8px 16px;
              background: ${this.widget?.primary_color};
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            ">Start Chat</button>
          </div>
        </div>
      `

      document.body.appendChild(modal)
      console.log('Modal appended to body')

      const nameInput = modal.querySelector('#visitor-name') as HTMLInputElement
      const emailInput = modal.querySelector('#visitor-email') as HTMLInputElement
      const startButton = modal.querySelector('#start-chat')
      const cancelButton = modal.querySelector('#cancel-chat')

      console.log('Modal elements:', { nameInput, startButton, cancelButton })

      const cleanup = () => {
        document.body.removeChild(modal)
      }

      startButton?.addEventListener('click', () => {
        const name = nameInput?.value.trim()
        const email = emailInput?.value.trim()
        if (name) {
          cleanup()
          resolve({ name, email: email || undefined })
        }
      })

      cancelButton?.addEventListener('click', () => {
        cleanup()
        resolve(null)
      })

      nameInput?.focus()
    })
  }

  private connectWebSocket() {
    if (!this.session) return

    try {
      const wsUrl = this.api.getWebSocketUrl(this.session.session_token)
      this.websocket = new WebSocket(wsUrl)

      this.websocket.onopen = () => {
        this.reconnectAttempts = 0
        this.updateStatus('Connected')
      }

      this.websocket.onmessage = (event) => {
        const message: WSMessage = JSON.parse(event.data)
        this.handleWebSocketMessage(message)
      }

      this.websocket.onclose = () => {
        this.updateStatus(this.isBusinessHoursOpen ? 'Connecting...' : 'Away')
        
        // Attempt to reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
          setTimeout(() => this.connectWebSocket(), delay)
        }
      }

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.updateStatus('Connection error')
      }

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  private handleWebSocketMessage(message: WSMessage) {
    switch (message.type) {
      case 'chat_message':
        this.addMessage(message.data)
        this.emitter.emit('message:received', message.data)
        
        // Increment unread count if widget is closed
        if (!this.isOpen && message.data.author_type === 'agent') {
          this.unreadCount++
          this.updateNotificationBadge()
          
          if (this.widget?.sound_enabled) {
            playNotificationSound('notification', true)
          }
        }
        break

      case 'agent_joined':
        this.updateStatus(`${message.data.agent_name} joined`)
        this.emitter.emit('agent:joined', message.data)
        
        // Show system message
        const joinMessage: ChatMessage = {
          id: 'agent-joined-' + Date.now(),
          content: `${message.data.agent_name} has joined the conversation`,
          author_type: 'system',
          author_name: 'System',
          created_at: new Date().toISOString(),
          message_type: 'text',
          is_private: false
        }
        this.addMessage(joinMessage)
        break

      case 'typing_start':
        if (message.data.author_type === 'agent') {
          this.showTypingIndicator(message.data.author_name)
          this.emitter.emit('agent:typing', message.data)
        }
        break

      case 'typing_stop':
        this.hideTypingIndicator()
        break

      case 'session_update':
        if (message.data.status === 'ended') {
          this.handleSessionEnd()
        }
        break

      case 'error':
        this.emitter.emit('error', message.data.error)
        this.showError(message.data.error)
        break
    }
  }

  private handleSessionEnd() {
    this.updateStatus('Session ended')
    
    const endMessage: ChatMessage = {
      id: 'session-ended-' + Date.now(),
      content: 'The conversation has ended. Feel free to start a new chat if you need further assistance.',
      author_type: 'system',
      author_name: 'System',
      created_at: new Date().toISOString(),
      message_type: 'text',
      is_private: false
    }
    
    this.addMessage(endMessage)
    
    // Clear session
    this.session = null
    this.storage.clearSession()
    
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
  }

  private async loadMessages() {
    if (!this.session) return

    try {
      const response = await this.api.getMessages(this.session.session_token)
      response.messages.forEach(message => this.addMessage(message))
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  private addMessage(message: ChatMessage) {
    this.messages.push(message)
    this.displayMessage(message)
    
    // Save to storage
    this.storage.addMessage(message)
    this.storage.updateSessionActivity()
  }

  private async sendMessage() {
    const input = document.getElementById('tms-chat-input') as HTMLTextAreaElement
    if (!input || !this.session) return

    const content = input.value.trim()
    if (!content) return

    try {
      const message = await this.api.sendMessage(this.session.session_token, {
        content,
        message_type: 'text',
        sender_name: 'You'
      })

      this.addMessage(message)
      this.emitter.emit('message:sent', message)
      
      input.value = ''
      input.style.height = 'auto'
      
    } catch (error) {
      console.error('Failed to send message:', error)
      this.emitter.emit('error', 'Failed to send message')
      this.showError('Failed to send message. Please try again.')
    }
  }

  private handleTyping() {
    // Send typing indicator via WebSocket
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      if (!this.isTyping) {
        this.isTyping = true
        this.websocket.send(JSON.stringify({
          type: 'typing_start',
          session_id: this.session?.id,
          data: {}
        }))

        // Stop typing after 3 seconds of inactivity
        setTimeout(() => {
          if (this.isTyping) {
            this.isTyping = false
            this.websocket?.send(JSON.stringify({
              type: 'typing_stop',
              session_id: this.session?.id,
              data: {}
            }))
          }
        }, 3000)
      }
    }
  }

  private showTypingIndicator(agentName: string) {
    const typingEl = document.getElementById('tms-chat-typing')
    if (typingEl) {
      typingEl.textContent = `${agentName} is typing...`
    }
  }

  private hideTypingIndicator() {
    const typingEl = document.getElementById('tms-chat-typing')
    if (typingEl) {
      typingEl.textContent = ''
    }
  }

  private updateStatus(status: string) {
    const statusEl = document.getElementById('tms-chat-status')
    if (statusEl) {
      statusEl.textContent = status
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  // Public API
  public on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void) {
    this.emitter.on(event, handler)
  }

  public off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void) {
    this.emitter.off(event, handler)
  }

  public destroy() {
    if (this.websocket) {
      this.websocket.close()
    }
    if (this.container) {
      this.container.remove()
    }
    if (this.toggleButton) {
      this.toggleButton.remove()
    }
    
    // Remove styles
    const styles = document.getElementById('tms-widget-styles')
    if (styles) {
      styles.remove()
    }
    
    // Clear storage if requested
    if (this.options.enableSessionPersistence === false) {
      this.storage.cleanup()
    }
  }

  // Public API methods for external control
  public openWidget() {
    this.open()
  }

  public closeWidget() {
    this.close()
  }

  public toggleWidget() {
    this.toggle()
  }

  public sendExternalMessage(content: string) {
    if (!this.session) return
    
    const input = document.getElementById('tms-chat-input') as HTMLTextAreaElement
    if (input) {
      input.value = content
      this.sendMessage()
    }
  }

  public getSessionInfo() {
    return {
      hasActiveSession: this.session !== null,
      isOpen: this.isOpen,
      unreadCount: this.unreadCount,
      sessionAge: this.storage.getSessionAge(),
      messageCount: this.messages.length
    }
  }

  public updateWidgetConfig(updates: Partial<ChatWidget>) {
    if (this.widget) {
      Object.assign(this.widget, updates)
      injectWidgetCSS(this.widget)
      this.updateToggleButtonIcon()
    }
  }
}
