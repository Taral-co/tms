import React, { useRef, useEffect } from 'react'
import { format } from 'date-fns'
import type { ChatMessage } from '../../types/chat'

interface MessageBubbleProps {
  message: ChatMessage
  onMarkAsRead?: (messageId: string) => void
}

export const MessageBubble = React.memo(function MessageBubble({ message, onMarkAsRead }: MessageBubbleProps) {
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
})
