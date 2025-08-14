import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  ArrowLeft,
  Trash2,
  Inbox,
  ExternalLink,
  Folder
} from 'lucide-react'
import { apiClient, EmailMailbox, EmailConnector, Project as ProjectType } from '../lib/api'

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

const Badge = ({ children, variant = 'default', className = '', ...props }: any) => (
  <span 
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
      variant === 'destructive' ? 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80' :
      variant === 'warning' ? 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
      variant === 'success' ? 'border-transparent bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
      variant === 'secondary' ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80' :
      variant === 'outline' ? 'text-foreground' :
      'border-transparent bg-primary text-primary-foreground hover:bg-primary/80'
    } ${className}`}
    {...props}
  >
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

const Input = ({ className = '', ...props }: any) => (
  <input 
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

const Select = ({ children, value, onValueChange, placeholder, ...props }: any) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

const Modal = ({ open, onClose, children }: any) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg p-6 w-full max-w-md mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export function EmailMailboxesPage() {
  const navigate = useNavigate()
  const [mailboxes, setMailboxes] = useState<EmailMailbox[]>([])
  const [connectors, setConnectors] = useState<EmailConnector[]>([])
  const [loading, setLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMailbox, setSelectedMailbox] = useState<EmailMailbox | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    address: '',
    display_name: '',
    inbound_connector_id: '',
    default_project_id: '',
    allow_new_ticket: true,
    routing_rules: [] as { match: string; project_id: string }[]
  })
  const [formLoading, setFormLoading] = useState(false)
  
  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mailboxesResponse, connectorsResponse] = await Promise.all([
        apiClient.getEmailMailboxes(),
        apiClient.getEmailConnectors()
      ])
      
      setMailboxes(mailboxesResponse.mailboxes || [])
      setConnectors(connectorsResponse.connectors || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      address: '',
      display_name: '',
      inbound_connector_id: '',
      default_project_id: '',
      allow_new_ticket: true,
      routing_rules: []
    })
  }

  const handleCreateMailbox = () => {
    navigate('/inbox/mailboxes/create')
  }

  const handleEditMailbox = (mailbox: EmailMailbox) => {
    setFormData({
      address: mailbox.address,
      display_name: mailbox.display_name || '',
      inbound_connector_id: mailbox.inbound_connector_id,
      default_project_id: mailbox.default_project_id,
      allow_new_ticket: mailbox.allow_new_ticket,
      routing_rules: mailbox.routing_rules || []
    })
    setSelectedMailbox(mailbox)
    setShowEditModal(true)
  }

  const handleSubmit = async () => {
    if (!selectedMailbox) return
    
    setFormLoading(true)
    try {
      // Update existing mailbox - fix routing_rules type
      const updateData = {
        ...formData,
        routing_rules: formData.routing_rules || []  // Keep existing or use empty array
      }
      await apiClient.updateEmailMailbox(selectedMailbox.id, updateData)
      setShowEditModal(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Failed to update mailbox:', error)
      alert('Failed to update mailbox')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteMailbox = async (mailbox: EmailMailbox) => {
    if (!confirm(`Are you sure you want to delete the mailbox "${mailbox.address}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteEmailMailbox(mailbox.id)
      loadData()
    } catch (error) {
      console.error('Failed to delete mailbox:', error)
      alert('Failed to delete mailbox')
    }
  }

  const getConnectorName = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId)
    return connector?.name || 'Unknown Connector'
  }

  const inboundConnectors = connectors.filter(c => c.type === 'inbound_imap')

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading email mailboxes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-h-screen p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/inbox/connectors')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Connectors
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-bold">Email Mailboxes</h1>
          <p className="text-muted-foreground">
            Manage email addresses and their routing configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateMailbox}>
            <Plus className="w-4 h-4 mr-2" />
            Add Mailbox
          </Button>
        </div>
      </div>

      {/* Mailboxes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            All Email Mailboxes ({mailboxes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mailboxes.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Email Mailboxes</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email mailbox to start routing incoming emails to projects.
              </p>
              <Button onClick={handleCreateMailbox}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Mailbox
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {mailboxes.map((mailbox) => (
                <div
                  key={mailbox.id}
                  className="p-6 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold">
                            {mailbox.display_name || mailbox.address}
                          </h4>
                          {mailbox.display_name && (
                            <span className="text-sm text-muted-foreground">
                              &lt;{mailbox.address}&gt;
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Connector: {getConnectorName(mailbox.inbound_connector_id)}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Folder className="w-4 h-4" />
                            Default:
                          </span>
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-4 h-4" />
                            <a 
                              href={`mailto:${mailbox.address}${mailbox.display_name ? `?subject=Email to ${mailbox.display_name}` : ''}`}
                              className="text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Send Email
                            </a>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={mailbox.allow_new_ticket ? 'success' : 'secondary'}>
                            {mailbox.allow_new_ticket ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                New Tickets Allowed
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                New Tickets Disabled
                              </>
                            )}
                          </Badge>
                          {mailbox.routing_rules && Object.keys(mailbox.routing_rules).length > 0 && (
                            <Badge variant="outline">
                              Has Routing Rules
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMailbox(mailbox)}
                        title="Edit mailbox"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMailbox(mailbox)}
                        title="Delete mailbox"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Additional details */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <div>{new Date(mailbox.created_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <div>{new Date(mailbox.updated_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Routing Rules:</span>
                        <div>{mailbox.routing_rules && Object.keys(mailbox.routing_rules).length > 0 ? 'Configured' : 'None'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Mailbox Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <h2 className="text-xl font-semibold mb-4">Edit Email Mailbox</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Update the configuration for "{selectedMailbox?.address}".
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-address">Email Address</Label>
            <Input
              id="edit-address"
              type="email"
              value={formData.address}
              onChange={(e: any) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="support@yourcompany.com"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-display-name">Display Name</Label>
            <Input
              id="edit-display-name"
              type="text"
              value={formData.display_name}
              onChange={(e: any) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Support Team"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-connector">Inbound Connector</Label>
            <Select
              value={formData.inbound_connector_id}
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, inbound_connector_id: value }))}
              placeholder="Select a connector"
            >
              {inboundConnectors.map(connector => (
                <option key={connector.id} value={connector.id}>
                  {connector.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.allow_new_ticket}
              onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, allow_new_ticket: checked }))}
            />
            <Label>Allow creating new tickets from emails</Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={formLoading || !formData.address || !formData.inbound_connector_id || !formData.default_project_id}
            >
              {formLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
