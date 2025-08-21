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

// Create a version that uses refs for everything and minimal state updates
export function useChatSessionsMinimal({ initialSessionId, urlSessionId }: UseChatSessionsParams) {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Core state - only what absolutely needs to trigger re-renders
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

  // UI-only state that updates frequently but doesn't need to trigger full re-renders
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // Refs for real-time state (these won't trigger re-renders)
  const typingUsersRef = useRef<Set<string>>(new Set())
  const flashingSessionsRef = useRef<Set<string>>(new Set())
  
  // Other refs
  const selectedSessionRef = useRef<ChatSession | null>(null)
  const sessionsRef = useRef<ChatSession[]>([])

  useEffect(() => { selectedSessionRef.current = selectedSession }, [selectedSession])
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  const targetSessionId = urlSessionId || initialSessionId

  // Force update function for UI-only changes
  const triggerUIUpdate = useCallback(() => {
    setForceUpdate(prev => prev + 1)
  }, [])

  // Getters for ref-based state (these will always return current values)
  const getTypingUsers = useCallback(() => typingUsersRef.current, [])
  const getFlashingSessions = useCallback(() => flashingSessionsRef.current, [])

  // Sync sound settings
  useEffect(() => {
    notificationSound.setEnabled(soundEnabled)
    localStorage.setItem('tms_agent_sound_enabled', JSON.stringify(soundEnabled))
  }, [soundEnabled])

  // WebSocket message handler that only updates state when absolutely necessary
  const onMessageStable = useCallback((message: ChatMessage) => {
    const currentSelected = selectedSessionRef.current
    const currentSessions = sessionsRef.current
    
    // Prevent duplicates
    if (messages.some(m => m.id === message.id)) return
    
    // Only update messages state if it's for the currently selected session
    if (currentSelected?.id === message.session_id) {
      setMessages(prev => [...prev, message])
    }

    // Handle visitor notifications (no state updates)
    if (message.author_type === 'visitor') {
      // Sound notification
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

      // Flash session (use ref to avoid state update)
      flashingSessionsRef.current.add(message.session_id)
      triggerUIUpdate() // Only trigger UI update, not full re-render
      
      setTimeout(() => {
        flashingSessionsRef.current.delete(message.session_id)
        triggerUIUpdate()
      }, 2000)

      // Auto-select session if none selected
      if (!currentSelected) {
        const targetSession = currentSessions.find(s => s.id === message.session_id)
        if (targetSession) {
          setSelectedSession(targetSession)
          setMessages([message])
        }
      }
    }

    // Update session's last activity (minimal state update)
    setSessions(prev => prev.map(session =>
      session.id === message.session_id
        ? { ...session, last_activity_at: message.created_at }
        : session
    ))
  }, [messages, user?.id, soundEnabled, triggerUIUpdate])

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
  }, [])

  const onTypingStable = useCallback((data: { isTyping: boolean; agentName?: string; sessionId: string }) => {
    const currentSelected = selectedSessionRef.current
    console.log('onTypingStable called:', data, 'currentSelected:', currentSelected?.id)
    
    if (currentSelected?.id === data.sessionId) {
      // Update ref without triggering re-render
      if (data.isTyping && data.agentName) {
        console.log('Adding typing user:', data.agentName)
        typingUsersRef.current.add(data.agentName)
      } else {
        // For stop events, try to remove the agent name if provided, otherwise clear all for this session
        if (data.agentName) {
          console.log('Removing specific typing user:', data.agentName)
          typingUsersRef.current.delete(data.agentName)
        } else {
          console.log('Clearing all typing users for session')
          typingUsersRef.current.clear()
        }
      }
      console.log('Updated typing users:', Array.from(typingUsersRef.current))
      triggerUIUpdate() // Minimal UI update
    }
  }, [triggerUIUpdate])

  const onErrorStable = useCallback((error: string) => {
    setError(`WebSocket error: ${error}`)
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
    onMessage: onMessageStable,
    onSessionUpdate: onSessionUpdateStable,
    onTyping: onTypingStable,
    onError: onErrorStable
  })

  // Rest of the functions remain the same...
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

  const handleSessionSelect = useCallback((session: ChatSession) => {
    const currentSelected = selectedSessionRef.current
    
    if (currentSelected?.id && currentSelected.id !== session.id) {
      unsubscribeFromSession(currentSelected.id)
    }

    setSelectedSession(session)
    loadMessages(session.id)
    subscribeToSession(session.id)
    setError(null)
    
    // Clear flashing for this session (ref-based)
    flashingSessionsRef.current.delete(session.id)
    triggerUIUpdate()

    navigate(`/chat/sessions/${session.id}`, { replace: true })
  }, [unsubscribeFromSession, loadMessages, subscribeToSession, navigate, triggerUIUpdate])

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const currentSelected = selectedSessionRef.current
    if (!currentSelected || !newMessage.trim() || sendingMessage || !user?.name) return

    const messageContent = newMessage.trim()

    try {
      setSendingMessage(true)
      const success = await sendChatMessage(currentSelected.id, messageContent, user.name)

      if (success) {
        setNewMessage('')
      } else {
        setError('Failed to send message. Please try again.')
      }
    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`)
    } finally {
      setSendingMessage(false)
    }
  }, [newMessage, sendingMessage, user?.name, sendChatMessage])

  const handleAssignSession = useCallback(async (sessionId: string) => {
    if (!user?.id) return

    try {
      await apiClient.assignChatSession(sessionId, { agent_id: user.id })
      await loadSessions()
      
      const currentSelected = selectedSessionRef.current
      if (currentSelected?.id === sessionId) {
        await loadSessionById(sessionId)
      }
    } catch (err: any) {
      setError(`Failed to assign session: ${err.message}`)
    }
  }, [user?.id, loadSessions, loadSessionById])

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

  const markMessageAsRead = useCallback(async (sessionId: string, messageId: string): Promise<boolean> => {
    try {
      await apiClient.markChatMessagesAsRead(sessionId, messageId)
      return true
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      return false
    }
  }, [])

  const checkWidgets = useCallback(async () => {
    try {
      const widgets = await apiClient.listChatWidgets()
      setHasWidgets(widgets.length > 0)
    } catch (_error) {
      setHasWidgets(false)
    }
  }, [])

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

  return {
    // State
    sessions,
    selectedSession,
    messages,
    newMessage,
    loading,
    sendingMessage,
    error,
    filter,
    searchTerm,
    hasWidgets,
    soundEnabled,
    filteredSessions,
    
    // Ref-based state getters (these won't cause re-renders when called)
    typingUsers: getTypingUsers(),
    flashingSessions: getFlashingSessions(),
    
    // WebSocket state
    wsConnected,
    wsConnecting,
    wsError,
    
    // Actions
    setNewMessage,
    setError,
    setFilter,
    setSearchTerm,
    setSoundEnabled,
    handleSessionSelect,
    handleSendMessage,
    handleAssignSession,
    markMessageAsRead,
    startTyping,
    forceStopTyping,
    manualRetry,
    
    // Force update key for components that need to re-render on UI changes
    uiUpdateKey: forceUpdate
  }
}
