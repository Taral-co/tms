import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MessageCircle, Clock, User, Send, MoreHorizontal, UserPlus, X, Plus, Search, Settings, ArrowRight, Wifi, WifiOff } from 'lucide-react'
import { apiClient } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import { CreateChatSessionModal } from '../components/CreateChatSessionModal'
import type { ChatSession, ChatMessage } from '../types/chat'
import { format } from 'date-fns'

interface ChatSessionsPageProps {
  initialSessionId?: string
}

export function ChatSessionsPage({ initialSessionId }: ChatSessionsPageProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'unassigned'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [hasWidgets, setHasWidgets] = useState<boolean | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // WebSocket connection for real-time updates
  const { 
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    error: wsError,
    sendTypingIndicator,
    sendChatMessage,
    markMessageAsRead,
    manualRetry
  } = useWebSocket({
    // Connect to general agent WebSocket (not session-specific) for broader updates
    sessionId: selectedSession?.id,
    onMessage: useCallback((message: ChatMessage) => {
      // Only add message if it's for the currently selected session
      if (selectedSession?.id === message.session_id) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m.id === message.id)
          if (exists) return prev
          return [...prev, message]
        })
      }
      
      // Update session list to reflect new activity
      setSessions(prev => prev.map(session => 
        session.id === message.session_id 
          ? { ...session, last_activity_at: message.created_at }
          : session
      ))
    }, [selectedSession?.id]),
    onSessionUpdate: useCallback((updatedSession: ChatSession) => {
      setSessions(prev => {
        const exists = prev.some(s => s.id === updatedSession.id)
        if (exists) {
          return prev.map(session => 
            session.id === updatedSession.id ? updatedSession : session
          )
        } else {
          // New session - add to list and refresh
          return [updatedSession, ...prev]
        }
      })
      
      if (selectedSession?.id === updatedSession.id) {
        setSelectedSession(updatedSession)
      }
    }, [selectedSession?.id]),
    onTyping: useCallback((data: { isTyping: boolean; agentName?: string }) => {
      if (data.agentName) {
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
    }, []),
    onError: useCallback((error: string) => {
      setError(`WebSocket error: ${error}`)
    }, [])
  })  // Typing indicator management
  const { startTyping, forceStopTyping } = useTypingIndicator({
    onTypingStart: () => {
      if (selectedSession?.id) {
        sendTypingIndicator(true, selectedSession.id)
      }
    },
    onTypingStop: () => {
      if (selectedSession?.id) {
        sendTypingIndicator(false, selectedSession.id)
      }
    },
    debounceMs: 2000
  })

  useEffect(() => {
    loadSessions()
    checkWidgets()
  }, [filter])

  const checkWidgets = async () => {
    try {
      const widgets = await apiClient.listChatWidgets()
      setHasWidgets(widgets.length > 0)
    } catch (_error) {
      setHasWidgets(false)
    }
  }

  useEffect(() => {
    if (initialSessionId) {
      loadSessionById(initialSessionId)
    }
  }, [initialSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-refresh sessions every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadSessions, 30000)
    return () => clearInterval(interval)
  }, [filter])

  const loadSessions = async () => {
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
  }

  const loadSessionById = async (sessionId: string) => {
    try {
      const session = await apiClient.getChatSession(sessionId)
      setSelectedSession(session)
      loadMessages(sessionId)
    } catch (err: any) {
      setError(`Failed to load session: ${err.message}`)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const data = await apiClient.getChatMessages(sessionId)
      setMessages(data)
    } catch (err: any) {
      setError(`Failed to load messages: ${err.message}`)
    }
  }

  const handleSessionSelect = (session: ChatSession) => {
    // Force stop typing when switching sessions
    forceStopTyping()
    setSelectedSession(session)
    loadMessages(session.id)
    // Clear any existing error when selecting a new session
    setError(null)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSession || !newMessage.trim() || sendingMessage || !user?.name) return

    const messageContent = newMessage.trim()
    
    try {
      setSendingMessage(true)
      
      // Use WebSocket-first messaging for real-time delivery
      const success = await sendChatMessage(selectedSession.id, messageContent, user.name)
      
      if (success) {
        setNewMessage('')
        // Force stop typing indicator when message is sent
        forceStopTyping()
      } else {
        setError('Failed to send message. Please try again.')
      }
    } catch (err: any) {
      setError(`Failed to send message: ${err.message}`)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleAssignSession = async (sessionId: string) => {
    if (!user?.id) return
    
    try {
      await apiClient.assignChatSession(sessionId, { agent_id: user.id })
      await loadSessions()
      if (selectedSession?.id === sessionId) {
        await loadSessionById(sessionId)
      }
    } catch (err: any) {
      setError(`Failed to assign session: ${err.message}`)
    }
  }

  const handleCreateSession = async (sessionId: string) => {
    await loadSessions()
    await loadSessionById(sessionId)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success'
      case 'waiting': return 'bg-warning/10 text-warning'
      case 'ended': return 'bg-muted text-muted-foreground'
      case 'transferred': return 'bg-info/10 text-info'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Connection status notification component
  const ConnectionStatus = () => {
    if (!selectedSession) return null
    
    if (wsConnected) {
      return (
        <div className="flex items-center gap-1 text-success" title="Real-time connection active">
          <Wifi className="w-3 h-3" />
          <span className="text-xs">Live</span>
        </div>
      )
    }
    
    if (wsConnecting) {
      return (
        <div className="flex items-center gap-1 text-warning" title="Connecting to real-time updates...">
          <WifiOff className="w-3 h-3 animate-pulse" />
          <span className="text-xs">Connecting...</span>
        </div>
      )
    }
    
    if (wsError) {
      return (
        <div className="flex items-center gap-1 text-destructive" title={wsError}>
          <WifiOff className="w-3 h-3" />
          <span className="text-xs">Error</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-1 text-muted-foreground" title="Disconnected from real-time updates">
        <WifiOff className="w-3 h-3" />
        <span className="text-xs">Offline</span>
      </div>
    )
  }

  // Manual retry handler for connection failures
  const handleRetryConnection = () => {
    manualRetry()
  }

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

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading chat sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        {/* Controls */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 h-9 px-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              aria-label="Start new chat session"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label="Show all sessions"
            >
              All ({sessions.length})
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'unassigned' 
                  ? 'bg-warning text-warning-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label="Show unassigned sessions"
            >
              Unassigned ({sessions.filter(s => !s.assigned_agent_id).length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === 'active' 
                  ? 'bg-success text-success-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label="Show active sessions"
            >
              Active ({sessions.filter(s => s.status === 'active').length})
            </button>
          </div>
        </div>
        
        {/* Sessions List */}
        <div className="flex-1 min-h-0">
          {filteredSessions.length > 0 ? (
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSession?.id === session.id}
                  onClick={() => handleSessionSelect(session)}
                  onAssign={() => handleAssignSession(session.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              
              {hasWidgets === false ? (
                <>
                  <h3 className="font-medium text-card-foreground mb-1">No chat widgets created</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Before you can manage chat sessions, you need to create and embed a chat widget on your website.
                  </p>
                  <div className="space-y-3">
                    <a
                      href="/chat/widgets"
                      className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Create Your First Widget
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>1. Create widget</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>2. Embed on site</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>3. Handle sessions</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-medium text-card-foreground mb-1">No chat sessions found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search terms' : 'Start a new chat to begin helping customers'}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Start New Chat
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="font-medium text-card-foreground">
                      {selectedSession.customer_name || selectedSession.customer_email}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyles(selectedSession.status)}`}>
                        {selectedSession.status}
                      </span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(selectedSession.created_at), 'MMM d, h:mm a')}</span>
                      <span>•</span>
                      <ConnectionStatus />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedSession.assigned_agent_id && (
                    <button
                      onClick={() => handleAssignSession(selectedSession.id)}
                      className="flex items-center gap-2 h-9 px-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                      aria-label="Assign session to me"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assign to Me
                    </button>
                  )}
                  <button 
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {messages.map((message) => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  onMarkAsRead={(messageId) => markMessageAsRead(selectedSession.id, messageId)}
                />
              ))}
              
              {/* Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-muted text-card-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* ARIA Live Region for Screen Readers */}
            <div 
              aria-live="polite" 
              aria-label="Chat activity announcements"
              className="sr-only"
            >
              {typingUsers.size > 0 && (
                `${Array.from(typingUsers).join(', ')} ${typingUsers.size === 1 ? 'is' : 'are'} typing`
              )}
            </div>

            {/* Message Input */}
            {selectedSession.status === 'active' && (
              <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        // Use typing indicator hook for better debouncing
                        if (e.target.value.trim()) {
                          startTyping()
                        } else {
                          forceStopTyping()
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        } else if (e.key === 'Escape') {
                          // Stop typing on Escape
                          forceStopTyping()
                        }
                      }}
                      onBlur={() => {
                        // Stop typing indicator when input loses focus
                        forceStopTyping()
                      }}
                      placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                      className="w-full min-h-[44px] max-h-[280px] px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      disabled={sendingMessage}
                      aria-label="Message input"
                      rows={1}
                      style={{
                        height: 'auto',
                        minHeight: '44px'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = Math.min(target.scrollHeight, 280) + 'px'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="h-11 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {sendingMessage ? 'Sending...' : 'Send'}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Select a chat session</h3>
              <p className="text-muted-foreground mb-6">Choose a session from the sidebar to start chatting with customers</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      <CreateChatSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSessionCreated={handleCreateSession}
      />

      {/* WebSocket Error Toast */}
      {wsError && wsError.includes('multiple attempts') && (
        <div className="fixed bottom-16 right-4 bg-destructive text-destructive-foreground px-4 py-3 rounded-md shadow-lg flex items-center gap-3 max-w-sm z-50">
          <WifiOff className="w-4 h-4" />
          <div className="flex-1">
            <div className="text-sm font-medium">Connection Failed</div>
            <div className="text-xs opacity-90">Unable to connect to real-time chat</div>
          </div>
          <button 
            onClick={handleRetryConnection}
            className="bg-destructive-foreground text-destructive px-2 py-1 rounded text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}
      
      {wsError && !wsError.includes('multiple attempts') && (
        <div className="fixed bottom-16 right-4 bg-warning text-warning-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2 max-w-sm z-50">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm">{wsError}</span>
        </div>
      )}
    </div>
  )
}

interface SessionCardProps {
  session: ChatSession
  isSelected: boolean
  onClick: () => void
  onAssign: () => void
}

function SessionCard({ session, isSelected, onClick, onAssign }: SessionCardProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success'
      case 'waiting': return 'bg-warning/10 text-warning'
      case 'ended': return 'bg-muted text-muted-foreground'
      case 'transferred': return 'bg-info/10 text-info'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div
      className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
        isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-card-foreground truncate">
              {session.customer_name || session.customer_email}
            </h4>
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusStyles(session.status)}`}>
              {session.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{session.widget_name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(session.created_at), 'MMM d, h:mm a')}
          </p>
          {session.assigned_agent_name && (
            <p className="text-xs text-primary mt-1">
              Assigned to {session.assigned_agent_name}
            </p>
          )}
        </div>
        {!session.assigned_agent_id && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAssign()
            }}
            className="text-primary hover:text-primary/80 text-xs font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
          >
            Assign
          </button>
        )}
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  onMarkAsRead?: (messageId: string) => void
}

function MessageBubble({ message, onMarkAsRead }: MessageBubbleProps) {
  const isAgent = message.author_type === 'agent'
  const messageRef = useRef<HTMLDivElement>(null)
  
  // Mark visitor messages as read when they come into view
  useEffect(() => {
    if (!isAgent && !message.read_by_agent && onMarkAsRead && messageRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries
          if (entry.isIntersecting) {
            onMarkAsRead(message.id)
            observer.disconnect()
          }
        },
        { threshold: 0.5 }
      )
      
      observer.observe(messageRef.current)
      return () => observer.disconnect()
    }
  }, [isAgent, message.read_by_agent, message.id, onMarkAsRead])
  
  return (
    <div ref={messageRef} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isAgent 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-card-foreground'
      }`}>
        <p className="text-sm">{message.content}</p>
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs ${
            isAgent ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {format(new Date(message.created_at), 'h:mm a')}
          </p>
          {isAgent && (
            <div className="flex items-center gap-1 ml-2">
              {message.read_by_visitor ? (
                <span className="text-xs text-primary-foreground/70">✓✓</span>
              ) : (
                <span className="text-xs text-primary-foreground/50">✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
