import { useState, useCallback, useMemo, useEffect } from 'react'
import { Search, Filter, MoreHorizontal, Archive, Star, Trash2, RefreshCw, TicketCheck } from 'lucide-react'
import { apiClient, EmailInbox, EmailFilter, ConvertToTicketRequest } from '../lib/api'

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

export function InboxPage() {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRead, setFilterRead] = useState<string>('all') // 'all', 'read', 'unread'
  const [emails, setEmails] = useState<EmailInbox[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [total, setTotal] = useState(0)
  
  // These would normally come from app context/router - no longer needed since API client handles it
  // const tenantId = 'tenant-1' // TODO: Get from context
  // const projectId = 'project-1' // TODO: Get from context

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           email.from_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (email.from_name && email.from_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesFilter = filterRead === 'all' || 
                           (filterRead === 'read' && email.is_read) ||
                           (filterRead === 'unread' && !email.is_read)
      return matchesSearch && matchesFilter
    })
  }, [emails, searchQuery, filterRead])

  const loadEmails = useCallback(async () => {
    setLoading(true)
    try {
      const filter: EmailFilter = {
        search: searchQuery || undefined,
        is_read: filterRead === 'all' ? undefined : filterRead === 'read',
        limit: 50
      }
      const result = await apiClient.getEmailInbox(filter)
      setEmails(result.emails)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load emails:', error)
      // In a real app, you'd show a toast/notification
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterRead])

  const handleSyncEmails = useCallback(async () => {
    setSyncing(true)
    try {
      await apiClient.syncEmails()
      await loadEmails() // Reload emails after sync
    } catch (error) {
      console.error('Failed to sync emails:', error)
    } finally {
      setSyncing(false)
    }
  }, [loadEmails])

  const handleConvertToTicket = useCallback(async (emailId: string) => {
    try {
      await apiClient.convertEmailToTicket(emailId, {
        type: 'support',
        priority: 'normal'
      })
      await loadEmails() // Reload to update the converted status
    } catch (error) {
      console.error('Failed to convert email to ticket:', error)
    }
  }, [loadEmails])

  const handleMarkAsRead = useCallback(async (emailId: string) => {
    try {
      await apiClient.markEmailAsRead(emailId)
      await loadEmails() // Reload to update read status
    } catch (error) {
      console.error('Failed to mark email as read:', error)
    }
  }, [loadEmails])

  useEffect(() => {
    loadEmails()
  }, [loadEmails])

  const handleSelectEmail = useCallback((emailId: string) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedEmails.size === filteredEmails.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(filteredEmails.map(email => email.id)))
    }
  }, [selectedEmails.size, filteredEmails])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Email Inbox</h1>
            {total > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {total} email{total > 1 ? 's' : ''} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncEmails}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Emails'}
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={filterRead === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterRead('all')}
            >
              All
            </Button>
            <Button 
              variant={filterRead === 'unread' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterRead('unread')}
            >
              Unread
            </Button>
            <Button 
              variant={filterRead === 'read' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterRead('read')}
            >
              Read
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedEmails.size > 0 && (
        <div className="border-b bg-muted/50 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedEmails.size} email{selectedEmails.size > 1 ? 's' : ''} selected
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

      {/* Emails table */}
      <div className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-12">
                  <input
                    type="checkbox"
                    checked={selectedEmails.size === filteredEmails.length && filteredEmails.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-input"
                  />
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">From</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Subject</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Mailbox</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Type</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Received</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-12">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading emails...
                  </td>
                </tr>
              ) : filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No emails found.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((email) => (
                  <tr 
                    key={email.id}
                    className={`border-b transition-colors hover:bg-muted/50 cursor-pointer ${!email.is_read ? 'font-medium' : ''} ${selectedEmails.has(email.id) ? 'bg-muted/50' : ''}`}
                  >
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(email.id)}
                        onChange={() => handleSelectEmail(email.id)}
                        className="rounded border-input"
                      />
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {!email.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          {email.from_name || email.from_address}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {email.from_address}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{email.subject}</div>
                        {email.snippet && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {email.snippet}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm">{email.mailbox_address}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-2">
                        {email.is_reply && <Badge variant="secondary">Reply</Badge>}
                        {email.has_attachments && <Badge variant="outline">📎 {email.attachment_count}</Badge>}
                      </div>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {email.is_converted_to_ticket ? (
                        <Badge variant="success">
                          <TicketCheck className="w-3 h-3 mr-1" />
                          Ticket Created
                        </Badge>
                      ) : (
                        <Badge variant={email.is_read ? 'outline' : 'secondary'}>
                          {email.is_read ? 'Read' : 'Unread'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm">
                      {new Date(email.received_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex items-center gap-1">
                        {!email.is_converted_to_ticket && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleConvertToTicket(email.id)}
                            title="Convert to Ticket"
                          >
                            <TicketCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {!email.is_read && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleMarkAsRead(email.id)}
                            title="Mark as Read"
                          >
                            📖
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
