import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Save,
  RefreshCw,
  Mail,
  Settings,
  Folder,
  AlertCircle
} from 'lucide-react'
import { apiClient, EmailConnector } from '../lib/api'

// UI Components (same as other pages for consistency)
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

const Input = ({ className = '', ...props }: any) => (
  <input 
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

const Select = ({ children, value, onValueChange, placeholder, className = '', ...props }: any) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
)

const Label = ({ children, className = '', ...props }: any) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
    {children}
  </label>
)

const Switch = ({ checked, onCheckedChange, className = '', ...props }: any) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange?.(!checked)}
    className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'bg-primary' : 'bg-input'
    } ${className}`}
    {...props}
  >
    <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
      checked ? 'translate-x-5' : 'translate-x-0'
    }`} />
  </button>
)

const Alert = ({ children, variant = 'default', className = '' }: any) => (
  <div className={`relative w-full rounded-lg border p-4 ${
    variant === 'destructive' ? 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive' :
    'border-border'
  } ${className}`}>
    {children}
  </div>
)

export function CreateEmailMailboxPage() {
  const navigate = useNavigate()
  const [connectors, setConnectors] = useState<EmailConnector[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Form state
  const [formData, setFormData] = useState({
    address: '',
    display_name: '',
    inbound_connector_id: '',
    allow_new_ticket: true,
    routing_rules: [] as { match: string; project_id: string }[]
  })

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const connectorsResponse = await apiClient.getEmailConnectors()
      setConnectors(connectorsResponse.connectors || [])
    } catch (error) {
      console.error('Failed to load connectors:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.address.trim()) {
      newErrors.address = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.address)) {
      newErrors.address = 'Please enter a valid email address'
    }
    
    if (!formData.inbound_connector_id) {
      newErrors.inbound_connector_id = 'Please select an inbound connector'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setSaving(true)
    try {
      // Create mailbox data - use current project ID (would be handled by global context)
      // For now, we'll use a placeholder that the backend should handle
      const createData = {
        ...formData,
        routing_rules: []  // Convert empty object to empty array
      }
      await apiClient.createEmailMailbox(createData)
      navigate('/inbox/mailboxes')
    } catch (error) {
      console.error('Failed to create mailbox:', error)
      alert('Failed to create mailbox. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inboundConnectors = connectors.filter(c => c.type === 'inbound_imap')

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-h-screen p-6 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/inbox/mailboxes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mailboxes
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create Email Mailbox</h1>
          <p className="text-muted-foreground">
            Set up a new email address to route incoming emails
          </p>
        </div>
        <div className="w-[140px]"></div> {/* Spacer to balance the layout */}
      </div>

      {/* Prerequisites Check */}
      {inboundConnectors.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <h4 className="font-semibold">No Inbound Connectors Available</h4>
            <p className="text-sm mt-1">
              You need to create and validate at least one inbound email connector before creating mailboxes.{' '}
              <button 
                onClick={() => navigate('/inbox/add')}
                className="underline hover:no-underline"
              >
                Create a connector now
              </button>
            </p>
          </div>
        </Alert>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-4 h-4" />
              Mailbox Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Email Address *</Label>
                <Input
                  id="address"
                  type="email"
                  value={formData.address}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="support@yourcompany.com"
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The email address that customers will send emails to
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Support Team"
                  className={errors.display_name ? 'border-red-500' : ''}
                />
                {errors.display_name && (
                  <p className="text-sm text-red-500">{errors.display_name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The friendly name that appears in outgoing emails (e.g., "Support Team" &lt;support@yourcompany.com&gt;)
                </p>
              </div>

              {/* Inbound Connector */}
              <div className="space-y-2">
                <Label htmlFor="connector">Inbound Connector *</Label>
                <Select
                  id="connector"
                  value={formData.inbound_connector_id}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, inbound_connector_id: value }))}
                  placeholder="Select a connector"
                  className={errors.inbound_connector_id ? 'border-red-500' : ''}
                >
                  {inboundConnectors.map(connector => (
                    <option key={connector.id} value={connector.id}>
                      {connector.name}
                    </option>
                  ))}
                </Select>
                {errors.inbound_connector_id && (
                  <p className="text-sm text-red-500">{errors.inbound_connector_id}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The email connector that will fetch emails for this address
                </p>
              </div>

              {/* Allow New Tickets */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={formData.allow_new_ticket}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, allow_new_ticket: checked }))}
                    className="mt-1"
                  />
                  <div>
                    <Label>Allow creating new tickets from emails</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, new emails will create new tickets. When disabled, only replies to existing tickets are processed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/inbox/mailboxes')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || inboundConnectors.length === 0}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Mailbox
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column - Help Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-4 h-4" />
              How Email Routing Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Processing
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Emails sent to this address will be fetched by the connector</li>
                  <li>• New emails create tickets in the current project</li>
                  <li>• Replies are automatically threaded to existing tickets</li>
                  <li>• Email attachments are preserved and accessible</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Project Routing
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All new tickets go to your current active project</li>
                  <li>• Different email addresses can be created for different purposes</li>
                  <li>• You can switch projects to change where new tickets are created</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Important Notes
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Make sure your email server can receive emails at this address</li>
                  <li>• The connector must be validated before emails can be processed</li>
                  <li>• Test the setup by sending a test email after creation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
