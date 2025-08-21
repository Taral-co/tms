import { useRef, useEffect, useCallback, useState } from 'react'
import { useAuth } from './useAuth'
import { apiClient } from '../lib/api'
import type { ChatMessage, ChatSession } from '../types/chat'

interface WSMessage {
  type: 'chat_message' | 'typing_start' | 'typing_stop' | 'session_update' | 'agent_joined' | 'session_assigned' | 'error' | 'pong'
  data: ChatMessage
  timestamp: string
  from_type: 'visitor' | 'agent' | 'system'
  // Chat message fields (when type is 'chat_message')
  delivery_type: 'direct' | 'broadcast' | 'self'
  // Error field (when type is 'error')
  error?: string
}

interface UseAgentWebSocketOptions {
  onMessage?: (message: ChatMessage) => void
  onSessionUpdate?: (session: ChatSession) => void
  onTyping?: (data: { isTyping: boolean; agentName?: string; sessionId: string }) => void
  onError?: (error: string) => void
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastMessage: WSMessage | null
}

/**
 * Agent Global WebSocket hook for real-time chat communications
 * Single connection per agent that handles all chat sessions
 */
export function useAgentWebSocket(options: UseAgentWebSocketOptions = {}) {
  const { user, isAuthenticated } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  // Use environment-agnostic timer types to avoid Node vs DOM mismatch
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

    // Prevent multiple simultaneous connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('Agent WebSocket: Already connected or connecting, skipping')
      return
    }

    // Stop if we've already exceeded max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Agent WebSocket: Max reconnect attempts reached, not connecting')
      return
    }

    console.log('Agent WebSocket: Attempting to connect from', connectingFrom)

    cleanup()

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Global agent WebSocket endpoint
      const token = localStorage.getItem('auth_token')
      const wsUrl = `${getAgentWebSocketUrl()}?token=${token}`

      console.log('Agent WebSocket: Attempting to connect to:', wsUrl)

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
          const message: WSMessage = JSON.parse(event.data) as WSMessage

          setState(prev => ({ ...prev, lastMessage: message }))

          // Handle different message types
          switch (message.type) {
            case 'chat_message': {
              // Skip echo of agent's own message
              if (message.delivery_type === 'self') break

              options.onMessage?.(message.data)
              break

            }
            

            case 'session_update':
            case 'session_assigned':
              if (options.onSessionUpdate && message.data) {
                options.onSessionUpdate(message.data as unknown as ChatSession)
              }
              break

            case 'typing_start': {
              const d = message.data
              if (options.onTyping && d?.session_id) {
                const typingAgentName = d.author_name
                if (typingAgentName !== user?.name) {
                  options.onTyping({ isTyping: true, agentName: typingAgentName, sessionId: d.session_id })
                }
              }
              break
            }

            case 'typing_stop': {
              const d = message.data
              if (options.onTyping && d?.session_id) {
                const typingAgentName = d.author_name
                if (typingAgentName !== user?.name) {
                  options.onTyping({ isTyping: false, sessionId: d.session_id })
                }
              }
              break
            }

            case 'error': {
              const errorMsg = message.error || 'WebSocket error occurred'
              setState(prev => ({ ...prev, error: errorMsg }))
              if (options.onError) {
                options.onError(errorMsg)
              }
              break
            }

            case 'pong':
              // Heartbeat response - connection is alive
              break
          }
        } catch (error) {
          console.error('Failed to parse Agent WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('Agent WebSocket closed:', event.code, event.reason)
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
        // 3. We have authentication
        if (event.code !== 1000 && 
            reconnectAttemptsRef.current < maxReconnectAttempts && 
            isAuthenticated && 
            user) {
          
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
          reconnectAttemptsRef.current++
          
          console.log(`Agent WebSocket: Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`)
          
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
        console.error('Agent WebSocket error:', error)
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
        error: 'Failed to connect to Agent WebSocket',
        isConnecting: false 
      }))
    }
  }, [isAuthenticated, user, options.onMessage, options.onSessionUpdate, options.onTyping, options.onError, cleanup])

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

  const sendChatMessage = useCallback(async (sessionId: string, content: string, senderName: string): Promise<boolean> => {
    const messageData = {
      type: 'chat_message',
      session_id: sessionId,
      data: {
        content: content.trim(),
        message_type: 'text'
      }
    }

    // Try WebSocket first for real-time delivery
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(messageData))
        console.log('Message sent via Agent WebSocket')
        return true
      } catch (error) {
        console.warn('Agent WebSocket send failed, falling back to HTTP:', error)
      }
    }

    // Fallback to HTTP API
    try {
      await apiClient.sendChatMessage(sessionId, {
        content: content.trim(),
        message_type: 'text',
        user_name: senderName
      })
      console.log('Message sent via HTTP API fallback')
      return true
    } catch (error) {
      console.error('Failed to send message via HTTP:', error)
      return false
    }
  }, [])

  const sendTypingIndicator = useCallback((isTyping: boolean, sessionId: string) => {
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

  const subscribeToSession = useCallback((sessionId: string) => {
    return sendMessage({
      type: 'session_subscribe',
      session_id: sessionId,
      data: {}
    })
  }, [sendMessage])

  const unsubscribeFromSession = useCallback((sessionId: string) => {
    return sendMessage({
      type: 'session_unsubscribe', 
      session_id: sessionId,
      data: {}
    })
  }, [sendMessage])

  const manualRetry = useCallback(() => {
    console.log('Agent WebSocket: Manual retry requested')
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

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
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
  }, [isAuthenticated, user])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendChatMessage,
    sendTypingIndicator,
    subscribeToSession,
    unsubscribeFromSession,
    manualRetry,
    reconnectAttempts: reconnectAttemptsRef.current
  }
}

// Helper function to get agent WebSocket URL
function getAgentWebSocketUrl(): string {
  const tenantId = localStorage.getItem('tenant_id')
  
  if (!tenantId) {
    throw new Error('Tenant ID is required for Agent WebSocket connection')
  }
  
  // Use hardcoded base URL since apiClient.getBaseUrl() doesn't exist
  const baseUrl = 'http://localhost:8080'
  const wsUrl = baseUrl.replace('http', 'ws')
  return `${wsUrl}/v1/tenants/${tenantId}/chat/agent/ws`
}
