import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  RefreshCw, 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Mail, 
  ArrowLeft,
  Trash2,
  TestTube
} from 'lucide-react'
import { apiClient, EmailConnector } from '../lib/api'

// UI Components (same as InboxPage for consistency)
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

const Badge = ({ children, variant = 'default', className = '', onClick, ...props }: any) => (
  <span 
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
      variant === 'destructive' ? 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80' :
      variant === 'warning' ? 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
      variant === 'success' ? 'border-transparent bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
      variant === 'secondary' ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80' :
      variant === 'outline' ? 'text-foreground' :
      'border-transparent bg-primary text-primary-foreground hover:bg-primary/80'
    } ${className}`}
    onClick={onClick}
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

const Modal = ({ open, onClose, children }: any) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        {children}
      </div>
    </div>
  )
}

export function EmailConnectorsPage() {
  const navigate = useNavigate()
  const [connectors, setConnectors] = useState<EmailConnector[]>([])
  const [loading, setLoading] = useState(false)
  const [showValidateModal, setShowValidateModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<EmailConnector | null>(null)
  const [validationEmail, setValidationEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [validationLoading, setValidationLoading] = useState(false)
  
  // Load connectors on mount
  useEffect(() => {
    loadConnectors()
  }, [])

  const loadConnectors = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getEmailConnectors()
      setConnectors(response.connectors || [])
    } catch (error) {
      console.error('Failed to load email connectors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidateConnector = (connector: EmailConnector) => {
    setSelectedConnector(connector)
    setValidationEmail(connector.from_address || '')
    setShowValidateModal(true)
  }

  const handleStartValidation = async () => {
    if (!selectedConnector || !validationEmail) return
    
    setValidationLoading(true)
    try {
      const response = await apiClient.validateEmailConnector(selectedConnector.id, { 
        email: validationEmail 
      })
      console.log('Validation started:', response)
      setShowValidateModal(false)
      setShowVerifyModal(true)
      loadConnectors()
    } catch (error) {
      console.error('Failed to start validation:', error)
      alert('Failed to start validation')
    } finally {
      setValidationLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!selectedConnector || !otpCode || !validationEmail) return
    
    setValidationLoading(true)
    try {
      const response = await apiClient.verifyEmailConnectorOTP(selectedConnector.id, {
        email: validationEmail,
        otp: otpCode
      })
      console.log('OTP verified:', response)
      setShowVerifyModal(false)
      setOtpCode('')
      loadConnectors()
      alert('Email connector validated successfully!')
    } catch (error) {
      console.error('Failed to verify OTP:', error)
      alert('Failed to verify OTP. Please check the code and try again.')
    } finally {
      setValidationLoading(false)
    }
  }

  const handleTestConnector = async (_connector: EmailConnector) => {
    // TODO: Implement test connector functionality
    alert('Test connector functionality will be implemented')
  }

  const handleDeleteConnector = async (connector: EmailConnector) => {
    if (!confirm(`Are you sure you want to delete the "${connector.name}" connector? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteEmailConnector(connector.id)
      alert('Connector deleted successfully')
      loadConnectors()
    } catch (error) {
      console.error('Failed to delete connector:', error)
      alert('Failed to delete connector')
    }
  }

  const getValidationStatusBadge = (connector: EmailConnector) => {
    const handleClick = () => {
      if (connector.validation_status === 'pending' || connector.validation_status === 'failed') {
        handleValidateConnector(connector)
      }
    }

    const isClickable = connector.validation_status === 'pending' || connector.validation_status === 'failed'

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
        return <Badge 
          variant="destructive" 
          className={`flex items-center gap-1 ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={isClickable ? handleClick : undefined}
        >
          <AlertCircle className="w-3 h-3" />
          Failed - Click to Retry
        </Badge>
      default:
        return <Badge 
          variant="outline" 
          className={`flex items-center gap-1 ${isClickable ? 'cursor-pointer hover:bg-muted' : ''}`}
          onClick={isClickable ? handleClick : undefined}
        >
          <Clock className="w-3 h-3" />
          Click to Validate
        </Badge>
    }
  }

  const getConnectorTypeDisplay = (type: string) => {
    switch (type) {
      case 'inbound_imap':
        return 'Inbound IMAP'
      case 'outbound_smtp':
        return 'Outbound SMTP'
      case 'outbound_provider':
        return 'Outbound Provider'
      default:
        return type.replace('_', ' ').toUpperCase()
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading email connectors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-h-screen p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/inbox')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Email Connectors</h1>
            <p className="text-muted-foreground">
              Manage email connectors and their validation status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadConnectors} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/inbox/add')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Connector
          </Button>
        </div>
      </div>

      {/* Connectors List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            All Email Connectors ({connectors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectors.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Email Connectors</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email connector to start managing email communications.
              </p>
              <Button onClick={() => navigate('/inbox/add')}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Connector
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connectors.map((connector) => (
                <div
                  key={connector.id}
                  className="p-6 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-semibold">{connector.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getConnectorTypeDisplay(connector.type)}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          {connector.from_address && (
                            <span>From: {connector.from_address}</span>
                          )}
                          {connector.smtp_host && (
                            <span>SMTP: {connector.smtp_host}:{connector.smtp_port}</span>
                          )}
                          {connector.imap_host && (
                            <span>IMAP: {connector.imap_host}:{connector.imap_port}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getValidationStatusBadge(connector)}
                          <Badge variant="success">Active</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnector(connector)}
                        title="Test connection"
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/inbox/add?edit=${connector.id}`)}
                        title="Edit connector"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteConnector(connector)}
                        title="Delete connector"
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
                        <div>{new Date(connector.created_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Updated:</span>
                        <div>{new Date(connector.updated_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Validated:</span>
                        <div>{connector.is_validated ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Modal */}
      <Modal open={showValidateModal} onClose={() => setShowValidateModal(false)}>
        <h2 className="text-xl font-semibold mb-4">Validate Email Domain</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We'll send a verification code to validate your email ownership for "{selectedConnector?.name}".
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              value={validationEmail}
              onChange={(e: any) => setValidationEmail(e.target.value)}
              placeholder="Enter email address"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowValidateModal(false)}
              disabled={validationLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStartValidation}
              disabled={validationLoading || !validationEmail}
            >
              {validationLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal open={showVerifyModal} onClose={() => setShowVerifyModal(false)}>
        <h2 className="text-xl font-semibold mb-4">Enter Verification Code</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please enter the 6-digit verification code sent to your email address.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              type="text"
              value={otpCode}
              onChange={(e: any) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowVerifyModal(false)}
              disabled={validationLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyOTP}
              disabled={validationLoading || !otpCode || otpCode.length !== 6}
            >
              {validationLoading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
