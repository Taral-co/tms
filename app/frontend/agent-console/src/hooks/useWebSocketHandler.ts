import { useCallback } from 'react'
import { useAgentWebSocket } from './useAgentWebSocket'
import { useAuth } from './useAuth'
import { notificationSound } from '../utils/notificationSound'
import { browserNotifications } from '../utils/browserNotifications'
import type { ChatMessage, ChatSession } from '../types/chat'

interface UseWebSocketHandlerParams {
  selectedSessionRef: React.MutableRefObject<ChatSession | null>
  sessionsRef: React.MutableRefObject<ChatSession[]>
  messagesRef: React.MutableRefObject<ChatMessage[]>
  soundEnabled: boolean
  onNewMessage: (message: ChatMessage) => void
  onSessionUpdate: (session: ChatSession) => void
  onTypingUpdate: (data: { isTyping: boolean; agentName?: string; sessionId: string }) => void
  onFlashSession: (sessionId: string) => void
}

export function useWebSocketHandler({
  selectedSessionRef,
  sessionsRef,
  messagesRef,
  soundEnabled,
  onNewMessage,
  onSessionUpdate,
  onTypingUpdate,
  onFlashSession
}: UseWebSocketHandlerParams) {
  const { user } = useAuth()
  
  // Stable message handler that doesn't depend on state
  const handleMessage = useCallback((message: ChatMessage) => {
    const currentSelected = selectedSessionRef.current
    const currentSessions = sessionsRef.current
    const currentMessages = messagesRef.current
    
    // Prevent duplicates
    if (currentMessages.some(m => m.id === message.id)) return
    
    // Only update messages if it's for the currently selected session
    if (currentSelected?.id === message.session_id) {
      onNewMessage(message)
    }

    // Handle visitor notifications
    if (message.author_type === 'visitor') {
      // Sound
      if (user?.id && soundEnabled) {
        notificationSound.play().catch(() => {})
      }

      // Browser notification
      const session = currentSessions.find(s => s.id === message.session_id)
      if (session) {
        browserNotifications.showMessageNotification({
          customerName: session.customer_name,
          customerEmail: session.customer_email,
          messagePreview: message.content,
          sessionId: message.session_id
        })
      }

      // Flash session
      onFlashSession(message.session_id)
    }
  }, [user?.id, soundEnabled, selectedSessionRef, sessionsRef, messagesRef, onNewMessage, onFlashSession])

  const handleSessionUpdate = useCallback((session: ChatSession) => {
    onSessionUpdate(session)
  }, [onSessionUpdate])

  const handleTyping = useCallback((data: { isTyping: boolean; agentName?: string; sessionId: string }) => {
    const currentSelected = selectedSessionRef.current
    if (data.agentName && currentSelected?.id === data.sessionId) {
      onTypingUpdate(data)
    }
  }, [selectedSessionRef, onTypingUpdate])

  const handleError = useCallback((error: string) => {
    console.error('WebSocket error:', error)
  }, [])

  const {
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    error: wsError,
    sendTypingIndicator,
    sendChatMessage,
    subscribeToSession,
    unsubscribeFromSession,
    manualRetry
  } = useAgentWebSocket({
    onMessage: handleMessage,
    onSessionUpdate: handleSessionUpdate,
    onTyping: handleTyping,
    onError: handleError
  })

  return {
    wsConnected,
    wsConnecting,
    wsError,
    sendTypingIndicator,
    sendChatMessage,
    subscribeToSession,
    unsubscribeFromSession,
    manualRetry
  }
}
