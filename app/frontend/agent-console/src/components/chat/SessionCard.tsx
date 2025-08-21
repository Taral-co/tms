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
        {/* Customer Avatar - Enterprise Design */}
        <div className="relative">
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-primary/10 transition-all group-hover:ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
              {getCustomerInitials()}
            </AvatarFallback>
          </Avatar>
          {/* Online status indicator for active sessions */}
          {session.status === 'active' && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success border-2 border-background rounded-full animate-pulse" />
          )}
        </div>

        {/* Session Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header with name and status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {session.customer_name || session.customer_email || 'Guest User'}
              </h4>
              <Badge 
                variant={getStatusVariant(session.status)} 
                className="shrink-0 text-xs px-2 py-1 font-medium"
              >
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
                className="h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10"
                aria-label="Assign session"
              >
                <User className="h-3 w-3 mr-1.5" />
                Assign
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-2 py-1 rounded-md">
                <User className="h-3 w-3" />
                <span className="truncate max-w-20 font-medium" title={session.assigned_agent_name}>
                  {session.assigned_agent_name}
                </span>
              </div>
            )}
          </div>

          {/* Widget and metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="truncate font-medium" title={session.widget_name}>
                {session.widget_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span title={format(new Date(session.created_at), 'PPpp')} className="font-medium">
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Additional info for selected state */}
          {isSelected && (
            <div className="pt-2 border-t border-border/50 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="font-medium">{format(new Date(session.created_at), 'MMM d, h:mm a')}</span>
              </div>
              {session.customer_email && session.customer_name && (
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <span className="truncate font-mono text-xs ml-2" title={session.customer_email}>
                    {session.customer_email}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
