import { useRef, useEffect, useCallback, useState } from 'react'
import { useAuth } from './useAuth'
import { apiClient } from '../lib/api'
import type { ChatMessage, ChatSession } from '../types/chat'

interface WSMessage {
  type: 'chat_message' | 'typing_start' | 'typing_stop' | 'session_update' | 'agent_joined' | 'session_assigned' | 'error'
  session_id: string
  data: any
  timestamp: string
  from_type: 'visitor' | 'agent' | 'system'
}

interface UseWebSocketOptions {
  sessionId?: string
  onMessage?: (message: ChatMessage) => void
  onSessionUpdate?: (session: ChatSession) => void
  onTyping?: (data: { isTyping: boolean; agentName?: string }) => void
  onError?: (error: string) => void
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastMessage: WSMessage | null
}

/**
 * Enterprise WebSocket hook for real-time chat communications
 * Follows WCAG AA guidelines and enterprise security patterns
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user, isAuthenticated } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null
  })

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const connect = useCallback((connectingFrom: string) => {
    if (!isAuthenticated || !user) return

    if (connectingFrom === 'manual-retry') {
      reconnectAttemptsRef.current = 0
    }

    // For agent WebSocket, we need a session ID
    if (!options.sessionId) {
      console.log('WebSocket: No session ID provided, skipping connection')
      return
    }

    // Prevent multiple simultaneous connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket: Already connected or connecting, skipping')
      return
    }

    // Stop if we've already exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('WebSocket: Max reconnect attempts reached, not connecting')
      return
    }

    console.log('WebSocket: Attempting to connect from', connectingFrom)

    cleanup()

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // The backend expects: /v1/chat/ws/:session_id?agent_id=xxx
      const token = localStorage.getItem('auth_token')
      const wsUrl = `${apiClient.getChatWebSocketUrl()}/${options.sessionId}?token=${token}`

      console.log('WebSocket: Attempting to connect to:', wsUrl, 'from ->',connectingFrom)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false, 
          error: null 
        }))
        reconnectAttemptsRef.current = 0

        // Set up heartbeat
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          
          setState(prev => ({ ...prev, lastMessage: message }))

          // Handle different message types
          switch (message.type) {
            case 'chat_message':
              if (options.onMessage && message.data) {
                // Convert WebSocket message data to ChatMessage format
                const chatMessage: ChatMessage = {
                  id: message.data.id,
                  tenant_id: user?.tenant_id || '',
                  project_id: message.data.project_id || '',
                  session_id: message.session_id,
                  content: message.data.content,
                  author_type: message.data.author_type,
                  author_id: message.data.author_id,
                  author_name: message.data.author_name,
                  created_at: message.data.created_at,
                  message_type: message.data.message_type || 'text',
                  is_private: message.data.is_private || false,
                  metadata: message.data.metadata || {},
                  read_by_visitor: message.data.read_by_visitor || false,
                  read_by_agent: message.data.read_by_agent || false,
                  read_at: message.data.read_at
                }
                options.onMessage(chatMessage)
              }
              break

            case 'session_update':
            case 'session_assigned':
              if (options.onSessionUpdate && message.data) {
                options.onSessionUpdate(message.data)
              }
              break

            case 'typing_start':
              if (options.onTyping) {
                options.onTyping({ 
                  isTyping: true, 
                  agentName: message.data?.author_name 
                })
              }
              break

            case 'typing_stop':
              if (options.onTyping) {
                options.onTyping({ isTyping: false })
              }
              break

            case 'error': {
              const errorMsg = message.data?.error || 'WebSocket error occurred'
              setState(prev => ({ ...prev, error: errorMsg }))
              if (options.onError) {
                options.onError(errorMsg)
              }
              break
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false 
        }))

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Only attempt to reconnect if:
        // 1. Not manually closed (code 1000)
        // 2. Haven't exceeded max attempts
        // 3. We have authentication and session
        if (event.code !== 1000 && 
            reconnectAttemptsRef.current < maxReconnectAttempts && 
            isAuthenticated && 
            user && 
            options.sessionId) {
          
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
          reconnectAttemptsRef.current++
          
          console.log(`WebSocket: Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)
          
          setState(prev => ({ 
            ...prev, 
            error: `Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          }))
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect("retry")
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          // Max attempts reached - notify user
          const errorMsg = 'Connection failed after multiple attempts. Please refresh the page to reconnect.'
          setState(prev => ({ ...prev, error: errorMsg }))
          if (options.onError) {
            options.onError(errorMsg)
          }
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reconnectAttemptsRef.current++
        
        const errorMsg = reconnectAttemptsRef.current >= maxReconnectAttempts 
          ? 'Connection failed. Please refresh the page to try again.'
          : `Connection error (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          
        setState(prev => ({ 
          ...prev, 
          error: errorMsg,
          isConnecting: false 
        }))
        
        if (options.onError && reconnectAttemptsRef.current >= maxReconnectAttempts) {
          options.onError(errorMsg)
        }
      }

    } catch (_error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to WebSocket',
        isConnecting: false 
      }))
    }
  }, [isAuthenticated, user, options.sessionId, options.onMessage, options.onSessionUpdate, options.onTyping, options.onError, cleanup])

  const disconnect = useCallback(() => {
    cleanup()
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }))
  }, [cleanup])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  const sendTypingIndicator = useCallback((isTyping: boolean, sessionId?: string) => {
    if (!sessionId) return false
    
    return sendMessage({
      type: isTyping ? 'typing_start' : 'typing_stop',
      session_id: sessionId,
      data: {
        author_type: 'agent',
        author_name: user?.name || 'Agent'
      }
    })
  }, [sendMessage, user])

  const manualRetry = useCallback(() => {
    console.log('WebSocket: Manual retry requested')
    // Reset attempts counter and try to connect
    reconnectAttemptsRef.current = 0
    setState(prev => ({ ...prev, error: null }))
    
    // Clean up current connection first
    cleanup()
    
    // Attempt to connect after a short delay
    setTimeout(() => {
      connect("manualRetry")
    }, 500)
  }, [cleanup, connect])

  // Auto-connect when authenticated and session changes
  useEffect(() => {
    if (isAuthenticated && user && options.sessionId) {
      // Only connect if not already connected/connecting and haven't exceeded max attempts
      if (!wsRef.current || 
          (wsRef.current.readyState !== WebSocket.OPEN && 
           wsRef.current.readyState !== WebSocket.CONNECTING &&
           reconnectAttemptsRef.current < maxReconnectAttempts)) {
        connect("useEffect")
      }
    } else {
      disconnect()
    }

    return cleanup
  }, [isAuthenticated, user, options.sessionId])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendTypingIndicator,
    reconnectAttempts: reconnectAttemptsRef.current
  }
}
