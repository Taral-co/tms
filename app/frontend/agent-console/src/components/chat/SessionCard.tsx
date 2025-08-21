import React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Badge, Button, Avatar, AvatarFallback } from '@tms/shared'
import { MessageCircle, Clock, User } from 'lucide-react'
import type { ChatSession } from '../../types/chat'

interface SessionCardProps {
  session: ChatSession
  isSelected: boolean
  isFlashing?: boolean
  onClick: () => void
  onAssign: () => void
}

export const SessionCard = React.memo(function SessionCard({ 
  session, 
  isSelected, 
  isFlashing = false, 
  onClick, 
  onAssign 
}: SessionCardProps) {
  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' => {
    switch (status) {
      case 'active': return 'success'
      case 'waiting': return 'warning'
      case 'ended': return 'secondary'
      case 'transferred': return 'default'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Active'
      case 'waiting': return 'Waiting'
      case 'ended': return 'Ended'
      case 'transferred': return 'Transferred'
      default: return status
    }
  }

  const getCustomerInitials = () => {
    const name = session.customer_name || session.customer_email || 'Guest'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const timeAgo = formatDistanceToNow(new Date(session.last_activity_at || session.created_at), { 
    addSuffix: true 
  })

  return (
    <div
      className={`
        group relative p-4 border-b border-border cursor-pointer 
        transition-all duration-200 ease-in-out
        hover:bg-accent/50 hover:shadow-sm
        ${isSelected 
          ? 'bg-primary/5 border-l-4 border-l-primary shadow-sm' 
          : 'hover:border-l-4 hover:border-l-primary/30'
        }
        ${isFlashing ? 'animate-pulse bg-primary/10' : ''}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Chat session with ${session.customer_name || session.customer_email}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Customer Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getCustomerInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Session Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header with name and status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {session.customer_name || session.customer_email || 'Guest User'}
              </h4>
              <Badge variant={getStatusVariant(session.status)} className="shrink-0">
                {getStatusLabel(session.status)}
              </Badge>
            </div>
            
            {/* Assign button or assigned indicator */}
            {!session.assigned_agent_id ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onAssign()
                }}
                className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Assign session"
              >
                <User className="h-3 w-3 mr-1" />
                Assign
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-primary opacity-75">
                <User className="h-3 w-3" />
                <span className="truncate max-w-20" title={session.assigned_agent_name}>
                  {session.assigned_agent_name}
                </span>
              </div>
            )}
          </div>

          {/* Widget and metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span className="truncate" title={session.widget_name}>
                {session.widget_name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span title={format(new Date(session.created_at), 'PPpp')}>
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Additional info for selected state */}
          {isSelected && (
            <div className="text-xs text-muted-foreground">
              <div>Created: {format(new Date(session.created_at), 'MMM d, h:mm a')}</div>
              {session.customer_email && session.customer_name && (
                <div className="truncate">{session.customer_email}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active session indicator */}
      {session.status === 'active' && (
        <div className="absolute top-2 right-2 h-2 w-2 bg-success rounded-full animate-pulse" />
      )}
    </div>
  )
})
