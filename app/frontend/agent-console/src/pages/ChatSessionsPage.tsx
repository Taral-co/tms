import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Clock, User, Send, MoreHorizontal, UserPlus, X } from 'lucide-react'
import { apiClient } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import type { ChatSession, ChatMessage, SendChatMessageRequest } from '../types/chat'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSessions()
  }, [filter])

  useEffect(() => {
    if (initialSessionId) {
      loadSessionById(initialSessionId)
    }
  }, [initialSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
    setSelectedSession(session)
    loadMessages(session.id)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSession || !newMessage.trim() || sendingMessage) return

    try {
      setSendingMessage(true)
      const messageData: SendChatMessageRequest = {
        content: newMessage.trim(),
        message_type: 'text'
      }
      
      const sentMessage = await apiClient.sendChatMessage(selectedSession.id, messageData)
      setMessages(prev => [...prev, sentMessage])
      setNewMessage('')
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Sessions Sidebar */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Chat Sessions</h2>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1 text-sm rounded-full ${filter === 'unassigned' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}
            >
              Unassigned
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-sm rounded-full ${filter === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
            >
              Active
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-full">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isSelected={selectedSession?.id === session.id}
              onClick={() => handleSessionSelect(session)}
              onAssign={() => handleAssignSession(session.id)}
            />
          ))}
          
          {sessions.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No chat sessions found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedSession.customer_name || selectedSession.customer_email}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedSession.status)}`}>
                        {selectedSession.status}
                      </span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(selectedSession.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedSession.assigned_agent_id && (
                    <button
                      onClick={() => handleAssignSession(selectedSession.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      Assign to Me
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedSession.status === 'active' && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat session</h3>
              <p className="text-gray-600">Choose a session from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div
      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {session.customer_name || session.customer_email}
            </h4>
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
              {session.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-1">{session.widget_name}</p>
          <p className="text-xs text-gray-400">
            {format(new Date(session.created_at), 'MMM d, h:mm a')}
          </p>
          {session.assigned_agent_name && (
            <p className="text-xs text-blue-600 mt-1">
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
            className="text-blue-600 hover:text-blue-800 text-xs"
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
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.author_type === 'agent'
  
  return (
    <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isAgent 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${
          isAgent ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {format(new Date(message.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  )
}
