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
      className={`group relative px-6 py-4 hover:bg-accent/30 transition-all duration-200 cursor-pointer border-l-4 ${
        !email.is_read 
          ? 'bg-blue-50/30 dark:bg-blue-950/20 border-l-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30' 
          : 'border-l-transparent hover:border-l-accent'
      } ${isSelected ? 'bg-accent/50 border-l-primary' : ''}`}
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
      <div className="flex items-start gap-4">
        {/* Avatar with better design */}
        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          !email.is_read 
            ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' 
            : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300'
        }`}>
          <span className="text-sm font-semibold">
            {(email.from_name || email.from_address).charAt(0).toUpperCase()}
          </span>
          {!email.is_read && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-background"></div>
          )}
        </div>
        
        {/* Email Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h3 className={`text-sm truncate ${!email.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                {email.from_name || email.from_address}
              </h3>
              {email.from_name && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {email.from_address}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs ${!email.is_read ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                {emailDate}
              </span>
              
              {/* Quick Actions - Better positioned */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-background/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleRead(email)
                  }}
                  title={email.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  {email.is_read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                
                {!email.is_converted_to_ticket && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-background/80"
                    onClick={(e) => {
                      e.stopPropagation()
                      onConvertToTicket(email)
                    }}
                    title="Convert to ticket"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Subject */}
          <h4 className={`text-sm mb-2 line-clamp-1 ${!email.is_read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
            {email.subject}
          </h4>
          
          {/* Preview */}
          {email.snippet && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {email.snippet}
            </p>
          )}
          
          {/* Status Badges - Better layout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {getEmailStatusBadge(email)}
            </div>
            
            {/* Chevron indicator */}
            <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
              isSelected ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground/60'
            }`} />
          </div>
        </div>
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
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-slate-50/20 dark:to-slate-950/20">
      {/* Enhanced Header with gradient and glass effect */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                  <Inbox className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Email Inbox
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Manage and organize your customer communications
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/50 rounded-full border border-blue-200 dark:border-blue-800">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">{total} total</span>
                    </div>
                    {unreadCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-950/50 rounded-full border border-orange-200 dark:border-orange-800">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="font-medium text-orange-700 dark:text-orange-300">{unreadCount} unread</span>
                      </div>
                    )}
                  </div>
                </div>
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your emails...</p>
            </div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                {filters.search || filters.mailbox !== 'all' || filters.isRead !== undefined 
                  ? 'No emails found' 
                  : 'Your inbox is empty'}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {filters.search || filters.mailbox !== 'all' || filters.isRead !== undefined
                  ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
                  : 'When you receive emails, they\'ll appear here. Try syncing to check for new messages.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                {(filters.search || filters.mailbox !== 'all' || filters.isRead !== undefined) && (
                  <Button 
                    variant="outline" 
                    onClick={() => setFilters({ mailbox: 'all', search: '' })}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="divide-y divide-border">
              {emails.map((email) => (
                <EmailItem 
                  key={email.id} 
                  email={email}
                  isSelected={selectedEmail?.id === email.id}
                  onEmailSelect={handleEmailSelect}
                  onToggleRead={handleToggleRead}
                  onConvertToTicket={handleConvertToTicket}
                />
              ))}
            </div>
            
            {/* Load more emails indicator */}
            {emails.length > 0 && (
              <div className="text-center py-8 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Showing {emails.length} of {total} emails
                </p>
                {emails.length < total && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      // TODO: Implement load more functionality
                      console.log('Load more emails')
                    }}
                  >
                    Load more emails
                  </Button>
                )}
              </div>
            )}
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
