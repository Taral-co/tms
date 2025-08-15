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
  Card,
  CardHeader,
  CardContent
} from '@tms/shared'
import { apiClient, EmailInbox, EmailMailbox, EmailConnector, EmailFilter, ConvertToTicketRequest } from '../lib/api'
import { format, isToday, isYesterday } from 'date-fns'

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
      className={`group relative px-4 py-2 hover:bg-accent/50 transition-colors duration-150 cursor-pointer ${
        !email.is_read 
          ? ' dark:bg-blue-950/10' 
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
      } ${isSelected ? 'bg-accent/70 border-l-2 border-l-primary' : ''}`}
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
        {/* Unread indicator */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          !email.is_read ? 'bg-blue-600' : 'bg-transparent'
        }`} />
        
        {/* Sender name */}
        <div className="w-44 flex-shrink-0">
          <span className={`text-sm truncate block ${
            !email.is_read 
              ? 'font-semibold text-foreground' 
              : 'text-muted-foreground'
          }`}>
            {email.from_name || email.from_address}
          </span>
        </div>
        
        {/* Subject and preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm truncate ${
              !email.is_read 
                ? 'font-medium text-foreground' 
                : 'text-muted-foreground'
            }`}>
              {email.subject}
            </span>
            {email.snippet && (
              <>
                <span className="text-muted-foreground">-</span>
                <span className="text-sm text-muted-foreground truncate flex-1">
                  {email.snippet}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Status badges - compact */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {email.has_attachments && (
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          )}
          {email.is_reply && (
            <Reply className="w-5 h-5 text-muted-foreground" />
          )}
          {email.is_converted_to_ticket && (
            <TicketIcon className="w-5 h-5 text-green-600" />
          )}
        </div>
        
        {/* Date */}
        <div className="w-20 flex-shrink-0 text-right">
          <span className={`text-xs ${
            !email.is_read 
              ? 'font-medium' 
              : 'text-muted-foreground'
          }`}>
            {emailDate}
          </span>
        </div>
        
        {/* Quick Actions - minimal */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-background/80"
            onClick={(e) => {
              e.stopPropagation()
              onToggleRead(email)
            }}
            title={email.is_read ? 'Mark as unread' : 'Mark as read'}
          >
            {email.is_read ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
          
          {!email.is_converted_to_ticket && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-background/80"
              onClick={(e) => {
                e.stopPropagation()
                onConvertToTicket(email)
              }}
              title="Convert to ticket"
            >
              <ArrowUpRight className="w-5 h-5" />
            </Button>
          )}
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
  const [connectors, setConnectors] = useState<EmailConnector[]>([])
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
    loadConnectors()
    loadMailboxes()
  }, [])

  // Reload emails when filters change
  useEffect(() => {
    if (connectors.length > 0 && mailboxes.length > 0) {
      loadEmails()
    }
  }, [filters, connectors.length, mailboxes.length])

  const loadConnectors = async () => {
    try {
      const response = await apiClient.getEmailConnectors()
      setConnectors(response.connectors || [])
    } catch (error) {
      console.error('Failed to load connectors:', error)
    }
  }

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
      response.emails.sort((a, b) => {
        const aTime = new Date(a.sent_at || a.received_at).getTime()
        const bTime = new Date(b.sent_at || b.received_at).getTime()
        return bTime - aTime
      })
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
  
  // Show setup messages if connectors or mailboxes are not configured
  if (connectors.length === 0 || mailboxes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Email System Setup</h1>
            <p className="text-muted-foreground">
              Complete these steps to start receiving customer emails
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Step 1: Email Connectors */}
            <Card className={`relative ${connectors.length > 0 ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
              <CardHeader className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  connectors.length > 0 
                    ? 'bg-success/10' 
                    : 'bg-warning/10'
                }`}>
                  <Settings className={`w-8 h-8 ${
                    connectors.length > 0 
                      ? 'text-success' 
                      : 'text-warning'
                  }`} />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-muted-foreground">1.</span>
                  <h2 className="text-xl font-semibold">Email Connectors</h2>
                  {connectors.length > 0 && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                      ✓ Complete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {connectors.length > 0 
                    ? `${connectors.length} email connector${connectors.length === 1 ? '' : 's'} configured successfully.`
                    : 'Configure IMAP/SMTP connectors to connect your email accounts.'
                  }
                </p>
                <Button 
                  onClick={() => navigate('/inbox/connectors')} 
                  className="w-full"
                  variant={connectors.length > 0 ? 'outline' : 'default'}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {connectors.length > 0 ? 'Manage Email Connectors' : 'Configure Email Connectors'}
                </Button>
              </CardContent>
              {connectors.length > 0 && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
                    <span className="text-success-foreground text-sm">✓</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Step 2: Mailboxes */}
            <Card className={`relative ${mailboxes.length > 0 ? 'border-success/30 bg-success/5' : connectors.length > 0 ? 'border-primary/30 bg-primary/5' : 'border-muted bg-muted/50'}`}>
              <CardHeader className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  mailboxes.length > 0 
                    ? 'bg-success/10'
                    : connectors.length > 0 
                      ? 'bg-primary/10'
                      : 'bg-muted'
                }`}>
                  <Mail className={`w-8 h-8 ${
                    mailboxes.length > 0 
                      ? 'text-success'
                      : connectors.length > 0 
                        ? 'text-primary'
                        : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-muted-foreground">2.</span>
                  <h2 className="text-xl font-semibold">Email Mailboxes</h2>
                  {mailboxes.length > 0 && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/30">
                      ✓ Complete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {mailboxes.length > 0 
                    ? `${mailboxes.length} mailbox${mailboxes.length === 1 ? '' : 'es'} configured and ready to receive emails.`
                    : connectors.length > 0 
                      ? 'Create mailboxes using your configured connectors to start receiving emails.'
                      : 'First configure email connectors, then create mailboxes to receive emails.'
                  }
                </p>
                <Button 
                  onClick={() => navigate('/inbox/mailboxes')} 
                  className="w-full"
                  variant={mailboxes.length > 0 ? 'outline' : 'default'}
                  disabled={connectors.length === 0}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {mailboxes.length > 0 ? 'Manage Mailboxes' : 'Configure Mailboxes'}
                </Button>
                {connectors.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Configure connectors first to enable this step
                  </p>
                )}
              </CardContent>
              {mailboxes.length > 0 && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
                    <span className="text-success-foreground text-sm">✓</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Progress indicator */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className={`w-3 h-3 rounded-full ${connectors.length > 0 ? 'bg-success' : 'bg-muted-foreground/30'}`}></div>
              <div className={`w-12 h-1 ${connectors.length > 0 ? 'bg-success' : 'bg-muted-foreground/30'}`}></div>
              <div className={`w-3 h-3 rounded-full ${mailboxes.length > 0 ? 'bg-success' : connectors.length > 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
            </div>
            <p className="text-sm text-muted-foreground">
              {connectors.length === 0 && mailboxes.length === 0 && "Start by configuring your email connectors"}
              {connectors.length > 0 && mailboxes.length === 0 && "Great! Now configure your mailboxes"}
              {connectors.length > 0 && mailboxes.length > 0 && "Setup complete! You can now receive emails"}
            </p>
          </div>
        </div>
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
          <div className="h-full overflow-y-auto px-3">
            {/* Email list header - Gmail style */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                <div className="w-2 flex-shrink-0"></div>
                <div className="w-44 flex-shrink-0">SENDER</div>
                <div className="flex-1">SUBJECT</div>
                <div className="w-16 flex-shrink-0 text-right">DATE</div>
                <div className="w-14 flex-shrink-0"></div>
              </div>
            </div>
            <div className="divide-y divide-border/30">
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
