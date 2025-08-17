import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Palette, Settings, Save, AlertCircle } from 'lucide-react'
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
    <div className="p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/chat/widgets')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Widgets
        </button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Create Chat Widget</h1>
        <p className="text-sm text-muted-foreground">Set up a new chat widget for your domain</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* No domains warning */}
      {domains.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Domain Verification Required</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You need to verify at least one domain before creating chat widgets.{' '}
              <a href="/settings" className="underline hover:no-underline font-medium">
                Go to Settings
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      {domains.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Widget Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="e.g. Main Website Chat"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Domain</label>
                <select
                  value={formData.domain_id}
                  onChange={(e) => updateFormData({ domain_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              <label className="text-sm font-medium text-foreground">Welcome Message</label>
              <textarea
                value={formData.welcome_message}
                onChange={(e) => updateFormData({ welcome_message: e.target.value })}
                rows={3}
                placeholder="Enter the greeting message for visitors"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium text-foreground">Appearance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color || '#3b82f6'}
                    onChange={(e) => updateFormData({ primary_color: e.target.value })}
                    className="w-12 h-10 border border-border rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color || '#3b82f6'}
                    onChange={(e) => updateFormData({ primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Position</label>
                <select
                  value={formData.position || 'bottom-right'}
                  onChange={(e) => updateFormData({ position: e.target.value as 'bottom-right' | 'bottom-left' })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium text-foreground">Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_file_uploads || false}
                  onChange={(e) => updateFormData({ allow_file_uploads: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-foreground">Allow file uploads</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_agent_avatars || false}
                  onChange={(e) => updateFormData({ show_agent_avatars: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-foreground">Show agent avatars</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.require_email || false}
                  onChange={(e) => updateFormData({ require_email: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-foreground">Require email from visitors</span>
              </label>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Auto-open delay (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.auto_open_delay || 0}
                  onChange={(e) => updateFormData({ auto_open_delay: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => navigate('/chat/widgets')}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Widget
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
