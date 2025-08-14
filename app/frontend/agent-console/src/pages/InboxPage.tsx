import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, TicketCheck, Plus, Settings, CheckCircle, AlertCircle, Clock, Mail, List, Inbox } from 'lucide-react'
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

// Input component
const Input = ({ className = '', ...props }: any) => (
  <input 
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

// Modal component
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

export function InboxPage() {
  const navigate = useNavigate()
  const [connectors, setConnectors] = useState<EmailConnector[]>([])
  const [mailboxes, setMailboxes] = useState<EmailMailbox[]>([])
  const [loading, setLoading] = useState(false)
  const [showValidateModal, setShowValidateModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedConnector, setSelectedConnector] = useState<EmailConnector | null>(null)
  const [validationEmail, setValidationEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [validationLoading, setValidationLoading] = useState(false)
  
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

  const handleListConnectors = () => {
    navigate('/inbox/connectors')
  }

  const handleListMailboxes = () => {
    navigate('/inbox/mailboxes')
  }

  const handleValidateConnector = (connector: EmailConnector) => {
    setSelectedConnector(connector)
    setValidationEmail(connector.smtp_username || '')
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
      // Refresh data to show updated status
      loadData()
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
      // Refresh data to show updated status
      loadData()
      alert('Email connector validated successfully!')
    } catch (error) {
      console.error('Failed to verify OTP:', error)
      alert('Failed to verify OTP. Please check the code and try again.')
    } finally {
      setValidationLoading(false)
    }
  }

  const handleEditConnector = (connector: EmailConnector) => {
    navigate(`/inbox/add?edit=${connector.id}`)
  }

  const handleCreateMailbox = () => {
    const validatedConnectors = connectors.filter(c => c.is_validated && c.validation_status === 'validated')
    if (validatedConnectors.length === 0) {
      alert('Please add and validate at least one email connector first. Domain validation is required before creating email inboxes.')
      return
    }
    navigate('/inbox/mailboxes')
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
          Validation Failed - Click to Retry
        </Badge>
      default:
        return <Badge 
          variant="outline" 
          className={`flex items-center gap-1 ${isClickable ? 'cursor-pointer hover:bg-muted' : ''}`}
          onClick={isClickable ? handleClick : undefined}
        >
          <Clock className="w-3 h-3" />
          Click to Validate Domain
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

  // Show empty state if no connectors or mailboxes
  if (connectors.length === 0 || mailboxes.length === 0) {
    const hasConnectors = connectors.length > 0
    const hasValidatedConnectors = connectors.some(c => c.is_validated && c.validation_status === 'validated')
    
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-lg">
          <Mail className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-4">Setup Email Integration</h2>
          <p className="text-muted-foreground mb-8">
            Follow these steps to start receiving and managing customer emails as tickets.
          </p>
          
          {/* Step-by-step setup */}
          <div className="space-y-6 text-left">
            {/* Step 1: Attach Email Connector */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-card">
              <div className="flex-shrink-0 mt-1">
                {hasValidatedConnectors ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  Attach Email Connector
                  {hasValidatedConnectors && <Badge variant="success" className="text-xs">Completed</Badge>}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect your email account (Gmail, Outlook, etc.) and validate domain ownership to enable email processing.
                </p>
                {!hasValidatedConnectors && (
                  <Button 
                    onClick={handleCreateConnector} 
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    {hasConnectors ? 'Validate Connector' : 'Attach Email Connector'}
                  </Button>
                )}
                {hasConnectors && !hasValidatedConnectors && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    You have connectors but they need validation. <a href="" onClick={handleListConnectors} className="underline">Click here to validate them.</a>
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Add Email Mailbox */}
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-card">
              <div className="flex-shrink-0 mt-1">
                {mailboxes.length > 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                    hasValidatedConnectors ? 'border-primary text-primary' : 'border-muted-foreground text-muted-foreground'
                  }`}>
                    2
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  Add Email Mailbox
                  {mailboxes.length > 0 && <Badge variant="success" className="text-xs">Completed</Badge>}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create specific email addresses (like support@yourcompany.com) that will automatically convert incoming emails to tickets.
                </p>
                {hasValidatedConnectors && mailboxes.length === 0 && (
                  <Button 
                    onClick={handleCreateMailbox}
                    className="flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Email Mailbox
                  </Button>
                )}
                {!hasValidatedConnectors && (
                  <p className="text-xs text-muted-foreground">
                    Complete Step 1 first to enable this step
                  </p>
                )}
              </div>
            </div>
          </div>

          {hasValidatedConnectors && mailboxes.length > 0 && (
            <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="w-5 h-5" />
                <p className="font-medium">Email integration is ready!</p>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your email system is now configured and ready to receive customer emails.
              </p>
            </div>
          )}
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
          <Button variant="outline" onClick={handleListConnectors}>
            <List className="w-4 h-4 mr-2" />
            Manage Connectors
          </Button>
          <Button variant="outline" onClick={handleListMailboxes}>
            <Inbox className="w-4 h-4 mr-2" />
            Manage Mailboxes
          </Button>
          {/* <Button onClick={handleCreateConnector}>
            <Plus className="w-4 h-4 mr-2" />
            Add Connector
          </Button> */}
        </div>
      </div>

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
                    <strong> <a href='' onClick={handleListConnectors} className='text-amber-600 dark:text-amber-400 underline'>Domain validation required:</a></strong> Please validate at least one email connector before creating mailboxes.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No email mailboxes configured. <a href='' onClick={handleCreateMailbox} className='text-amber-600 dark:text-amber-400 underline'> Add a mailbox </a> to start managing emails.
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

      {/* Validation Modal */}
      <Modal open={showValidateModal} onClose={() => setShowValidateModal(false)}>
        <h2 className="text-xl font-semibold mb-4">Validate Email Domain</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We'll send a verification code to validate your email ownership.
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
          Please enter the 6-digit verification code sent to your email.
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
