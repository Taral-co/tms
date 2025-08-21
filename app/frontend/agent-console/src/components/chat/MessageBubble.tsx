import React, { useRef, useEffect } from 'react'
import { format } from 'date-fns'
import type { ChatMessage } from '../../types/chat'

interface MessageBubbleProps {
  message: ChatMessage
  onMarkAsRead?: (messageId: string) => void
}

export const MessageBubble = React.memo(function MessageBubble({ message, onMarkAsRead }: MessageBubbleProps) {
  const isAgent = message.author_type === 'agent'
  const isAIAgent = message.author_type === 'ai-agent'
  const isStaff = isAgent || isAIAgent
  const messageRef = useRef<HTMLDivElement>(null)

  // Mark visitor messages as read when they come into view
  useEffect(() => {
    if (!isStaff && !message.read_by_agent && onMarkAsRead && messageRef.current) {
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
  }, [isStaff, message.read_by_agent, message.id, onMarkAsRead])

  return (
    <div ref={messageRef} className={`flex mb-3 ${isStaff ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-xs lg:max-w-md px-3 py-2 shadow-sm ${
        isAgent
          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
          : isAIAgent
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 rounded-2xl rounded-bl-md'
          : 'bg-muted text-card-foreground rounded-2xl rounded-bl-md'
      }`}>
        {/* Message content */}
        <div className="mb-2">
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
          {isAIAgent && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs px-2 py-0.5 bg-blue-200/60 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                AI
              </span>
            </div>
          )}
        </div>
        
        {/* Metadata row */}
        <div className="flex items-center justify-end gap-1 -mb-0.5">
          <span className={`text-xs ${
            isAgent 
              ? 'text-primary-foreground/60' 
              : isAIAgent
              ? 'text-blue-600/70 dark:text-blue-400/70'
              : 'text-muted-foreground/70'
          }`}>
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
          {isStaff && (
            <div className="flex items-center ml-1">
              {message.read_by_visitor ? (
                <span className={`text-xs ${
                  isAgent ? 'text-primary-foreground/60' : 'text-blue-600/70 dark:text-blue-400/70'
                }`}>✓✓</span>
              ) : (
                <span className={`text-xs ${
                  isAgent ? 'text-primary-foreground/40' : 'text-blue-500/60 dark:text-blue-500/60'
                }`}>✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
