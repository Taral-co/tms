import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api'
import { useAuth } from './useAuth'
import { useAgentWebSocket } from './useAgentWebSocket'
import { useTypingIndicator } from './useTypingIndicator'
import { notificationSound } from '../utils/notificationSound'
import { browserNotifications } from '../utils/browserNotifications'
import type { ChatSession, ChatMessage } from '../types/chat'

interface UseChatSessionsParams {
  initialSessionId?: string
  urlSessionId?: string
}

// Split the hook into stable and reactive parts
export function useChatSessionsStable({ initialSessionId, urlSessionId }: UseChatSessionsParams) {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Core state
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'unassigned'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [hasWidgets, setHasWidgets] = useState<boolean | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('tms_agent_sound_enabled')
    return saved ? JSON.parse(saved) : true
  })

  // Refs for stable access
  const selectedSessionRef = useRef<ChatSession | null>(null)
  const sessionsRef = useRef<ChatSession[]>([])

  useEffect(() => { selectedSessionRef.current = selectedSession }, [selectedSession])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  const targetSessionId = urlSessionId || initialSessionId

  // Sync sound settings
  useEffect(() => {
    notificationSound.setEnabled(soundEnabled)
    localStorage.setItem('tms_agent_sound_enabled', JSON.stringify(soundEnabled))
  }, [soundEnabled])

  // Load functions
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const data = await apiClient.getChatMessages(sessionId)
      setMessages(data)
    } catch (err: any) {
      setError(`Failed to load messages: ${err.message}`)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.listChatSessions({
        status: filter === 'all' ? undefined : filter,
        assigned_agent_id: filter === 'unassigned' ? 'null' : undefined
      })
      setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [filter])

  const loadSessionById = useCallback(async (sessionId: string) => {
    try {
      const session = await apiClient.getChatSession(sessionId)
      setSelectedSession(session)
      loadMessages(sessionId)
    } catch (err: any) {
      setError(`Failed to load session: ${err.message}`)
    }
  }, [loadMessages])

  const checkWidgets = useCallback(async () => {
    try {
      const widgets = await apiClient.listChatWidgets()
      setHasWidgets(widgets.length > 0)
    } catch (_error) {
      setHasWidgets(false)
    }
  }, [])

  // Filter sessions based on search term
  const filteredSessions = useMemo(() => {
    if (!searchTerm) return sessions
    const term = searchTerm.toLowerCase()
    return sessions.filter(session =>
      session.customer_name?.toLowerCase().includes(term) ||
      session.customer_email?.toLowerCase().includes(term) ||
      session.widget_name?.toLowerCase().includes(term)
    )
  }, [sessions, searchTerm])

  // Effects
  useEffect(() => {
    loadSessions()
    checkWidgets()
  }, [loadSessions, checkWidgets])

  useEffect(() => {
    if (targetSessionId) {
      loadSessionById(targetSessionId)
    }
  }, [targetSessionId, loadSessionById])

  useEffect(() => {
    const handleNotificationClick = (event: CustomEvent) => {
      const { sessionId } = event.detail
      if (sessionId) {
        navigate(`/chat/sessions/${sessionId}`, { replace: true })
      }
    }

    window.addEventListener('notification-click', handleNotificationClick as EventListener)
    return () => {
      window.removeEventListener('notification-click', handleNotificationClick as EventListener)
    }
  }, [navigate])

  useEffect(() => {
    const interval = setInterval(loadSessions, 30000)
    return () => clearInterval(interval)
  }, [loadSessions])

  // Return stable core state and functions
  return {
    // Core state
    selectedSession,
    messages,
    sessions,
    newMessage,
    loading,
    sendingMessage,
    error,
    filter,
    searchTerm,
    hasWidgets,
    soundEnabled,
    filteredSessions,
    
    // Refs for WebSocket
    selectedSessionRef,
    sessionsRef,
    
    // Core setters
    setSelectedSession,
    setMessages,
    setSessions,
    setNewMessage,
    setSendingMessage,
    setError,
    setFilter,
    setSearchTerm,
    setSoundEnabled,
    
    // Functions
    loadMessages,
    loadSessions,
    loadSessionById,
    user,
    navigate
  }
}

