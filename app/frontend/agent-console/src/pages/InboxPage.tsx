import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  RefreshCw, 
  Search, 
  Settings, 
  Mail, 
  TicketIcon,
  Eye,
  EyeOff,
  ArrowUpRight,
  Reply,
  Paperclip,
  ChevronRight,
  Inbox
} from 'lucide-react'
import { 
  Button, 
  Badge, 
  Input, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
  Card,
  CardHeader,
  CardContent
} from '@tms/shared'
import { apiClient, EmailInbox, EmailMailbox, EmailFilter, ConvertToTicketRequest } from '../lib/api'
import { format, isToday, isYesterday } from 'date-fns'

// Simple dropdown component since it's not in shared
const DropdownMenu = ({ children }: { children: React.ReactNode }) => children
const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => children
const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border bg-popover shadow-md">
    <div className="p-1">{children}</div>
  </div>
)
const DropdownMenuItem = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <div
    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
    onClick={onClick}
  >
    {children}
  </div>
)
const DropdownMenuSeparator = () => <div className="mx-1 my-1 h-px bg-border" />

// Simple tooltip component since it's not in shared
const TooltipProvider = ({ children }: { children: React.ReactNode }) => children
const Tooltip = ({ children }: { children: React.ReactNode }) => children
const TooltipTrigger = ({ children }: { children: React.ReactNode }) => children
const TooltipContent = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute z-50 rounded bg-popover px-2 py-1 text-xs shadow-md">
    {children}
  </div>
)

// Filter state type
interface FilterState {
  mailbox: string
  isRead?: boolean
  hasAttachments?: boolean
  isReply?: boolean
  search: string
  dateRange?: {
    from?: Date
    to?: Date
  }
}

// Smart date formatting
const formatEmailDate = (date: string | Date, sentAt?: string | Date) => {
  // Use sent_at if available and valid, otherwise use received_at
  const emailDate = sentAt && new Date(sentAt).getTime() > 0 ? new Date(sentAt) : new Date(date)
  
  if (isToday(emailDate)) {
    return format(emailDate, 'HH:mm')
  }
  if (isYesterday(emailDate)) {
    return 'Yesterday'
  }
  if (emailDate.getFullYear() === new Date().getFullYear()) {
    return format(emailDate, 'MMM d')
  }
  return format(emailDate, 'MMM d, yyyy')
}

// Email status utilities
const getEmailStatusBadge = (email: EmailInbox) => {
  const badges = []
  
  if (email.is_reply) {
    badges.push(
      <Badge key="reply" variant="outline" className="text-xs">
        <Reply className="w-2.5 h-2.5 mr-1" />
        Reply
      </Badge>
    )
  }
  
  if (email.has_attachments) {
    badges.push(
      <Badge key="attachments" variant="secondary" className="text-xs">
        <Paperclip className="w-2.5 h-2.5 mr-1" />
        {email.attachment_count}
      </Badge>
    )
  }
  
  if (email.is_converted_to_ticket) {
    badges.push(
      <Badge key="ticket" variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <TicketIcon className="w-2.5 h-2.5 mr-1" />
        Ticket
      </Badge>
    )
  }
  
  return badges
}

// Virtualized email item component (simplified for now)
interface EmailItemProps {
  email: EmailInbox
  isSelected: boolean
  onEmailSelect: (email: EmailInbox) => void
  onToggleRead: (email: EmailInbox) => void
  onConvertToTicket: (email: EmailInbox) => void
}

const EmailItem = ({ email, isSelected, onEmailSelect, onToggleRead, onConvertToTicket }: EmailItemProps) => {
  const emailDate = formatEmailDate(email.received_at, email.sent_at)
  
  return (
    <div 
      className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
        !email.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-500' : ''
      } ${isSelected ? 'bg-accent/50' : ''}`}
      onClick={() => onEmailSelect(email)}
      role="listitem"
      tabIndex={0}
      aria-label={`Email from ${email.from_name || email.from_address}: ${email.subject}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEmailSelect(email)
        }
      }}
    >
      <div className="flex items-center gap-3">
        {/* Read/Unread Indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!email.is_read ? 'bg-blue-600' : 'bg-transparent'}`} />
        
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {(email.from_name || email.from_address).charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* Email Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate max-w-[200px] ${!email.is_read ? 'font-semibold' : 'font-medium'}`}>
                {email.from_name || email.from_address}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {emailDate}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleRead(email)
                }}
              >
                {email.is_read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
              
              {!email.is_converted_to_ticket && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onConvertToTicket(email)
                  }}
                >
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          
          <h4 className={`text-sm mb-1 truncate ${!email.is_read ? 'font-semibold' : 'font-medium'}`}>
            {email.subject}
          </h4>
          
          {email.snippet && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {email.snippet}
            </p>
          )}
          
          {/* Status Badges */}
          <div className="flex items-center gap-1 flex-wrap">
            {getEmailStatusBadge(email)}
          </div>
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
      </div>
    </div>
  )
}

