import React, { useState, useCallback, useMemo } from 'react'
import { Search, Filter, MoreHorizontal, Archive, Star, Reply, Forward, Trash2 } from 'lucide-react'
import { Button, Input, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@tms/shared'

interface Ticket {
  id: string
  subject: string
  customer: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignee?: string
  lastMessage: string
  updatedAt: string
  unread: boolean
}

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'T-001',
    subject: 'Cannot access dashboard after login',
    customer: 'John Smith',
    status: 'open',
    priority: 'high',
    assignee: 'Alice Johnson',
    lastMessage: 'I tried clearing cache but still having issues...',
    updatedAt: '2024-01-20T10:30:00Z',
    unread: true
  },
  {
    id: 'T-002',
    subject: 'Feature request: Export functionality',
    customer: 'Sarah Wilson',
    status: 'pending',
    priority: 'normal',
    assignee: 'Bob Chen',
    lastMessage: 'We will review this request with the product team',
    updatedAt: '2024-01-20T09:15:00Z',
    unread: false
  },
  {
    id: 'T-003',
    subject: 'Payment processing error',
    customer: 'Mike Davis',
    status: 'open',
    priority: 'urgent',
    assignee: 'Alice Johnson',
    lastMessage: 'Transaction failed with error code 500',
    updatedAt: '2024-01-20T08:45:00Z',
    unread: true
  }
]

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'open': return 'secondary'
    case 'pending': return 'warning'
    case 'resolved': return 'success'
    case 'closed': return 'outline'
    default: return 'default'
  }
}

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive'
    case 'high': return 'warning'
    case 'normal': return 'secondary'
    case 'low': return 'outline'
    default: return 'default'
  }
}
    priority: 'high',
    customer: { name: 'John Doe', email: 'john.doe@example.com' },
    assignee: { name: 'Alice Agent', email: 'alice@acme.com' },
    updated_at: '2025-08-10T05:30:00Z',
    unread: true,
    tags: ['mobile', 'login'],
    sla_breached: false
  },
  {
    id: '2',
    number: 'TIC-002',
    subject: 'Feature request: Dark mode',
    status: 'in_progress',
    priority: 'low',
    customer: { name: 'Jane Smith', email: 'jane.smith@test.com' },
    assignee: null,
    updated_at: '2025-08-09T14:20:00Z',
    unread: false,
    tags: ['feature', 'ui'],
    sla_breached: false
  },
  {
    id: '3',
    number: 'TIC-003',
    subject: 'Server performance issues',
    status: 'open',
    priority: 'urgent',
    customer: { name: 'Bob Wilson', email: 'bob.wilson@example.com' },
    assignee: { name: 'Bob Agent', email: 'bob@acme.com' },
    updated_at: '2025-08-10T02:15:00Z',
    unread: true,
    tags: ['performance', 'server'],
    sla_breached: true
  }
]

const filters = [
  { id: 'all', name: 'All tickets', count: 156 },
  { id: 'open', name: 'Open', count: 42 },
  { id: 'assigned', name: 'Assigned to me', count: 12 },
  { id: 'unassigned', name: 'Unassigned', count: 8 },
  { id: 'overdue', name: 'Overdue', count: 3 }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open':
      return <Circle className="h-4 w-4" />
    case 'in_progress':
      return <Clock className="h-4 w-4" />
    case 'resolved':
      return <CheckCircle className="h-4 w-4" />
    case 'closed':
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'high':
      return <Zap className="h-4 w-4 text-orange-500" />
    default:
      return null
  }
}

const formatTimeAgo = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export function InboxPage() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(mockTickets[0])

  return (
    <div className="flex h-full">
      {/* Filters Panel */}
      <div className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-fg">Filters</h2>
        </div>
        <div className="p-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                selectedFilter === filter.id
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:bg-bg-muted hover:text-fg'
              }`}
            >
              <span>{filter.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedFilter === filter.id
                  ? 'bg-primary-fg/20 text-primary-fg'
                  : 'bg-bg-muted text-fg-muted'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
        
        {/* Quick actions */}
        <div className="p-4 border-t border-border mt-4">
          <h3 className="font-medium text-fg mb-2">Quick Actions</h3>
          <div className="space-y-1">
            <button className="w-full text-left rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors">
              Bulk assign
            </button>
            <button className="w-full text-left rounded-md px-3 py-2 text-sm text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="w-96 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Tickets</h2>
            <button className="rounded-md p-2 text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto">
          {mockTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className={`p-4 border-b border-border cursor-pointer transition-colors ${
                selectedTicket?.id === ticket.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-bg-muted'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {ticket.unread && (
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    )}
                    <span className="text-xs font-medium text-fg-muted">
                      {ticket.number}
                    </span>
                    {ticket.sla_breached && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        SLA
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-fg truncate">
                    {ticket.subject}
                  </h3>
                  
                  <div className="flex items-center space-x-2 mt-2 text-xs text-fg-muted">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(ticket.status)}
                      <span className={`status-${ticket.status} px-2 py-1 rounded text-xs font-medium`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {getPriorityIcon(ticket.priority) && (
                      <div className="flex items-center space-x-1">
                        {getPriorityIcon(ticket.priority)}
                        <span className={`priority-${ticket.priority} px-2 py-1 rounded text-xs font-medium`}>
                          {ticket.priority}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-fg-muted truncate">
                      {ticket.customer.name}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {formatTimeAgo(ticket.updated_at)}
                    </span>
                  </div>
                  
                  {ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ticket.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-bg-muted text-fg-muted"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Detail */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Ticket Header */}
            <div className="p-6 border-b border-border bg-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-xl font-semibold text-fg">
                      {selectedTicket.subject}
                    </h1>
                    <span className="text-sm text-fg-muted">
                      #{selectedTicket.number}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(selectedTicket.status)}
                      <span className={`status-${selectedTicket.status} px-2 py-1 rounded font-medium`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {getPriorityIcon(selectedTicket.priority)}
                      <span className={`priority-${selectedTicket.priority} px-2 py-1 rounded font-medium`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                    
                    {selectedTicket.assignee ? (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{selectedTicket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-fg-muted">Unassigned</span>
                    )}
                  </div>
                </div>
                
                <button className="rounded-md p-2 text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Ticket Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Customer info */}
                <div className="card p-4">
                  <h3 className="font-medium text-fg mb-2">Customer</h3>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{selectedTicket.customer.name}</div>
                    <div className="text-fg-muted">{selectedTicket.customer.email}</div>
                  </div>
                </div>

                {/* Timeline placeholder */}
                <div className="card p-4">
                  <h3 className="font-medium text-fg mb-4">Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-fg" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{selectedTicket.customer.name}</div>
                        <div className="text-xs text-fg-muted mb-2">
                          {formatTimeAgo(selectedTicket.updated_at)}
                        </div>
                        <div className="text-sm text-fg">
                          I cannot login to the mobile app. It keeps saying "Invalid credentials" 
                          even though I am using the correct password.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reply editor */}
                <div className="card p-4">
                  <h3 className="font-medium text-fg mb-4">Reply</h3>
                  <div className="space-y-3">
                    <textarea
                      placeholder="Write your reply..."
                      className="w-full h-32 px-3 py-2 border border-input-border rounded-md bg-input text-fg placeholder-fg-muted resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button className="btn btn-secondary text-sm">
                          Attach
                        </button>
                        <button className="btn btn-secondary text-sm">
                          Templates
                        </button>
                      </div>
                      <button className="btn btn-primary">
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-fg-muted">
            Select a ticket to view details
          </div>
        )}
      </div>
    </div>
  )
}