// Separate hook for real-time features
export function useRealTimeFeatures(coreHook: ReturnType<typeof useChatSessionsStable>) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [flashingSessions, setFlashingSessions] = useState<Set<string>>(new Set())

  const {
    selectedSessionRef,
    sessionsRef,
    setMessages,
    setSessions,
    setSelectedSession,
    soundEnabled,
    user
  } = coreHook

  // WebSocket callbacks
  const onMessageStable = useCallback((message: ChatMessage) => {
    const currentSelected = selectedSessionRef.current
    const currentSessions = sessionsRef.current
    
    // Add message if for selected session
    if (currentSelected?.id === message.session_id) {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev
        return [...prev, message]
      })
    }

    // Handle visitor notifications
    if (message.author_type === 'visitor') {
      if (user?.id && soundEnabled) {
        notificationSound.play().catch(() => {})
      }

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
      setFlashingSessions(prev => new Set(prev).add(message.session_id))
      setTimeout(() => {
        setFlashingSessions(prev => {
          const newSet = new Set(prev)
          newSet.delete(message.session_id)
          return newSet
        })
      }, 2000)

      // Auto-select if none selected
      if (!currentSelected) {
        const targetSession = currentSessions.find(s => s.id === message.session_id)
        if (targetSession) {
          setSelectedSession(targetSession)
          setMessages([message])
        }
      }
    }

    // Update session activity
    setSessions(prev => prev.map(session =>
      session.id === message.session_id
        ? { ...session, last_activity_at: message.created_at }
        : session
    ))
  }, [selectedSessionRef, sessionsRef, setMessages, setSessions, setSelectedSession, soundEnabled, user?.id])

  const onSessionUpdateStable = useCallback((updatedSession: ChatSession) => {
    setSessions(prev => {
      const exists = prev.some(s => s.id === updatedSession.id)
      if (exists) {
        return prev.map(session =>
          session.id === updatedSession.id ? updatedSession : session
        )
      } else {
        return [updatedSession, ...prev]
      }
    })

    const currentSelected = selectedSessionRef.current
    if (currentSelected?.id === updatedSession.id) {
      setSelectedSession(updatedSession)
    }
  }, [setSessions, setSelectedSession, selectedSessionRef])

  const onTypingStable = useCallback((data: { isTyping: boolean; agentName?: string; sessionId: string }) => {
    const currentSelected = selectedSessionRef.current
    if (data.agentName && currentSelected?.id === data.sessionId) {
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        if (data.isTyping) {
          newSet.add(data.agentName!)
        } else {
          newSet.delete(data.agentName!)
        }
        return newSet
      })
    }
  }, [selectedSessionRef])

  const onErrorStable = useCallback((error: string) => {
    coreHook.setError(`WebSocket error: ${error}`)
  }, [coreHook])

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
    onMessage: onMessageStable,
    onSessionUpdate: onSessionUpdateStable,
    onTyping: onTypingStable,
    onError: onErrorStable
  })

  // Typing indicator
  const { startTyping, forceStopTyping } = useTypingIndicator({
    onTypingStart: () => {
      const currentSelected = selectedSessionRef.current
      if (currentSelected?.id) {
        sendTypingIndicator(true, currentSelected.id)
      }
    },
    onTypingStop: () => {
      const currentSelected = selectedSessionRef.current
      if (currentSelected?.id) {
        sendTypingIndicator(false, currentSelected.id)
      }
    },
    debounceMs: 2000
  })

  // Action handlers
  const handleSessionSelect = useCallback((session: ChatSession) => {
    const currentSelected = selectedSessionRef.current
    
    if (currentSelected?.id && currentSelected.id !== session.id) {
      unsubscribeFromSession(currentSelected.id)
    }

    setSelectedSession(session)
    coreHook.loadMessages(session.id)
    subscribeToSession(session.id)
    coreHook.setError(null)
    
    setFlashingSessions(prev => {
      const newSet = new Set(prev)
      newSet.delete(session.id)
      return newSet
    })

    coreHook.navigate(`/chat/sessions/${session.id}`, { replace: true })
  }, [selectedSessionRef, unsubscribeFromSession, setSelectedSession, subscribeToSession, coreHook])

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const currentSelected = selectedSessionRef.current
    if (!currentSelected || !coreHook.newMessage.trim() || coreHook.sendingMessage || !coreHook.user?.name) return

    const messageContent = coreHook.newMessage.trim()

    try {
      coreHook.setSendingMessage(true)
      const success = await sendChatMessage(currentSelected.id, messageContent, coreHook.user.name)

      if (success) {
        coreHook.setNewMessage('')
        forceStopTyping()
      } else {
        coreHook.setError('Failed to send message. Please try again.')
      }
    } catch (err: any) {
      coreHook.setError(`Failed to send message: ${err.message}`)
    } finally {
      coreHook.setSendingMessage(false)
    }
  }, [selectedSessionRef, coreHook, sendChatMessage, forceStopTyping])

  const handleAssignSession = useCallback(async (sessionId: string) => {
    if (!coreHook.user?.id) return

    try {
      await apiClient.assignChatSession(sessionId, { agent_id: coreHook.user.id })
      await coreHook.loadSessions()
      
      const currentSelected = selectedSessionRef.current
      if (currentSelected?.id === sessionId) {
        await coreHook.loadSessionById(sessionId)
      }
    } catch (err: any) {
      coreHook.setError(`Failed to assign session: ${err.message}`)
    }
  }, [coreHook, selectedSessionRef])

  const markMessageAsRead = useCallback(async (sessionId: string, messageId: string): Promise<boolean> => {
    try {
      await apiClient.markChatMessagesAsRead(sessionId, messageId)
      return true
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      return false
    }
  }, [])

  return {
    // Real-time state
    typingUsers,
    flashingSessions,
    
    // WebSocket state
    wsConnected,
    wsConnecting,
    wsError,
    
    // Actions
    handleSessionSelect,
    handleSendMessage,
    handleAssignSession,
    markMessageAsRead,
    startTyping,
    forceStopTyping,
    manualRetry
  }
}
