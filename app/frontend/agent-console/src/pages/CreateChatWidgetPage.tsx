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
  chat_bubble_style?: 'modern' | 'classic' | 'minimal' | 'bot'
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
    { value: 'modern', label: 'Modern', desc: 'Sleek' },
    { value: 'classic', label: 'Classic', desc: 'Traditional' },
    { value: 'minimal', label: 'Minimal', desc: 'Simple' },
    { value: 'bot', label: 'Bot', desc: 'Bot' }
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
        console.log('Updating widget:', formData)
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

  const getBubbleStyleIcon = (style: string) => {
    switch (style) {
      case 'modern':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle-more-icon lucide-message-circle-more"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
        )
        // return (
        //   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        //     <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        //   </svg>
        // )
      case 'classic':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
          </svg>
        )
      case 'minimal':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16v12H5.17L4 17.17V4m0-2c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"/>
          </svg>
        )
      case 'bot':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot-icon lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        )
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        )
    }
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
      <div className="container max-w-6xl mx-auto p-3 space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/chat/widgets')}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Chat Widgets
              </button>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {widgetId ? 'Edit Chat Widget' : 'Create Chat Widget'}
            </h1>
          </div>
        </div>

      {/* Compact Error Alert */}
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Compact Domain Warning */}
      {domains.length === 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Verify domains in Settings before creating widgets.{' '}
              <a href="/settings" className="underline font-medium">Go to Settings</a>
            </p>
          </div>
        </div>
      )}

      {/* Compact 2-Column Form Layout */}
      {domains.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Column */}
            <div className="space-y-4">
              
              {/* Basic Information */}
              <div className="rounded border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="widget-name" className="text-sm font-medium text-foreground">
                      Widget Name
                    </label>
                    <input
                      id="widget-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData({ name: e.target.value })}
                      placeholder="e.g. Main Website Chat"
                      className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="domain-select" className="text-sm font-medium text-foreground">
                      Domain
                    </label>
                    {widgetId ? (
                      <div className="h-9 w-full rounded border border-input bg-muted px-3 py-2 text-sm flex items-center">
                        {domains.find(d => d.id === formData.domain_id)?.domain || 'Domain not found'}
                      </div>
                    ) : (
                      <select
                        id="domain-select"
                        value={formData.domain_id}
                        onChange={(e) => updateFormData({ domain_id: e.target.value })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
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

              {/* Agent Personalization */}
              <div className="rounded border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Agent Personalization</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="agent-name" className="text-sm font-medium text-foreground">
                        Agent Name
                      </label>
                      <input
                        id="agent-name"
                        type="text"
                        value={formData.agent_name}
                        onChange={(e) => updateFormData({ agent_name: e.target.value })}
                        placeholder="Sarah Johnson"
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="agent-avatar" className="text-sm font-medium text-foreground">
                        Avatar URL
                      </label>
                      <input
                        id="agent-avatar"
                        type="url"
                        value={formData.agent_avatar_url}
                        onChange={(e) => updateFormData({ agent_avatar_url: e.target.value })}
                        placeholder="https://..."
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="custom-greeting" className="text-sm font-medium text-foreground">
                      Custom Greeting
                    </label>
                    <textarea
                      id="custom-greeting"
                      value={formData.custom_greeting}
                      onChange={(e) => updateFormData({ custom_greeting: e.target.value })}
                      rows={3}
                      placeholder="Hi there! 👋 How can we help you today?"
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="away-message" className="text-sm font-medium text-foreground">
                      Away Message
                    </label>
                    <textarea
                      id="away-message"
                      value={formData.away_message}
                      onChange={(e) => updateFormData({ away_message: e.target.value })}
                      rows={3}
                      placeholder="We're currently away. Leave us a message!"
                      className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Features in 2 Rows */}
              <div className="rounded border border-border bg-card p-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      id="file-uploads"
                      type="checkbox"
                      checked={formData.allow_file_uploads}
                      onChange={(e) => updateFormData({ allow_file_uploads: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <label htmlFor="file-uploads" className="text-sm text-foreground cursor-pointer">
                      Allow file uploads
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="agent-avatars"
                      type="checkbox"
                      checked={formData.show_agent_avatars}
                      onChange={(e) => updateFormData({ show_agent_avatars: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <label htmlFor="agent-avatars" className="text-sm text-foreground cursor-pointer">
                      Show agent avatars
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="require-email"
                      type="checkbox"
                      checked={formData.require_email}
                      onChange={(e) => updateFormData({ require_email: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <label htmlFor="require-email" className="text-sm text-foreground cursor-pointer">
                      Require visitor email
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="sound-enabled"
                      type="checkbox"
                      checked={formData.sound_enabled}
                      onChange={(e) => updateFormData({ sound_enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <label htmlFor="sound-enabled" className="text-sm text-foreground cursor-pointer">
                      Enable notifications
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="show-powered-by"
                      type="checkbox"
                      checked={formData.show_powered_by}
                      onChange={(e) => updateFormData({ show_powered_by: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <label htmlFor="show-powered-by" className="text-sm text-foreground cursor-pointer">
                      Show branding
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="use-ai"
                      type="checkbox"
                      checked={formData.use_ai}
                      onChange={(e) => updateFormData({ use_ai: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    <label htmlFor="use-ai" className="text-sm text-foreground cursor-pointer">
                      AI assistance (Beta)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              
              {/* Widget Appearance */}
              <div className="rounded border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Appearance</h3>
                </div>
                
                {/* Widget Shape & Bubble Style Dropdowns */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="widget-shape" className="text-sm font-medium text-foreground">
                        Widget Shape
                      </label>
                      <select
                        id="widget-shape"
                        value={formData.widget_shape}
                        onChange={(e) => updateFormData({ widget_shape: e.target.value as any })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      >
                        {widgetShapes.map((shape) => (
                          <option key={shape.value} value={shape.value}>
                            {shape.preview} {shape.label} - {shape.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="bubble-style" className="text-sm font-medium text-foreground">
                        Bubble Style
                      </label>
                      <select
                        id="bubble-style"
                        value={formData.chat_bubble_style}
                        onChange={(e) => updateFormData({ chat_bubble_style: e.target.value as any })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      >
                        {bubbleStyles.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.label} - {style.desc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Color and Settings */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="primary-color" className="text-sm font-medium text-foreground">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => updateFormData({ primary_color: e.target.value })}
                        className="h-9 w-16 rounded border border-input cursor-pointer"
                      />
                      <input
                        id="primary-color"
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => updateFormData({ primary_color: e.target.value })}
                        className="h-9 flex-1 rounded border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="widget-size" className="text-sm font-medium text-foreground">
                        Widget Size
                      </label>
                      <select
                        id="widget-size"
                        value={formData.widget_size}
                        onChange={(e) => updateFormData({ widget_size: e.target.value as any })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="small">Small (300×400)</option>
                        <option value="medium">Medium (350×500)</option>
                        <option value="large">Large (400×600)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="position" className="text-sm font-medium text-foreground">
                        Position
                      </label>
                      <select
                        id="position"
                        value={formData.position}
                        onChange={(e) => updateFormData({ position: e.target.value as any })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="auto-open" className="text-sm font-medium text-foreground">
                        Auto-open (seconds)
                      </label>
                      <input
                        id="auto-open"
                        type="number"
                        min="0"
                        max="60"
                        value={formData.auto_open_delay}
                        onChange={(e) => updateFormData({ auto_open_delay: parseInt(e.target.value) || 0 })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="animation-style" className="text-sm font-medium text-foreground">
                        Animation
                      </label>
                      <select
                        id="animation-style"
                        value={formData.animation_style}
                        onChange={(e) => updateFormData({ animation_style: e.target.value as any })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="smooth">Smooth</option>
                        <option value="bounce">Bouncy</option>
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Live Preview */}
              <div className="rounded border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
                </div>
                
                <div className="bg-muted rounded p-4 relative h-40 overflow-hidden">
                  <div className="absolute bottom-4 right-4">
                    <div 
                      className={`w-14 h-14 flex items-center justify-center text-white text-lg font-medium shadow-lg transition-all ${
                        formData.widget_shape === 'square' ? 'rounded-lg' : 
                        formData.widget_shape === 'minimal' ? 'rounded' : 
                        formData.widget_shape === 'professional' ? 'rounded-md' : 'rounded-full'
                      } ${
                        formData.widget_size === 'small' ? 'w-12 h-12 text-sm' :
                        formData.widget_size === 'large' ? 'w-16 h-16 text-xl' : 'w-14 h-14 text-lg'
                      }`}
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      {getBubbleStyleIcon(formData.chat_bubble_style || 'modern')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      {formData.name || 'Untitled Widget'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Position: {(formData.position || 'bottom-right').replace('-', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Shape: {widgetShapes.find(s => s.value === formData.widget_shape)?.label || 'Rounded'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Size: {formData.widget_size || 'medium'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => navigate('/chat/widgets')}
              className="inline-flex items-center justify-center rounded text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary-foreground mr-2"></div>
                  {widgetId ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
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
