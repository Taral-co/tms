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
    <div ref={messageRef} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isAgent
          ? 'bg-primary text-primary-foreground'
          : isAIAgent
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800'
          : 'bg-muted text-card-foreground'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm">{message.content}</p>
          {isAIAgent && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full font-medium">
              AI
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs ${
            isAgent 
              ? 'text-primary-foreground/70' 
              : isAIAgent
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-muted-foreground'
          }`}>
            {format(new Date(message.created_at), 'h:mm a')}
          </p>
          {isStaff && (
            <div className="flex items-center gap-1 ml-2">
              {message.read_by_visitor ? (
                <span className={`text-xs ${
                  isAgent ? 'text-primary-foreground/70' : 'text-blue-600 dark:text-blue-400'
                }`}>✓✓</span>
              ) : (
                <span className={`text-xs ${
                  isAgent ? 'text-primary-foreground/50' : 'text-blue-500 dark:text-blue-500'
                }`}>✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
