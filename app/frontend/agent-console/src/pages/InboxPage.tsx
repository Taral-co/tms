import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, TicketCheck, Plus, Settings, CheckCircle, AlertCircle, Clock, Mail } from 'lucide-react'
import { apiClient, EmailConnector, EmailMailbox } from '../lib/api'

// Temporary simplified UI components since @tms/shared may have build issues
const Button = ({ children, variant = 'default', size = 'default', className = '', disabled = false, ...props }: any) => (
  <button 
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
      variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' :
      variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-9 px-3 rounded-md' : 'h-10 py-2 px-4'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
)

// Custom input component since @tms/shared is not working
// Removed unused Input component since we no longer need modals

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

const Card = ({ children, className = '' }: any) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children, className = '' }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
)

const CardTitle = ({ children, className = '' }: any) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
)

const CardContent = ({ children, className = '' }: any) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
)

export function InboxPage() {
  const navigate = useNavigate()
  const [connectors, setConnectors] = useState<EmailConnector[]>([])
  const [mailboxes, setMailboxes] = useState<EmailMailbox[]>([])
  const [loading, setLoading] = useState(false)
  
  // Load connectors and mailboxes on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [connectorsResponse, mailboxesResponse] = await Promise.all([
        apiClient.getEmailConnectors(),
        apiClient.getEmailMailboxes()
      ])
      setConnectors(connectorsResponse.connectors || [])
      setMailboxes(mailboxesResponse.mailboxes || [])
    } catch (error) {
      console.error('Failed to load email data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConnector = () => {
    console.log('handleCreateConnector clicked - navigating to /inbox/add')
    navigate('/inbox/add')
  }

  const handleEditConnector = (_connector: EmailConnector) => {
    // For now, navigate to add page. Later we can add edit functionality
    navigate('/inbox/add')
  }

  const handleCreateMailbox = () => {
    const validatedConnectors = connectors.filter(c => c.is_validated && c.validation_status === 'validated')
    if (validatedConnectors.length === 0) {
      alert('Please add and validate at least one email connector first. Domain validation is required before creating email inboxes.')
      return
    }
    // TODO: Create a separate mailbox page
    alert('Mailbox creation will be implemented')
  }

  const getValidationStatusBadge = (connector: EmailConnector) => {
    switch (connector.validation_status) {
      case 'validated':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Domain Verified
        </Badge>
      case 'validating':
        return <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Validating Domain
        </Badge>
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Validation Failed
        </Badge>
      default:
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Domain Not Validated
        </Badge>
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading email configuration...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no connectors
  if (connectors.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">No Email Inbox Attached</h2>
          <p className="text-muted-foreground mb-6">
            Connect your email accounts to start receiving and managing customer emails as tickets.
          </p>
          <Button onClick={handleCreateConnector} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Attach Email Box
          </Button>
        </div>
      </div>
    )
  }  return (
    <div className="h-full max-h-screen p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Inbox</h1>
          <p className="text-muted-foreground">
            Manage email connectors and mailboxes for your project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateConnector}>
            <Plus className="w-4 h-4 mr-2" />
            Add Connector
          </Button>
        </div>
      </div>

      {/* Email Connectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Email Connectors
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure email connectors and validate domain ownership. Domain validation is required before creating email inboxes.
          </p>
        </CardHeader>
        <CardContent>
          {connectors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No email connectors configured.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connectors.map((connector) => (
                <div
                  key={connector.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{connector.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {connector.type.replace('_', ' ').toUpperCase()} • {connector.from_address || 'No address'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getValidationStatusBadge(connector)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditConnector(connector)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Mailboxes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TicketCheck className="w-5 h-5" />
              Email Mailboxes
            </CardTitle>
            <Button
              onClick={handleCreateMailbox}
              disabled={connectors.filter(c => c.is_validated && c.validation_status === 'validated').length === 0}
              title={connectors.filter(c => c.is_validated && c.validation_status === 'validated').length === 0 ? 'Domain validation required: Please validate at least one email connector first' : 'Create new email mailbox'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Mailbox
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mailboxes.length === 0 ? (
            <div className="text-center py-8">
              {connectors.filter(c => c.is_validated && c.validation_status === 'validated').length === 0 ? (
                <>
                  <p className="text-muted-foreground mb-2">
                    No email mailboxes configured.
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Domain validation required:</strong> Please validate at least one email connector before creating mailboxes.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No email mailboxes configured. Add a mailbox to start receiving emails.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {mailboxes.map((mailbox) => (
                <div
                  key={mailbox.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{mailbox.address}</h4>
                      <p className="text-sm text-muted-foreground">
                        {mailbox.allow_new_ticket ? 'Creates new tickets' : 'Existing tickets only'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Active</Badge>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add some bottom padding to ensure scrolling works */}
      <div className="h-20"></div>
    </div>
  )
}