// Main inbox component
export function InboxPage() {
  const navigate = useNavigate()
  
  // State management
  const [emails, setEmails] = useState<EmailInbox[]>([])
  const [mailboxes, setMailboxes] = useState<EmailMailbox[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<EmailInbox | null>(null)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [total, setTotal] = useState(0)
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    mailbox: 'all',
    search: '',
  })
  
  // Load initial data
  useEffect(() => {
    loadMailboxes()
  }, [])
  
  // Reload emails when filters change
  useEffect(() => {
    loadEmails()
  }, [filters])
  
  const loadMailboxes = async () => {
    try {
      const response = await apiClient.getEmailMailboxes()
      setMailboxes(response.mailboxes || [])
    } catch (error) {
      console.error('Failed to load mailboxes:', error)
    }
  }
  
  const loadEmails = useCallback(async () => {
    setLoading(true)
    try {
      const emailFilter: EmailFilter = {
        limit: 100, // Load more for better virtualization
        page: 1,
        ...(filters.mailbox !== 'all' && { mailbox: filters.mailbox }),
        ...(filters.search && { search: filters.search }),
        ...(filters.isRead !== undefined && { is_read: filters.isRead }),
        ...(filters.hasAttachments !== undefined && { has_attachments: filters.hasAttachments }),
        ...(filters.isReply !== undefined && { is_reply: filters.isReply }),
      }
      
      const response = await apiClient.getEmailInbox(emailFilter)
      setEmails(response.emails || [])
      setTotal(response.total || 0)
    } catch (error) {
      console.error('Failed to load emails:', error)
      setEmails([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filters])
  
  const handleSync = async () => {
    setSyncing(true)
    try {
      await apiClient.syncEmails()
      await loadEmails()
    } catch (error) {
      console.error('Failed to sync emails:', error)
    } finally {
      setSyncing(false)
    }
  }
  
  const handleEmailSelect = (email: EmailInbox) => {
    // Navigate to email detail page
    navigate(`/inbox/emails/${email.id}`)
  }
  
  const handleToggleRead = async (email: EmailInbox) => {
    try {
      if (!email.is_read) {
        await apiClient.markEmailAsRead(email.id)
      }
      // Update local state
      setEmails(emails.map(e => 
        e.id === email.id ? { ...e, is_read: !e.is_read } : e
      ))
    } catch (error) {
      console.error('Failed to toggle read status:', error)
    }
  }
  
  const handleConvertToTicket = (email: EmailInbox) => {
    setSelectedEmail(email)
    setConvertDialogOpen(true)
  }
  
  const handleConvertToTicketSubmit = async (ticketData: ConvertToTicketRequest) => {
    if (!selectedEmail) return
    
    try {
      await apiClient.convertEmailToTicket(selectedEmail.id, ticketData)
      setEmails(emails.map(email => 
        email.id === selectedEmail.id ? { ...email, is_converted_to_ticket: true } : email
      ))
      setConvertDialogOpen(false)
    } catch (error) {
      console.error('Failed to convert email to ticket:', error)
    }
  }
  
  // Memoized filter functions
  const unreadCount = useMemo(() => emails.filter(e => !e.is_read).length, [emails])
  const attachmentCount = useMemo(() => emails.filter(e => e.has_attachments).length, [emails])
  
  // Show setup message if no mailboxes configured
  if (mailboxes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Email Setup Required</h2>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Configure email connectors and mailboxes to start receiving customer emails as tickets.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/inbox/connectors')} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Configure Email Setup
              </Button>
              <Button variant="outline" onClick={() => navigate('/inbox/mailboxes')} className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Manage Mailboxes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Inbox className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-semibold">Inbox</h1>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="font-medium">{total}</span>
                <span>emails</span>
                {unreadCount > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-3 mx-2" />
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {unreadCount} unread
                    </Badge>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/inbox/mailboxes')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Mailboxes
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/inbox/connectors')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Connectors
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSync} 
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Mailbox Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Mailbox:</span>
              <Select 
                value={filters.mailbox} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, mailbox: value }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mailboxes</SelectItem>
                  {mailboxes.map((mailbox) => (
                    <SelectItem key={mailbox.id} value={mailbox.address}>
                      {mailbox.display_name || mailbox.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant={filters.isRead === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  isRead: prev.isRead === false ? undefined : false 
                }))}
              >
                <Eye className="w-4 h-4 mr-2" />
                Unread ({unreadCount})
              </Button>
              
              <Button
                variant={filters.hasAttachments === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  hasAttachments: prev.hasAttachments === true ? undefined : true 
                }))}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Attachments ({attachmentCount})
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading emails...</span>
            </div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No emails found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {filters.mailbox === 'all' 
                ? 'No emails have been received yet. Try syncing to check for new messages.'
                : `No emails found for the selected filters.`
              }
            </p>
            <Button onClick={handleSync} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Emails
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {emails.map((email) => (
              <EmailItem 
                key={email.id} 
                email={email}
                isSelected={selectedEmailId === email.id}
                onEmailSelect={handleEmailSelect}
                onToggleRead={handleToggleRead}
                onConvertToTicket={handleConvertToTicket}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Convert to Ticket Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Email to Ticket</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  {selectedEmail.subject}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <p className="text-sm text-muted-foreground">
                  {selectedEmail.from_name && `${selectedEmail.from_name} `}
                  ({selectedEmail.from_address})
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleConvertToTicketSubmit({
                    type: 'question',
                    priority: 'normal'
                  })}
                  className="flex-1"
                >
                  <TicketIcon className="w-4 h-4 mr-2" />
                  Convert to Ticket
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setConvertDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
