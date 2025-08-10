import React, { useState, useCallback, useMemo } from 'react'
import { Search, Filter, MoreHorizontal, Archive, Star, Reply, Forward, Trash2 } from 'lucide-react'

// Temporary simplified UI components since @tms/shared may have build issues
const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }: any) => (
  <button 
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
      variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' :
      variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
      'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-9 px-3 rounded-md' : 'h-10 py-2 px-4'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
)

const Input = ({ className = '', ...props }: any) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

const Badge = ({ children, variant = 'default', className = '' }: any) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
    variant === 'destructive' ? 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80' :
    variant === 'warning' ? 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
    variant === 'success' ? 'border-transparent bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
    variant === 'secondary' ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80' :
    variant === 'outline' ? 'text-foreground' :
    'border-transparent bg-primary text-primary-foreground hover:bg-primary/80'
  } ${className}`}>
    {children}
  </span>
)

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
  },
  {
    id: 'T-004',
    subject: 'Website loading slowly',
    customer: 'Emma Clark',
    status: 'resolved',
    priority: 'normal',
    assignee: 'Charlie Brown',
    lastMessage: 'Issue has been resolved by optimizing database queries',
    updatedAt: '2024-01-19T16:20:00Z',
    unread: false
  },
  {
    id: 'T-005',
    subject: 'Mobile app crashes on startup',
    customer: 'David Lee',
    status: 'open',
    priority: 'urgent',
    assignee: 'Alice Johnson',
    lastMessage: 'Happening consistently on iOS 17.2',
    updatedAt: '2024-01-20T11:45:00Z',
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

export function InboxPage() {
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredTickets = useMemo(() => {
    return MOCK_TICKETS.filter(ticket => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           ticket.customer.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterStatus === 'all' || ticket.status === filterStatus
      return matchesSearch && matchesFilter
    })
  }, [searchQuery, filterStatus])

  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId)
      } else {
        newSet.add(ticketId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set())
    } else {
      setSelectedTickets(new Set(filteredTickets.map(t => t.id)))
    }
  }, [selectedTickets.size, filteredTickets])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button size="sm">
              New Ticket
            </Button>
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={filterStatus === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button 
              variant={filterStatus === 'open' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterStatus('open')}
            >
              Open
            </Button>
            <Button 
              variant={filterStatus === 'pending' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterStatus('pending')}
            >
              Pending
            </Button>
            <Button 
              variant={filterStatus === 'resolved' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterStatus('resolved')}
            >
              Resolved
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedTickets.size > 0 && (
        <div className="border-b bg-muted/50 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedTickets.size} ticket{selectedTickets.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-2" />
                Star
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets table */}
      <div className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-12">
                  <input
                    type="checkbox"
                    checked={selectedTickets.size === filteredTickets.length && filteredTickets.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-input"
                  />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Ticket</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Customer</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Priority</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Assignee</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Last Updated</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-12"></th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredTickets.map((ticket) => (
                <tr 
                  key={ticket.id}
                  className={`border-b transition-colors hover:bg-muted/50 cursor-pointer ${ticket.unread ? 'font-medium' : ''} ${selectedTickets.has(ticket.id) ? 'bg-muted/50' : ''}`}
                >
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <input
                      type="checkbox"
                      checked={selectedTickets.has(ticket.id)}
                      onChange={() => handleSelectTicket(ticket.id)}
                      className="rounded border-input"
                    />
                  </td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {ticket.unread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        {ticket.subject}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.lastMessage}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium">{ticket.customer}</td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{ticket.assignee || 'Unassigned'}</td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
