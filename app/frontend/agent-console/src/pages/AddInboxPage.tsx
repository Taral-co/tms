import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Server, Forward, AlertTriangle, Copy, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react'
import { apiClient } from '../lib/api'

// Temporary simplified UI components since @tms/shared may have build issues
const Button = ({ children, variant = 'default', size = 'default', className = '', disabled = false, ...props }: any) => (
  <button 
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors             <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">{isEditing ? 'Ready to Update' : 'Ready to Create'}</h4>
            <p className="text-green-800 dark:text-green-200">
              Your email connector is configured and ready to be {isEditing ? 'updated' : 'created'}. {!isEditing && 'After creation, we\'ll send a validation email to verify email ownership.'}
            </p>s-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
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

const Input = ({ className = '', ...props }: any) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
)

const Card = ({ children, className = '' }: any) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
)

const CardContent = ({ children, className = '' }: any) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
)

export function AddInboxPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditing = !!editId
  
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdConnectorId, setCreatedConnectorId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'email_forwarder' as 'email_forwarder' | 'inbound_imap',
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: ''
  })

  // Load connector data for editing
  useEffect(() => {
    if (editId) {
      setLoading(true)
      apiClient.getEmailConnector(editId)
        .then(connector => {
          setFormData({
            name: connector.name,
            type: connector.type === 'outbound_smtp' ? 'email_forwarder' : connector.type,
            imap_host: connector.imap_host || '',
            imap_port: connector.imap_port || 993,
            imap_username: connector.imap_username || '',
            imap_password: '', // Don't populate password for security
            smtp_host: connector.smtp_host || '',
            smtp_port: connector.smtp_port || 587,
            smtp_username: connector.smtp_username || '',
            smtp_password: '' // Don't populate password for security
          })
          setCreatedConnectorId(connector.id)
          // If connector is already validated, skip to last step
          if (connector.is_validated && connector.validation_status === 'validated') {
            setCurrentStep(5)
          }
        })
        .catch(error => {
          console.error('Failed to load connector:', error)
          alert('Failed to load connector data')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [editId])

  const steps = [
    { number: 1, title: 'Email Configuration', description: 'Basic email settings' },
    { number: 2, title: 'SMTP Configuration', description: 'Outbound email settings' },
    { number: 3, title: 'Connection Method', description: 'Choose how to receive emails' },
    { number: 4, title: 'Setup Instructions', description: 'Configure email forwarding' },
    { number: 5, title: 'Domain Validation', description: 'Verify domain ownership' }
  ]

  const getForwardingAddress = () => {
    const projId = localStorage.getItem('project_id')
    return `${projId}@taral.co`
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert email_forwarder to outbound_smtp for API compatibility
      const apiData = {
        ...formData,
        type: (formData.type === 'email_forwarder' ? 'outbound_smtp' : formData.type) as 'inbound_imap' | 'outbound_smtp'
      }
      
      let response
      if (editId) {
        // Update existing connector
        response = await apiClient.updateEmailConnector(editId, apiData)
      } else {
        // Create new connector
        response = await apiClient.createEmailConnector(apiData)
      }
      
      setCreatedConnectorId(response.id)
      handleNext() // Move to validation step
    } catch (error) {
      console.error('Failed to save connector:', error)
      alert('Failed to save connector')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!createdConnectorId) return
    
    setSaving(true)
    try {
      await apiClient.validateEmailConnector(createdConnectorId, {
        email: formData.smtp_username
      })
      alert('Validation email sent! Please check your inbox and follow the verification steps.')
      navigate('/inbox')
    } catch (error) {
      console.error('Failed to validate connector:', error)
      alert('Failed to send validation email')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/inbox')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            currentStep === step.number
              ? 'bg-primary text-primary-foreground border-primary'
              : currentStep > step.number
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-background text-muted-foreground border-muted'
          }`}>
            {currentStep > step.number ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              step.number
            )}
          </div>
          <div className="ml-2 hidden sm:block">
            <p className={`text-sm font-medium ${
              currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.title}
            </p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-px mx-4 ${
              currentStep > step.number ? 'bg-green-500' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6 py-5">
      <div>
        <h3 className="text-lg font-medium mb-4">Basic Email Configuration</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set up your email connector with basic information. This will be used to identify and configure your email integration.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Connector Name</label>
          <Input
            value={formData.name}
            onChange={(e: any) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Support Email, Customer Service"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Give your email connector a descriptive name for easy identification.
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} disabled={!formData.name}>
          Next: SMTP Configuration
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6 py-5">
      <div>
        <h3 className="text-lg font-medium mb-4">SMTP Configuration</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure SMTP settings to send emails from your application. This is required for all email connectors.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">SMTP Host</label>
          <Input
            value={formData.smtp_host}
            onChange={(e: any) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
            placeholder="smtp.gmail.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">SMTP Port</label>
          <Input
            type="number"
            value={formData.smtp_port}
            onChange={(e: any) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
            placeholder="587"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">SMTP Username</label>
          <Input
            value={formData.smtp_username}
            onChange={(e: any) => setFormData(prev => ({ ...prev, smtp_username: e.target.value }))}
            placeholder="support@yourcompany.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">SMTP Password</label>
          <Input
            type="password"
            value={formData.smtp_password}
            onChange={(e: any) => setFormData(prev => ({ ...prev, smtp_password: e.target.value }))}
            placeholder="App password or OAuth token"
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Common SMTP Settings</h4>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div><strong>Gmail:</strong> smtp.gmail.com:587 (Use App Password, not regular password)</div>
          <div><strong>Outlook:</strong> smtp-mail.outlook.com:587</div>
          <div><strong>Yahoo:</strong> smtp.mail.yahoo.com:587</div>
          <div><strong>Custom Domain:</strong> Check with your email provider</div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePrevious}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext} disabled={!formData.smtp_host || !formData.smtp_username || !formData.smtp_password}>
          Next: Connection Method
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6 py-5">
      <div>
        <h3 className="text-lg font-medium mb-4">Choose Connection Method</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Select how you want to receive incoming emails. We recommend Email Forwarding for better performance and reliability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Forwarding Option */}
        <div 
          className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
            formData.type === 'email_forwarder' 
              ? 'border-green-500 bg-green-50 dark:bg-green-950' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFormData(prev => ({ ...prev, type: 'email_forwarder' }))}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mt-1">
              <Forward className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900 dark:text-green-100">Email Forwarding</h4>
              <p className="text-sm text-green-700 dark:text-green-300 mb-3">Recommended</p>
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                <li>• Fast and automatic</li>
                <li>• Real-time processing</li>
                <li>• No manual checking</li>
                <li>• Works with any email provider</li>
                <li>• Better reliability</li>
              </ul>
            </div>
          </div>
        </div>

        {/* IMAP Option */}
        <div 
          className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
            formData.type === 'inbound_imap' 
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => setFormData(prev => ({ ...prev, type: 'inbound_imap' }))}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mt-1">
              <Server className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-orange-900 dark:text-orange-100">IMAP Connection</h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">Manual setup required</p>
              <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                <li>• Slower processing</li>
                <li>• Periodic checking</li>
                <li>• Requires email credentials</li>
                <li>• More complex setup</li>
                <li>• Provider limitations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {formData.type === 'inbound_imap' && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100">IMAP Setup Required</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                If you choose IMAP, you'll need to provide additional credentials in the next step. 
                Email forwarding is recommended for better performance and security.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePrevious}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext}>
          {formData.type === 'email_forwarder' ? 'Next: Setup Instructions' : 'Next: IMAP Configuration'}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderStep4 = () => {
    if (formData.type === 'inbound_imap') {
      return (
        <div className="space-y-6 py-5">
          <div>
            <h3 className="text-lg font-medium mb-4">IMAP Configuration</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Configure IMAP settings to read emails from your mailbox.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">IMAP Host</label>
              <Input
                value={formData.imap_host}
                onChange={(e: any) => setFormData(prev => ({ ...prev, imap_host: e.target.value }))}
                placeholder="imap.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">IMAP Port</label>
              <Input
                type="number"
                value={formData.imap_port}
                onChange={(e: any) => setFormData(prev => ({ ...prev, imap_port: parseInt(e.target.value) }))}
                placeholder="993"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">IMAP Username</label>
              <Input
                value={formData.imap_username}
                onChange={(e: any) => setFormData(prev => ({ ...prev, imap_username: e.target.value }))}
                placeholder="support@yourcompany.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">IMAP Password</label>
              <Input
                type="password"
                value={formData.imap_password}
                onChange={(e: any) => setFormData(prev => ({ ...prev, imap_password: e.target.value }))}
                placeholder="App password or OAuth token"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Common IMAP Settings</h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <div><strong>Gmail:</strong> imap.gmail.com:993 (SSL)</div>
              <div><strong>Outlook:</strong> outlook.office365.com:993 (SSL)</div>
              <div><strong>Yahoo:</strong> imap.mail.yahoo.com:993 (SSL)</div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button onClick={handleNext} disabled={!formData.imap_host || !formData.imap_username || !formData.imap_password}>
              Next: Domain Validation
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )
    }

    // Email forwarding setup instructions
    return (
      <div className="space-y-6 py-5">
        <div>
          <h3 className="text-lg font-medium mb-4">Email Forwarding Setup</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Follow these steps to forward your emails to our system for automatic ticket creation.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-4">Your Forwarding Address</h4>
          <div className="flex items-center gap-2 bg-white dark:bg-blue-900 p-3 rounded border">
            <code className="flex-1 text-blue-900 dark:text-blue-100">{getForwardingAddress()}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(getForwardingAddress())}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
            Forward all emails from {formData.smtp_username} to this address.
          </p>
        </div>
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handlePrevious}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext}>
            Next: Domain Validation
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <hr className="my-4 border-t border-blue-200 dark:border-blue-700" />
        

        <div className="space-y-4">
          <h4 className="font-medium">Setup Instructions by Provider:</h4>
          
          {/* Gmail Instructions */}
          <div className="border rounded-lg p-4">
            <h5 className="font-medium flex items-center gap-2 mb-3">
              Gmail Setup
              <ExternalLink className="w-4 h-4" />
            </h5>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Go to Gmail Settings → Forwarding and POP/IMAP</li>
              <li>Click "Add a forwarding address"</li>
              <li>Enter: <code className="bg-muted px-1 rounded">{getForwardingAddress()}</code></li>
              <li>Choose "Forward a copy of incoming mail to" and select the address</li>
              <li>Choose what to do with Gmail's copy (keep, archive, or delete)</li>
              <li>Save changes</li>
            </ol>
          </div>

          {/* Outlook Instructions */}
          <div className="border rounded-lg p-4">
            <h5 className="font-medium flex items-center gap-2 mb-3">
              Outlook Setup
              <ExternalLink className="w-4 h-4" />
            </h5>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Go to Outlook Settings → Mail → Forwarding</li>
              <li>Check "Enable forwarding"</li>
              <li>Enter forwarding address: <code className="bg-muted px-1 rounded">{getForwardingAddress()}</code></li>
              <li>Choose whether to keep a copy in Outlook</li>
              <li>Save settings</li>
            </ol>
          </div>

          {/* Custom Domain Instructions */}
          <div className="border rounded-lg p-4">
            <h5 className="font-medium flex items-center gap-2 mb-3">
              Custom Domain Setup
              <ExternalLink className="w-4 h-4" />
            </h5>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Access your domain's email management panel</li>
              <li>Look for "Email Forwarding" or "Mail Forwarding" settings</li>
              <li>Create a forwarding rule for {formData.smtp_username}</li>
              <li>Set destination to: <code className="bg-muted px-1 rounded">{getForwardingAddress()}</code></li>
              <li>Save and test the forwarding rule</li>
            </ol>
          </div>
        </div>

        
      </div>
    )
  }

  const renderStep5 = () => (
    <div className="space-y-6 py-5">
      <div>
        <h3 className="text-lg font-medium mb-4">Domain Validation</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {isEditing ? 'Update your email connector settings and re-validate if needed.' : 'Create your email connector and validate email ownership to ensure secure email handling.'}
        </p>
      </div>

      {!createdConnectorId ? (
        <>
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Ready to Create</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your email connector is configured and ready to be created. After creation, we'll send a validation email to verify email ownership.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-3">Configuration Summary</h4>
            <div className="space-y-2 text-sm">
              <div><strong>Name:</strong> {formData.name}</div>
              <div><strong>Type:</strong> {formData.type === 'email_forwarder' ? 'Email Forwarding' : 'IMAP Connection'}</div>
              <div><strong>SMTP Username:</strong> {formData.smtp_username}</div>
              <div><strong>SMTP:</strong> {formData.smtp_host}:{formData.smtp_port}</div>
              {formData.type === 'inbound_imap' && (
                <div><strong>IMAP:</strong> {formData.imap_host}:{formData.imap_port}</div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Email Connector' : 'Create Email Connector')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium mb-2">Email Connector Created!</h3>
            <p className="text-muted-foreground mb-6">
              Your email connector has been created successfully. Now let's validate your email ownership.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Domain Validation</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              We'll send a validation email to <strong>{formData.smtp_username}</strong> with instructions to verify email ownership.
            </p>
            <Button onClick={handleValidate} disabled={saving} className="w-full">
              {saving ? 'Sending Validation Email...' : 'Send Validation Email'}
            </Button>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack}>
              Skip for Now
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inbox
        </Button>
        <h1 className="text-3xl font-bold">{isEditing ? 'Edit Email Connector' : 'Add Email Connector'}</h1>
        <p className="text-muted-foreground">
          Follow these steps to connect your email account and start receiving customer emails as tickets
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">Loading connector data...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          <Card>
            <CardContent className="p-8">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
