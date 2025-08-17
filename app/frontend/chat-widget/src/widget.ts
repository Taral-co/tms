import { EventEmitter } from './events'
import { ChatAPI } from './api'
import { ChatMessage, ChatSession, ChatWidget, ChatWidgetOptions, WSMessage } from './types'

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
  private websocket: WebSocket | null = null
  private isOpen: boolean = false
  private messages: ChatMessage[] = []
  private isTyping: boolean = false

  constructor(private options: ChatWidgetOptions) {
    this.api = new ChatAPI(options.apiUrl)
    this.init()
  }

  private async init() {
    try {
      // Get widget configuration
      this.widget = await this.api.getWidgetByDomain(this.options.domain)
      
      // Create and inject widget UI
      this.createWidget()
      
      // Auto-open if configured
      if (this.widget.auto_open_delay > 0) {
        setTimeout(() => this.open(), this.widget.auto_open_delay * 1000)
      }
      
    } catch (error) {
      console.error('Failed to initialize chat widget:', error)
      this.emitter.emit('error', 'Failed to initialize chat widget')
    }
  }

  private createWidget() {
    console.log('Creating chat widget, widget:', JSON.stringify(this.widget))
    if (!this.widget) return

    // Create main container
    this.container = document.createElement('div')
    this.container.id = 'tms-chat-widget'
    this.container.style.cssText = `
      position: fixed;
      ${this.widget.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 350px;
      height: 500px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      overflow: hidden;
      background: white;
      display: none;
    `

    // Create widget content
    this.container.innerHTML = `
      <div id="tms-chat-header" style="
        background: ${this.widget.primary_color};
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div>
          <div style="font-weight: 600; font-size: 16px;">${this.widget.name}</div>
          <div id="tms-chat-status" style="font-size: 12px; opacity: 0.9;">Online</div>
        </div>
        <button id="tms-chat-close" style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        ">×</button>
      </div>
      
      <div id="tms-chat-body" style="
        height: calc(100% - 120px);
        display: flex;
        flex-direction: column;
      ">
        <div id="tms-chat-messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f8f9fa;
        "></div>
        
        <div id="tms-chat-typing" style="
          padding: 8px 16px;
          font-size: 12px;
          color: #666;
          min-height: 20px;
        "></div>
        
        <div id="tms-chat-input-container" style="
          padding: 16px;
          border-top: 1px solid #e9ecef;
          background: white;
        ">
          <div style="display: flex; gap: 8px;">
            <input 
              id="tms-chat-input" 
              type="text" 
              placeholder="Type your message..."
              style="
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 20px;
                outline: none;
                font-size: 14px;
              "
            />
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
            ">→</button>
          </div>
        </div>
      </div>
    `

    console.log('Widget container created:', this.container)

    // Create toggle button
    const toggleButton = document.createElement('div')
    toggleButton.id = 'tms-chat-toggle'
    toggleButton.style.cssText = `
      position: fixed;
      ${this.widget.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      background: ${this.widget.primary_color};
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      transition: transform 0.2s ease;
    `
    toggleButton.innerHTML = `
      <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    `

    // Add hover effect
    toggleButton.addEventListener('mouseenter', () => {
      toggleButton.style.transform = 'scale(1.1)'
    })
    
    toggleButton.addEventListener('mouseleave', () => {
      toggleButton.style.transform = 'scale(1)'
    })

    // Append to document
    document.body.appendChild(this.container)
    document.body.appendChild(toggleButton)
    console.log('Widget and toggle button appended to body')

    // Add event listeners AFTER elements are in DOM
    this.attachEventListeners()
  }

  private attachEventListeners() {
    console.log('Attaching event listeners...', this.container)
    if (!this.container) return
    console.log('Container is present')

    const toggleButton = document.getElementById('tms-chat-toggle')
    const closeButton = document.getElementById('tms-chat-close')
    const sendButton = document.getElementById('tms-chat-send')
    const input = document.getElementById('tms-chat-input') as HTMLInputElement

    console.log('Input element found:', input)
    console.log('Toggle button:', toggleButton, 'Close button:', closeButton, 'Send button:', sendButton)

    toggleButton?.addEventListener('click', () => this.toggle())
    closeButton?.addEventListener('click', () => this.close())
    sendButton?.addEventListener('click', () => this.sendMessage())
    
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage()
      }
    })

    input?.addEventListener('input', () => {
      this.handleTyping()
    })
  }

  private async open() {
    console.log('Opening chat widget, widget:', this.widget, 'container:', this.container)
    if (!this.widget || !this.container) {
      console.error('Missing widget or container!')
      return
    }

    console.log('Setting container display to block')
    this.container.style.display = 'block'
    this.isOpen = true
    console.log('Container display set, isOpen now:', this.isOpen)

    // Start chat session if not already started
    if (!this.session) {
      console.log('Starting chat session...')
      await this.startChatSession()
    }
  }

  private close() {
    if (!this.container) return
    
    this.container.style.display = 'none'
    this.isOpen = false
  }

  private toggle() {
    console.log('Chat widget toggle clicked, isOpen:', this.isOpen)
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  private async startChatSession() {
    console.log('startChatSession called, widget:', this.widget)
    if (!this.widget) return

    try {
      // Show welcome message first
      console.log('Adding welcome message...')
      this.addMessage({
        id: 'welcome',
        content: this.widget.welcome_message,
        author_type: 'system',
        author_name: this.widget.name,
        created_at: new Date().toISOString(),
        message_type: 'text',
        is_private: false
      })
      console.log('Welcome message added')

      // Get visitor info
      const visitorInfo = {
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
        visitor_id: await this.computeCrossBrowserFingerprint()
      }

      // Prompt for visitor name and email if required
      console.log('Prompting for visitor info...')
      
      // TEMPORARY: Skip the modal for debugging
      const visitorName = 'Test Visitor'
      console.log('Using test visitor name:', visitorName)
      
      //const visitorName = await this.promptForVisitorInfo()
      //console.log('Visitor name received:', visitorName)
      if (!visitorName) return

      // Initiate chat session
      const response = await this.api.initiateChat(this.widget.id, {
        visitor_name: visitorName,
        visitor_info: visitorInfo
      })

      this.session = {
        id: response.session_id,
        session_token: response.session_token,
        widget_id: this.widget.id,
        status: 'active'
      }

      // Connect WebSocket
      this.connectWebSocket()

      // Load existing messages
      await this.loadMessages()

      this.emitter.emit('session:started', this.session)

    } catch (error) {
      console.error('Failed to start chat session:', error)
      this.emitter.emit('error', 'Failed to start chat session')
    }
  }

  private async promptForVisitorInfo(): Promise<string | null> {
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
      const startButton = modal.querySelector('#start-chat')
      const cancelButton = modal.querySelector('#cancel-chat')

      console.log('Modal elements:', { nameInput, startButton, cancelButton })

      const cleanup = () => {
        document.body.removeChild(modal)
      }

      startButton?.addEventListener('click', () => {
        const name = nameInput?.value.trim()
        if (name) {
          cleanup()
          resolve(name)
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

      this.websocket.onmessage = (event) => {
        const message: WSMessage = JSON.parse(event.data)
        this.handleWebSocketMessage(message)
      }

      this.websocket.onclose = () => {
        // Attempt to reconnect after a delay
        setTimeout(() => this.connectWebSocket(), 3000)
      }

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
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
        break

      case 'agent_joined':
        this.updateStatus('Agent joined')
        this.emitter.emit('agent:joined', message.data)
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

      case 'error':
        this.emitter.emit('error', message.data.error)
        break
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
    
    const messagesContainer = document.getElementById('tms-chat-messages')
    if (!messagesContainer) return

    const messageEl = document.createElement('div')
    messageEl.style.cssText = `
      margin-bottom: 12px;
      display: flex;
      ${message.author_type === 'visitor' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `

    const isVisitor = message.author_type === 'visitor'
    const bubbleColor = isVisitor ? this.widget?.primary_color : '#e9ecef'
    const textColor = isVisitor ? 'white' : '#333'

    messageEl.innerHTML = `
      <div style="
        max-width: 70%;
        padding: 8px 12px;
        border-radius: 18px;
        background: ${bubbleColor};
        color: ${textColor};
        font-size: 14px;
        line-height: 1.4;
      ">
        ${!isVisitor ? `<div style="font-size: 12px; opacity: 0.7; margin-bottom: 2px;">${message.author_name}</div>` : ''}
        <div>${this.escapeHtml(message.content)}</div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
          ${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    `

    messagesContainer.appendChild(messageEl)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  private async sendMessage() {
    const input = document.getElementById('tms-chat-input') as HTMLInputElement
    if (!input || !this.session) return

    const content = input.value.trim()
    if (!content) return

    try {
      const message = await this.api.sendMessage(this.session.session_token, {
        content,
        message_type: 'text',
        sender_name: 'Visitor'
      })

      this.addMessage(message)
      this.emitter.emit('message:sent', message)
      
      input.value = ''
      
    } catch (error) {
      console.error('Failed to send message:', error)
      this.emitter.emit('error', 'Failed to send message')
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
    const toggleButton = document.getElementById('tms-chat-toggle')
    if (toggleButton) {
      toggleButton.remove()
    }
  }

  // Compute a cross-browser fingerprint using canvas, WebGL and navigator/screen properties.
  // Note: absolute guarantees across different browsers are impossible, but this produces
  // a reasonably stable fingerprint for the same device/environment.
  public async computeCrossBrowserFingerprint(): Promise<string> {
    try {
      const parts: string[] = []

      // Navigator properties
      try {
        parts.push(navigator.userAgent || '')
        // languages may be array
        // @ts-ignore
        parts.push((navigator.languages || []).join(','))
        // @ts-ignore
        parts.push((navigator.language || ''))
        // @ts-ignore
        parts.push((navigator.platform || ''))
        // @ts-ignore
        parts.push(String((navigator as any).hardwareConcurrency || ''))
        // @ts-ignore
        parts.push(String((navigator as any).deviceMemory || ''))
      } catch (e) {
        // ignore
      }

      // Screen properties
      try {
        parts.push(String(screen.width || ''))
        parts.push(String(screen.height || ''))
        parts.push(String(screen.colorDepth || ''))
      } catch (e) {}

      // Timezone offset
      try {
        parts.push(String(new Date().getTimezoneOffset()))
      } catch (e) {}

      // Canvas fingerprint
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = 200
          canvas.height = 60
          ctx.fillStyle = '#f60'
          ctx.fillRect(0, 0, 200, 60)
          ctx.fillStyle = '#069'
          ctx.font = '18px Arial'
          ctx.fillText('TMS Chat ' + navigator.userAgent, 10, 35)
          // draw a random shape
          ctx.beginPath()
          ctx.arc(50, 20, 15, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.fill()
          const dataUrl = canvas.toDataURL()
          parts.push(dataUrl)
        }
      } catch (e) {}

      // WebGL renderer info
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (gl) {
          const dbg = (gl as any).getExtension('WEBGL_debug_renderer_info')
          if (dbg) {
            const vendor = (gl as any).getParameter(dbg.UNMASKED_VENDOR_WEBGL)
            const renderer = (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL)
            parts.push(String(vendor))
            parts.push(String(renderer))
          }
        }
      } catch (e) {}

      const long = parts.join('||')
      // Use SubtleCrypto SHA-256 when available
      return await this.sha256Hex(long)
    } catch (e) {
      // fallback
      return this.simpleHashHex(String(Math.random()))
    }
  }

  private async sha256Hex(input: string): Promise<string> {
    try {
      if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder()
        const buf = enc.encode(input)
        const hash = await crypto.subtle.digest('SHA-256', buf)
        const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
        return hex
      }
    } catch (e) {
      // ignore and fall through to fallback
    }
    return this.simpleHashHex(input)
  }

  private simpleHashHex(input: string): string {
    let h = 2166136261 >>> 0
    for (let i = 0; i < input.length; i++) {
      h = Math.imul(h ^ input.charCodeAt(i), 16777619) >>> 0
    }
    return h.toString(16)
  }
}
