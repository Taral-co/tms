import React, { useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Clock, User, Send, MoreHorizontal, UserPlus, Search, Settings, ArrowRight, Volume2, VolumeX, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import { useChatSessionsMinimal } from '../hooks/useChatSessionsMinimal'
import { SessionCard, MessageBubble, ConnectionStatus } from '../components/chat'
import { AIStatusWidget } from '../components/chat/AIStatusWidget'
import { useCustomerOnlineStatus } from '@/hooks/useCustomerOnlineStatus'

interface ChatSessionsPageProps {
  initialSessionId?: string
}

export function ChatSessionsPage({ initialSessionId }: ChatSessionsPageProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const renderCountRef = useRef(0)
  
  renderCountRef.current++
  
  // Debug log to track re-renders
  console.log(`[ChatSessionsPage] Render #${renderCountRef.current}`)

  const {
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
    typingUsers,
    soundEnabled,
    flashingSessions,
    filteredSessions,
    
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
    
    // UI update key for forcing re-renders
    uiUpdateKey
  } = useChatSessionsMinimal({ initialSessionId })

  // Memoized callback for marking messages as read to prevent re-renders
  const handleMarkAsRead = useCallback((messageId: string) => {
    if (selectedSession?.id) {
      markMessageAsRead(selectedSession.id, messageId)
    }
  }, [selectedSession?.id, markMessageAsRead])


  useEffect(() => {
    scrollToBottom()
  }, [messages, uiUpdateKey]) // Include uiUpdateKey to trigger scroll on typing changes

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const { isOnline: customerStatus } = useCustomerOnlineStatus({
    sessionId: selectedSession?.id,
  })
  


  // Manual retry handler for connection failures
  const handleRetryConnection = useCallback(() => {
    manualRetry()
  }, [manualRetry])

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
    <div className="h-full flex bg-background">
      {/* Sessions Sidebar */}
      <div className="w-96 border-r border-border bg-card flex flex-col min-h-0">
        {/* Controls */}
        <div className="p-4 border-b border-border">
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
              className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              aria-label="Show all sessions"
            >
              All ({sessions.length})
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === 'unassigned'
                  ? 'bg-warning text-warning-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              aria-label="Show unassigned sessions"
            >
              Unassigned ({sessions.filter(s => !s.assigned_agent_id).length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === 'active'
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
            <div
              className="h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
            >
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isClientOnline={customerStatus}
                  isSelected={selectedSession?.id === session.id}
                  isFlashing={flashingSessions.has(session.id)}
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
                <></>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-border bg-card">
              <div className="p-4">
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
                        
                        <span>{format(new Date(selectedSession.created_at), 'MMM d, h:mm a')}</span>
                        <span>•</span>
                        <ConnectionStatus 
                          isConnected={customerStatus}
                          isConnecting={customerStatus}
                          error={wsError}
                          selectedSession={selectedSession}
                        />
                        <span>•</span>
                        <AIStatusWidget 
                          useAI={selectedSession.use_ai} 
                          variant="compact"
                        />
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
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${soundEnabled
                          ? 'text-primary hover:bg-primary/10'
                          : 'text-muted-foreground hover:bg-muted'
                        }`}
                      aria-label={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
                      title={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button
                      className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* AI Features Panel - Only show when AI is enabled and has capabilities */}
              
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 bg-background scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onMarkAsRead={handleMarkAsRead}
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
                <form onSubmit={handleSendMessage} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
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
                          forceStopTyping()
                        }
                      }}
                      onBlur={() => {
                        forceStopTyping()
                      }}
                      placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                      className="w-full min-h-[44px] max-h-[280px] px-3 py-2.5 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 leading-5"
                      disabled={sendingMessage}
                      aria-label="Message input"
                      rows={1}
                      style={{
                        height: '44px',
                        minHeight: '44px'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = '44px'
                        target.style.height = Math.min(target.scrollHeight, 280) + 'px'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="h-[44px] px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shrink-0"
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
            {hasWidgets === false ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
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
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Select a chat session</h3>
                <p className="text-muted-foreground mb-6">Choose a session from the sidebar to start chatting with customers</p>

              </div>
            )}
          </div>
        )}
      </div>

      {/* General Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2 max-w-sm z-50">
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-destructive-foreground/70 hover:text-destructive-foreground"
          >
            ×
          </button>
        </div>
      )}

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
