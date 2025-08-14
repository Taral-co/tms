import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Settings, 
  Mail, 
  TicketIcon, 
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUpRight,
  Reply,
  Paperclip
} from 'lucide-react'
import { apiClient, EmailInbox, EmailMailbox, EmailFilter, ConvertToTicketRequest } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'

// Temporary UI components since @tms/shared has build issues
const Button = ({ children, variant = 'default', size = 'default', className = '', disabled = false, onClick, ...props }: any) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
      variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' :
      variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' :
      'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-8 px-3 text-sm' : 
      size === 'xs' ? 'h-6 px-2 text-xs' :
      'h-9 px-4'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
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

const Input = ({ className = '', ...props }: any) => (
  <input 
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

const Select = ({ children, value, onValueChange, disabled = false, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        {...props}
      >
        <span className="line-clamp-1">{value || 'Select...'}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

const SelectItem = ({ children, value, onSelect }: any) => (
  <div
    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
    onClick={() => onSelect?.(value)}
  >
    <span>{children}</span>
  </div>
)

const Dialog = ({ children, open, onOpenChange }: any) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-lg mx-4">
        {children}
      </div>
    </div>
  )
}

const DialogContent = ({ children }: any) => (
  <div className="p-6">
    {children}
  </div>
)

const DialogHeader = ({ children }: any) => (
  <div className="mb-4">
    {children}
  </div>
)

const DialogTitle = ({ children }: any) => (
  <h2 className="text-lg font-semibold">
    {children}
  </h2>
)

export function InboxPage() {
  const navigate = useNavigate()
  
  // State management
  const [emails, setEmails] = useState<EmailInbox[]>([])
  const [mailboxes, setMailboxes] = useState<EmailMailbox[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedMailbox, setSelectedMailbox] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState({
    is_read: undefined as boolean | undefined,
    has_attachments: undefined as boolean | undefined,
    is_reply: undefined as boolean | undefined,
  })
  const [selectedEmail, setSelectedEmail] = useState<EmailInbox | null>(null)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false)
  const [total, setTotal] = useState(0)
  
  // Load initial data
  useEffect(() => {
    loadMailboxes()
    loadEmails()
  }, [])
  
  // Reload emails when filters change
  useEffect(() => {
    loadEmails()
  }, [selectedMailbox, searchQuery, filter])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (settingsDropdownOpen && !target.closest('.settings-dropdown')) {
        setSettingsDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [settingsDropdownOpen])
  
  const loadMailboxes = async () => {
    try {
      const response = await apiClient.getEmailMailboxes()
      setMailboxes(response.mailboxes || [])
    } catch (error) {
      console.error('Failed to load mailboxes:', error)
    }
  }
  
  const loadEmails = async () => {
    setLoading(true)
    try {
      const emailFilter: EmailFilter = {
        limit: 50,
        page: 1,
        ...(selectedMailbox !== 'all' && { mailbox: selectedMailbox }),
        ...(searchQuery && { search: searchQuery }),
        ...filter
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
  }
  
  const handleSync = async () => {
    setSyncing(true)
    try {
      await apiClient.syncEmails()
      // Reload emails after sync
      await loadEmails()
    } catch (error) {
      console.error('Failed to sync emails:', error)
      alert('Failed to sync emails. Please try again.')
    } finally {
      setSyncing(false)
    }
  }
  
  const handleMarkAsRead = async (emailId: string) => {
    try {
      await apiClient.markEmailAsRead(emailId)
      // Update email state
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, is_read: true } : email
      ))
    } catch (error) {
      console.error('Failed to mark email as read:', error)
    }
  }
  
  const handleConvertToTicket = async (emailId: string, ticketData: ConvertToTicketRequest) => {
    try {
      await apiClient.convertEmailToTicket(emailId, ticketData)
      // Update email state
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, is_converted_to_ticket: true } : email
      ))
      setConvertDialogOpen(false)
    } catch (error) {
      console.error('Failed to convert email to ticket:', error)
      alert('Failed to convert email to ticket. Please try again.')
    }
  }
  
  const handleEmailClick = (email: EmailInbox) => {
    setSelectedEmail(email)
    if (!email.is_read) {
      handleMarkAsRead(email.id)
    }
  }
  
  const SettingsDropdown = () => (
    <div className="relative settings-dropdown">
      <Button 
        variant="outline" 
        onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
        className="gap-2"
      >
        <Settings className="w-4 h-4" />
        Settings
        <ChevronDown className="w-4 h-4" />
      </Button>
      {settingsDropdownOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border bg-popover shadow-md">
          <div className="p-1">
            <div
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onClick={() => {
                navigate('/inbox/mailboxes')
                setSettingsDropdownOpen(false)
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              <span>Manage Mailboxes</span>
            </div>
            <div
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onClick={() => {
                navigate('/inbox/connectors')
                setSettingsDropdownOpen(false)
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              <span>Manage Connectors</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Mail className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1 text-foreground">No emails found</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm">
        {selectedMailbox === 'all' 
          ? 'No emails have been received yet. Try syncing to check for new messages.'
          : `No emails found for mailbox: ${selectedMailbox}`
        }
      </p>
      <Button onClick={handleSync} variant="outline" size="sm" className="h-8">
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Sync Emails
      </Button>
    </div>
  )
  
  const EmailItem = ({ email }: { email: EmailInbox }) => (
    <div 
      className={`px-6 py-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group ${
        !email.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
      }`}
      onClick={() => handleEmailClick(email)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Read/Unread Indicator */}
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!email.is_read ? 'bg-blue-600' : 'bg-transparent'}`} />
          
          {/* Avatar/Initials */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {(email.from_name || email.from_address).charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Email Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                {email.from_name || email.from_address}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
              </span>
            </div>
            
            <h4 className={`text-sm mb-1 truncate ${!email.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
              {email.subject}
            </h4>
            
            {email.snippet && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {email.snippet}
              </p>
            )}
          </div>
        </div>
        
        {/* Badges and Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            {email.has_attachments && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                <Paperclip className="w-2.5 h-2.5 mr-0.5" />
                {email.attachment_count}
              </Badge>
            )}
            
            {email.is_reply && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                <Reply className="w-2.5 h-2.5 mr-0.5" />
                Re
              </Badge>
            )}
            
            {email.is_converted_to_ticket && (
              <Badge variant="success" className="text-xs h-5 px-1.5">
                <TicketIcon className="w-2.5 h-2.5 mr-0.5" />
                Ticket
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                if (!email.is_read) {
                  handleMarkAsRead(email.id)
                }
              }}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              {email.is_read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            
            {!email.is_converted_to_ticket && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  setSelectedEmail(email)
                  setConvertDialogOpen(true)
                }}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
  
  // Show setup message if no mailboxes configured
  if (mailboxes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-lg">
          <Mail className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-4">Email Setup Required</h2>
          <p className="text-muted-foreground mb-6">
            Configure email connectors and mailboxes to start receiving customer emails as tickets.
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/inbox/connectors')} className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Configure Email Setup
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Inbox</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="font-medium">{total}</span>
                <span>emails</span>
                {emails.filter(e => !e.is_read).length > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-blue-600">{emails.filter(e => !e.is_read).length}</span>
                    <span>unread</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SettingsDropdown />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSync} 
                disabled={syncing}
                className="h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>
          
          {/* Compact Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mailbox</span>
              <Select
                value={selectedMailbox}
                onValueChange={setSelectedMailbox}
              >
                <SelectItem value="all" onSelect={() => setSelectedMailbox('all')}>
                  All Mailboxes
                </SelectItem>
                {mailboxes.map((mailbox) => (
                  <SelectItem 
                    key={mailbox.id} 
                    value={mailbox.address}
                    onSelect={() => setSelectedMailbox(mailbox.address)}
                  >
                    {mailbox.address}
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant={filter.is_read === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, is_read: filter.is_read === false ? undefined : false })}
                className="h-7 px-2.5 text-xs"
              >
                <Filter className="w-3 h-3 mr-1" />
                Unread
              </Button>
              
              <Button
                variant={filter.has_attachments === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, has_attachments: filter.has_attachments === true ? undefined : true })}
                className="h-7 px-2.5 text-xs"
              >
                <Paperclip className="w-3 h-3 mr-1" />
                Attachments
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email List */}
      <div className="flex-1 overflow-hidden bg-background">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading emails...</span>
            </div>
          </div>
        ) : emails.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="divide-y divide-border/50">
              {emails.map((email) => (
                <EmailItem key={email.id} email={email} />
              ))}
            </div>
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
              <div>
                <label className="text-sm font-medium">Subject</label>
                <p className="text-sm text-muted-foreground">{selectedEmail.subject}</p>
              </div>
              <div>
                <label className="text-sm font-medium">From</label>
                <p className="text-sm text-muted-foreground">
                  {selectedEmail.from_name} ({selectedEmail.from_address})
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleConvertToTicket(selectedEmail.id, {
                    type: 'question',
                    priority: 'normal'
                  })}
                  className="flex-1"
                >
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
