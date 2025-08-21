import React from 'react'
import { format } from 'date-fns'
import type { ChatSession } from '../../types/chat'

interface SessionCardProps {
  session: ChatSession
  isSelected: boolean
  isFlashing?: boolean
  onClick: () => void
  onAssign: () => void
}

export const SessionCard = React.memo(function SessionCard({ session, isSelected, isFlashing = false, onClick, onAssign }: SessionCardProps) {
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
      } ${isFlashing ? 'animate-pulse bg-primary/10' : ''}`}
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
})
