import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Palette, Save, AlertCircle } from 'lucide-react'
import { apiClient } from '../lib/api'
import type { CreateChatWidgetRequest } from '../types/chat'
import type { DomainValidation } from '../lib/api'

export function CreateChatWidgetPage() {
  const navigate = useNavigate()
  const [domains, setDomains] = useState<DomainValidation[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<CreateChatWidgetRequest>({
    name: '',
    domain_id: '',
    welcome_message: 'Hello! How can we help you today?',
    primary_color: '#3b82f6',
    position: 'bottom-right',
    allow_file_uploads: false,
    show_agent_avatars: true,
    require_email: false,
    auto_open_delay: 0
  })

  useEffect(() => {
    loadDomains()
  }, [])

  const loadDomains = async () => {
    try {
      setLoading(true)
      const domainsData = await apiClient.getDomainValidations()
      setDomains(domainsData.filter(d => d.status === 'verified'))
    } catch (err: any) {
      setError(err.message || 'Failed to load domains')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.domain_id) {
      setError('Please select a domain')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
      await apiClient.createChatWidget(formData)
      
      // Navigate back to widgets list with success message
      navigate('/chat/widgets?created=true')
    } catch (err: any) {
      setError(`Failed to create widget: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const updateFormData = (updates: Partial<CreateChatWidgetRequest>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <button
            onClick={() => navigate('/chat/widgets')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat Widgets
          </button>
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Chat Widget</h1>
            <p className="text-sm text-muted-foreground">Configure a new chat widget for your website</p>
          </div>
        </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-destructive">Error occurred</h3>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No domains warning */}
      {domains.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">Domain verification required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                You need to verify at least one domain before creating chat widgets.{' '}
                <a href="/settings" className="underline underline-offset-2 hover:no-underline font-medium">
                  Verify domains in Settings
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {domains.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="widget-name" className="text-sm font-medium text-foreground">
                    Widget Name
                  </label>
                  <input
                    id="widget-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="e.g. Main Website Chat"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="domain-select" className="text-sm font-medium text-foreground">
                    Domain
                  </label>
                  <select
                    id="domain-select"
                    value={formData.domain_id}
                    onChange={(e) => updateFormData({ domain_id: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Select a domain</option>
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.domain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="welcome-message" className="text-sm font-medium text-foreground">
                  Welcome Message
                </label>
                <textarea
                  id="welcome-message"
                  value={formData.welcome_message}
                  onChange={(e) => updateFormData({ welcome_message: e.target.value })}
                  rows={3}
                  placeholder="Enter the greeting message for visitors"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="primary-color" className="text-sm font-medium text-foreground">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={formData.primary_color || '#3b82f6'}
                        onChange={(e) => updateFormData({ primary_color: e.target.value })}
                        className="h-9 w-16 rounded-md border border-input cursor-pointer bg-background"
                        title="Pick a color"
                      />
                    </div>
                    <input
                      id="primary-color"
                      type="text"
                      value={formData.primary_color || '#3b82f6'}
                      onChange={(e) => updateFormData({ primary_color: e.target.value })}
                      placeholder="#3b82f6"
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="position" className="text-sm font-medium text-foreground">
                    Position
                  </label>
                  <select
                    id="position"
                    value={formData.position || 'bottom-right'}
                    onChange={(e) => updateFormData({ position: e.target.value as 'bottom-right' | 'bottom-left' })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Behavior & Settings */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Behavior & Settings</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="auto-open" className="text-sm font-medium text-foreground">
                    Auto-open delay (seconds)
                  </label>
                  <input
                    id="auto-open"
                    type="number"
                    min="0"
                    max="60"
                    value={formData.auto_open_delay || 0}
                    onChange={(e) => updateFormData({ auto_open_delay: parseInt(e.target.value) || 0 })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to 0 to disable auto-opening
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <input
                      id="file-uploads"
                      type="checkbox"
                      checked={formData.allow_file_uploads || false}
                      onChange={(e) => updateFormData({ allow_file_uploads: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <label
                      htmlFor="file-uploads"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Allow file uploads
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="agent-avatars"
                      type="checkbox"
                      checked={formData.show_agent_avatars || false}
                      onChange={(e) => updateFormData({ show_agent_avatars: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <label
                      htmlFor="agent-avatars"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Show agent avatars
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="require-email"
                      type="checkbox"
                      checked={formData.require_email || false}
                      onChange={(e) => updateFormData({ require_email: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <label
                      htmlFor="require-email"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Require email from visitors
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => navigate('/chat/widgets')}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Creating Widget...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Widget
                </>
              )}
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  )
}
