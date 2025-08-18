import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Palette, Save, AlertCircle, User, Sparkles } from 'lucide-react'
import { apiClient } from '../lib/api'
import type { DomainValidation } from '../lib/api'

interface CreateChatWidgetRequest {
  name: string
  domain_id: string
  welcome_message?: string
  custom_greeting?: string
  away_message?: string
  primary_color?: string
  secondary_color?: string
  position?: 'bottom-right' | 'bottom-left'
  widget_shape?: 'rounded' | 'square' | 'minimal' | 'professional' | 'modern' | 'classic'
  chat_bubble_style?: 'modern' | 'classic' | 'minimal' | 'rounded'
  widget_size?: 'small' | 'medium' | 'large'
  animation_style?: 'smooth' | 'bounce' | 'fade' | 'slide'
  agent_name?: string
  agent_avatar_url?: string
  allow_file_uploads?: boolean
  show_agent_avatars?: boolean
  require_email?: boolean
  sound_enabled?: boolean
  show_powered_by?: boolean
  use_ai?: boolean
  auto_open_delay?: number
}

export function CreateChatWidgetPage() {
  const navigate = useNavigate()
  const { widgetId } = useParams<{ widgetId: string }>()
  const isEditMode = Boolean(widgetId)
  
  const [domains, setDomains] = useState<DomainValidation[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<CreateChatWidgetRequest>({
    name: '',
    domain_id: '',
    welcome_message: 'Hello! How can we help you today?',
    custom_greeting: 'Hi there! 👋 How can we help you today?',
    away_message: 'We\'re currently away. Leave us a message and we\'ll get back to you!',
    primary_color: '#3b82f6',
    secondary_color: '#6b7280',
    position: 'bottom-right',
    widget_shape: 'rounded',
    chat_bubble_style: 'modern',
    widget_size: 'medium',
    animation_style: 'smooth',
    agent_name: 'Support Agent',
    agent_avatar_url: '',
    allow_file_uploads: false,
    show_agent_avatars: true,
    require_email: false,
    sound_enabled: true,
    show_powered_by: true,
    use_ai: false,
    auto_open_delay: 0
  })

  const widgetShapes = [
    { value: 'rounded', label: 'Rounded', desc: 'Friendly and approachable', preview: '🔵' },
    { value: 'square', label: 'Square', desc: 'Clean and professional', preview: '⬛' },
    { value: 'minimal', label: 'Minimal', desc: 'Ultra-clean design', preview: '⚪' },
    { value: 'professional', label: 'Professional', desc: 'Enterprise-grade', preview: '🏢' },
    { value: 'modern', label: 'Modern', desc: 'Contemporary style', preview: '✨' },
    { value: 'classic', label: 'Classic', desc: 'Traditional design', preview: '📝' }
  ]

  const bubbleStyles = [
    { value: 'modern', label: 'Modern', desc: 'Sleek asymmetric bubbles' },
    { value: 'classic', label: 'Classic', desc: 'Traditional rounded bubbles' },
    { value: 'minimal', label: 'Minimal', desc: 'Simple rectangular style' },
    { value: 'rounded', label: 'Rounded', desc: 'Fully rounded bubbles' }
  ]

  useEffect(() => {
    loadData()
  }, [widgetId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const domainsData = await apiClient.getDomainValidations()
      setDomains(domainsData.filter(d => d.status === 'verified'))
      
      // If editing, load the widget data
      if (widgetId) {
        const widget = await apiClient.getChatWidget(widgetId)
        setFormData({
          name: widget.name,
          domain_id: widget.domain_id,
          welcome_message: widget.welcome_message || 'Hello! How can we help you today?',
          custom_greeting: widget.custom_greeting || 'Hi there! 👋 How can we help you today?',
          away_message: widget.away_message || 'We\'re currently away. Leave us a message and we\'ll get back to you!',
          primary_color: widget.primary_color || '#3b82f6',
          secondary_color: widget.secondary_color || '#6b7280',
          position: widget.position || 'bottom-right',
          widget_shape: widget.widget_shape || 'rounded',
          chat_bubble_style: widget.chat_bubble_style || 'modern',
          widget_size: widget.widget_size || 'medium',
          animation_style: widget.animation_style || 'smooth',
          agent_name: widget.agent_name || 'Support Agent',
          agent_avatar_url: widget.agent_avatar_url || '',
          allow_file_uploads: widget.allow_file_uploads || false,
          show_agent_avatars: widget.show_agent_avatars !== false,
          require_email: widget.require_email || false,
          sound_enabled: widget.sound_enabled !== false,
          show_powered_by: widget.show_powered_by !== false,
          use_ai: widget.use_ai || false,
          auto_open_delay: widget.auto_open_delay || 0
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
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
      
      if (widgetId) {
        // Update existing widget
        await apiClient.updateChatWidget(widgetId, formData)
        navigate('/chat/widgets?updated=true')
      } else {
        // Create new widget
        await apiClient.createChatWidget(formData)
        navigate('/chat/widgets?created=true')
      }
    } catch (err: any) {
      setError(`Failed to ${widgetId ? 'update' : 'create'} widget: ${err.message}`)
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {widgetId ? 'Edit Chat Widget' : 'Create Chat Widget'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {widgetId ? 'Update your chat widget configuration' : 'Configure a new chat widget for your website'}
            </p>
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
                  {widgetId ? (
                    <div className="h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm flex items-center">
                      {domains.find(d => d.id === formData.domain_id)?.domain || 'Domain not found'}
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Agent Personalization */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Agent Personalization</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="agent-name" className="text-sm font-medium text-foreground">
                    Agent Name
                  </label>
                  <input
                    id="agent-name"
                    type="text"
                    value={formData.agent_name}
                    onChange={(e) => updateFormData({ agent_name: e.target.value })}
                    placeholder="e.g. Sarah Johnson"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="agent-avatar" className="text-sm font-medium text-foreground">
                    Agent Avatar URL
                  </label>
                  <input
                    id="agent-avatar"
                    type="url"
                    value={formData.agent_avatar_url}
                    onChange={(e) => updateFormData({ agent_avatar_url: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="custom-greeting" className="text-sm font-medium text-foreground">
                    Custom Greeting
                  </label>
                  <textarea
                    id="custom-greeting"
                    value={formData.custom_greeting}
                    onChange={(e) => updateFormData({ custom_greeting: e.target.value })}
                    rows={2}
                    placeholder="Personal greeting message"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="away-message" className="text-sm font-medium text-foreground">
                    Away Message
                  </label>
                  <textarea
                    id="away-message"
                    value={formData.away_message}
                    onChange={(e) => updateFormData({ away_message: e.target.value })}
                    rows={2}
                    placeholder="Message when agents are offline"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Widget Appearance */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Widget Appearance</h2>
              </div>
              
              {/* Widget Shape Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Widget Shape</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {widgetShapes.map((shape) => (
                    <div
                      key={shape.value}
                      className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                        formData.widget_shape === shape.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50'
                      }`}
                      onClick={() => updateFormData({ widget_shape: shape.value as any })}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{shape.preview}</span>
                        <div>
                          <div className="font-medium text-sm">{shape.label}</div>
                          <div className="text-xs text-muted-foreground">{shape.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bubble Style Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Chat Bubble Style</label>
                <div className="grid grid-cols-2 gap-3">
                  {bubbleStyles.map((style) => (
                    <div
                      key={style.value}
                      className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                        formData.chat_bubble_style === style.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50'
                      }`}
                      onClick={() => updateFormData({ chat_bubble_style: style.value as any })}
                    >
                      <div className="font-medium text-sm">{style.label}</div>
                      <div className="text-xs text-muted-foreground">{style.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="primary-color" className="text-sm font-medium text-foreground">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => updateFormData({ primary_color: e.target.value })}
                      className="h-9 w-16 rounded-md border border-input cursor-pointer"
                    />
                    <input
                      id="primary-color"
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => updateFormData({ primary_color: e.target.value })}
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="widget-size" className="text-sm font-medium text-foreground">
                    Widget Size
                  </label>
                  <select
                    id="widget-size"
                    value={formData.widget_size}
                    onChange={(e) => updateFormData({ widget_size: e.target.value as any })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="small">Small (300×400)</option>
                    <option value="medium">Medium (350×500)</option>
                    <option value="large">Large (400×600)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="position" className="text-sm font-medium text-foreground">
                    Position
                  </label>
                  <select
                    id="position"
                    value={formData.position}
                    onChange={(e) => updateFormData({ position: e.target.value as any })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Features */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Advanced Features</h2>
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
                    value={formData.auto_open_delay}
                    onChange={(e) => updateFormData({ auto_open_delay: parseInt(e.target.value) || 0 })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="animation-style" className="text-sm font-medium text-foreground">
                    Animation Style
                  </label>
                  <select
                    id="animation-style"
                    value={formData.animation_style}
                    onChange={(e) => updateFormData({ animation_style: e.target.value as any })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="smooth">Smooth</option>
                    <option value="bounce">Bouncy</option>
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      id="file-uploads"
                      type="checkbox"
                      checked={formData.allow_file_uploads}
                      onChange={(e) => updateFormData({ allow_file_uploads: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="file-uploads" className="text-sm font-medium text-foreground cursor-pointer">
                      Allow file uploads
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="agent-avatars"
                      type="checkbox"
                      checked={formData.show_agent_avatars}
                      onChange={(e) => updateFormData({ show_agent_avatars: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="agent-avatars" className="text-sm font-medium text-foreground cursor-pointer">
                      Show agent avatars
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="require-email"
                      type="checkbox"
                      checked={formData.require_email}
                      onChange={(e) => updateFormData({ require_email: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="require-email" className="text-sm font-medium text-foreground cursor-pointer">
                      Require visitor email
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="sound-enabled"
                      type="checkbox"
                      checked={formData.sound_enabled}
                      onChange={(e) => updateFormData({ sound_enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="sound-enabled" className="text-sm font-medium text-foreground cursor-pointer">
                      Enable notification sounds
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="show-powered-by"
                      type="checkbox"
                      checked={formData.show_powered_by}
                      onChange={(e) => updateFormData({ show_powered_by: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="show-powered-by" className="text-sm font-medium text-foreground cursor-pointer">
                      Show "Powered by" branding
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="use-ai"
                      type="checkbox"
                      checked={formData.use_ai}
                      onChange={(e) => updateFormData({ use_ai: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="use-ai" className="text-sm font-medium text-foreground cursor-pointer">
                      Enable AI assistance (Beta)
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
                  {widgetId ? 'Updating Widget...' : 'Creating Widget...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {widgetId ? 'Update Widget' : 'Create Widget'}
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
