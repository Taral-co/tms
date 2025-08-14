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
      variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' :
      variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' :
      'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-9 px-3 rounded-md' : 
      size === 'xs' ? 'h-8 px-2 text-xs' :
      'h-10 py-2 px-4'
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Mail className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No emails found</h3>
      <p className="text-muted-foreground mb-4">
        {selectedMailbox === 'all' 
          ? 'No emails have been received yet.'
          : `No emails found for mailbox: ${selectedMailbox}`
        }
      </p>
      <Button onClick={handleSync} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Sync Emails
      </Button>
    </div>
  )
  
  const EmailItem = ({ email }: { email: EmailInbox }) => (
    <div 
      className={`p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
        !email.is_read ? 'bg-primary/5' : ''
      }`}
      onClick={() => handleEmailClick(email)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${!email.is_read ? 'bg-primary' : 'bg-transparent'}`} />
            <span className={`text-sm font-medium truncate ${!email.is_read ? 'font-semibold' : ''}`}>
              {email.from_name || email.from_address}
            </span>
            <span className="text-xs text-muted-foreground">
              {email.from_address}
            </span>
          </div>
          
          <h4 className={`font-medium mb-1 truncate ${!email.is_read ? 'font-semibold' : ''}`}>
            {email.subject}
          </h4>
          
          {email.snippet && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {email.snippet}
            </p>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
            </span>
            
            {email.has_attachments && (
              <Badge variant="secondary" className="text-xs">
                <Paperclip className="w-3 h-3 mr-1" />
                {email.attachment_count}
              </Badge>
            )}
            
            {email.is_reply && (
              <Badge variant="outline" className="text-xs">
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Badge>
            )}
            
            {email.is_converted_to_ticket && (
              <Badge variant="success" className="text-xs">
                <TicketIcon className="w-3 h-3 mr-1" />
                Ticket
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              if (!email.is_read) {
                handleMarkAsRead(email.id)
              }
            }}
            className="h-8 w-8 p-0"
          >
            {email.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          
          {!email.is_converted_to_ticket && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                setSelectedEmail(email)
                setConvertDialogOpen(true)
              }}
              className="h-8 w-8 p-0"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          )}
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Inbox</h1>
            <p className="text-muted-foreground">
              {total} emails • {emails.filter(e => !e.is_read).length} unread
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SettingsDropdown />
            <Button 
              variant="outline" 
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Mailbox:</span>
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
          
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ ...filter, is_read: filter.is_read === false ? undefined : false })}
            className={filter.is_read === false ? 'bg-primary text-primary-foreground' : ''}
          >
            <Filter className="w-4 h-4 mr-1" />
            Unread
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ ...filter, has_attachments: filter.has_attachments === true ? undefined : true })}
            className={filter.has_attachments === true ? 'bg-primary text-primary-foreground' : ''}
          >
            <Paperclip className="w-4 h-4 mr-1" />
            Attachments
          </Button>
        </div>
      </div>
      
      {/* Email List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : emails.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="divide-y divide-border">
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
