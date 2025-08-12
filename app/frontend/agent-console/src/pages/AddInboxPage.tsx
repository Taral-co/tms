import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle, Clock } from 'lucide-react'
import { apiClient } from '../lib/api'

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

export function AddInboxPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'config' | 'validate' | 'verify'>('config')
  const [saving, setSaving] = useState(false)
  const [createdConnectorId, setCreatedConnectorId] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'inbound_imap' as 'inbound_imap' | 'outbound_smtp',
    from_address: '',
    reply_to_address: '',
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: ''
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await apiClient.createEmailConnector(formData)
      setCreatedConnectorId(response.id)
      setStep('validate')
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
        email: formData.reply_to_address
      })
      setStep('verify')
    } catch (error) {
      console.error('Failed to validate connector:', error)
      alert('Failed to send validation email')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!createdConnectorId) return
    
    setSaving(true)
    try {
      await apiClient.verifyEmailConnectorOTP(createdConnectorId, {
        email: formData.reply_to_address,
        otp
      })
      alert('Email connector validated successfully!')
      navigate('/inbox')
    } catch (error) {
      console.error('Failed to verify OTP:', error)
      alert('Invalid OTP. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/inbox')
  }

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inbox
        </Button>
        <h1 className="text-3xl font-bold">Add Email Connector</h1>
        <p className="text-muted-foreground">
          Connect your email account to start receiving and managing customer emails as tickets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 'config' && 'Email Configuration'}
            {step === 'validate' && 'Validate Domain'}
            {step === 'verify' && 'Verify Domain'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'config' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Gmail Connector"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.type}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="inbound_imap">Inbound IMAP</option>
                    <option value="outbound_smtp">Outbound SMTP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From Address</label>
                  <Input
                    type="email"
                    value={formData.from_address}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, from_address: e.target.value }))}
                    placeholder="support@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Reply-To Address</label>
                  <Input
                    type="email"
                    value={formData.reply_to_address}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, reply_to_address: e.target.value }))}
                    placeholder="support@company.com"
                  />
                </div>
              </div>

              {formData.type === 'inbound_imap' && (
                <>
                  <h3 className="font-medium text-lg">IMAP Configuration</h3>
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
                        placeholder="support@company.com"
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
                </>
              )}

              <h3 className="font-medium text-lg">SMTP Configuration</h3>
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
                    placeholder="support@company.com"
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

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Connector'}
                </Button>
              </div>
            </div>
          )}

          {step === 'validate' && (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-medium mb-2">Validate Email Domain</h3>
              <p className="text-muted-foreground mb-4">
                Click the button below to send a validation email to {formData.reply_to_address}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleBack}>
                  Skip for Now
                </Button>
                <Button onClick={handleValidate} disabled={saving}>
                  {saving ? 'Sending...' : 'Send Validation Email'}
                </Button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">Check Your Email</h3>
              <p className="text-muted-foreground mb-4">
                We've sent a 6-digit code to {formData.reply_to_address}. Enter it below to complete validation.
              </p>
              <div className="max-w-xs mx-auto space-y-4">
                <Input
                  value={otp}
                  onChange={(e: any) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-lg"
                />
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={handleBack}>
                    Skip for Now
                  </Button>
                  <Button onClick={handleVerifyOTP} disabled={saving || otp.length !== 6}>
                    {saving ? 'Verifying...' : 'Verify Code'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
