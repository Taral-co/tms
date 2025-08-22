import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Palette, Save, AlertCircle, User, Sparkles, Send, Paperclip, X } from 'lucide-react'
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
  background_color?: string
  accent_color?: string
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
  
  const [domains, setDomains] = useState<DomainValidation[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Simulation state
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const [simulationMessages, setSimulationMessages] = useState([
    {
      id: '1',
      type: 'system',
      content: 'Welcome message will appear here',
      timestamp: new Date()
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  
  const [formData, setFormData] = useState<CreateChatWidgetRequest>({
    name: '',
    domain_id: '',
    welcome_message: 'Hello! How can we help you today?',
    custom_greeting: 'Hi there! 👋 How can we help you today?',
    away_message: 'We\'re currently away. Leave us a message and we\'ll get back to you!',
    primary_color: '#3b82f6',
    secondary_color: '#6b7280',
    background_color: '#ffffff',
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

  // Update simulation messages when welcome message changes
  useEffect(() => {
    setSimulationMessages([
      {
        id: '1',
        type: 'system',
        content: formData.welcome_message || 'Hello! How can we help you today?',
        timestamp: new Date()
      },
      {
        id: '2',
        type: 'visitor',
        content: 'Hello! I have a question about your services.',
        timestamp: new Date()
      },
      {
        id: '3',
        type: 'agent',
        content: 'Hi there! I\'d be happy to help you with that. What specific information are you looking for?',
        timestamp: new Date()
      }
    ])
  }, [formData.welcome_message, formData.agent_name])

  // Simulation helper functions
  const toggleSimulationWidget = () => {
    setIsWidgetOpen(!isWidgetOpen)
    if (!isWidgetOpen) {
      // Simulate typing when opening
      setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 2000)
      }, 1000)
    }
  }

  const getWidgetButtonSize = () => {
    const sizes = {
      small: 'h-12 w-12',
      medium: 'h-14 w-14',
      large: 'h-16 w-16'
    }
    return sizes[formData.widget_size as keyof typeof sizes] || sizes.medium
  }

  const getWidgetWindowSize = () => {
    const sizes = {
      small: 'h-96 w-80',
      medium: 'h-[450px] w-96',
      large: 'h-[500px] w-[400px]'
    }
    return sizes[formData.widget_size as keyof typeof sizes] || sizes.medium
  }

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
      <div className="container max-w-7xl mx-auto p-3 space-y-3">
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

      {/* Enhanced Form + Live Simulation Layout */}
      {domains.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            
            {/* Left Column - Form (60% width) */}
            <div className="xl:col-span-3 space-y-4">
              
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
                        Avatar URL (optional)
                      </label>
                      <input
                        id="agent-avatar"
                        type="url"
                        value={formData.agent_avatar_url}
                        onChange={(e) => updateFormData({ agent_avatar_url: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="welcome-message" className="text-sm font-medium text-foreground">
                      Welcome Message
                    </label>
                    <textarea
                      id="welcome-message"
                      value={formData.welcome_message}
                      onChange={(e) => updateFormData({ welcome_message: e.target.value })}
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
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Features</h3>
                </div>
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
                      Sound notifications
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

              {/* Widget Appearance */}
              <div className="rounded border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Appearance</h3>
                </div>
                
                <div className="space-y-3">
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
                            {shape.preview} {shape.label}
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
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="primary-color" className="text-sm font-medium text-foreground">
                        Primary Color
                      </label>
                      <input
                        id="primary-color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => updateFormData({ primary_color: e.target.value })}
                        className="h-9 w-full rounded border border-input bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="widget-size" className="text-sm font-medium text-foreground">
                        Size
                      </label>
                      <select
                        id="widget-size"
                        value={formData.widget_size}
                        onChange={(e) => updateFormData({ widget_size: e.target.value as any })}
                        className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
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

                  <div className="space-y-1">
                    <label htmlFor="auto-open-delay" className="text-sm font-medium text-foreground">
                      Auto-open delay (seconds)
                    </label>
                    <input
                      id="auto-open-delay"
                      type="number"
                      min="0"
                      max="30"
                      value={formData.auto_open_delay}
                      onChange={(e) => updateFormData({ auto_open_delay: Number(e.target.value) })}
                      className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Live Simulation (40% width) */}
            <div className="xl:col-span-2">
              <div className="sticky top-6 space-y-4">
                <div className="rounded border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">Live Preview</h3>
                  </div>
                  
                  {/* Website Mockup Container */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-6 h-[600px] relative overflow-hidden border">
                    {/* Mockup Browser UI */}
                    <div className="bg-white dark:bg-slate-800 rounded-t border-b border-slate-200 dark:border-slate-700 p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded px-3 py-1 text-xs text-slate-600 dark:text-slate-400">
                          {domains.find(d => d.id === formData.domain_id)?.domain || 'your-website.com'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Website Content Area */}
                    <div className="bg-white dark:bg-slate-800 rounded-b h-full relative">
                      <div className="p-6 space-y-4">
                        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
                        </div>
                      </div>
                      
                      {/* Chat Widget Simulation */}
                      <div className={`absolute ${formData.position === 'bottom-left' ? 'bottom-6 left-6' : 'bottom-6 right-6'} z-50`}>
                        {/* Toggle Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={toggleSimulationWidget}
                            className={`
                              ${getWidgetButtonSize()}
                              rounded-full shadow-lg transition-all duration-300 hover:scale-105 
                              flex items-center justify-center text-white
                              ${formData.widget_shape === 'square' ? 'rounded-lg' : 
                                formData.widget_shape === 'minimal' ? 'rounded-full border-2 border-white' : 
                                'rounded-full'}
                            `}
                            style={{ 
                              backgroundColor: formData.primary_color,
                              animation: formData.animation_style === 'bounce' ? 'bounce 2s infinite' :
                                        formData.animation_style === 'fade' ? 'pulse 2s infinite' :
                                        formData.animation_style === 'slide' ? 'slideIn 0.5s ease-out' : 'none'
                            }}
                          >
                            {getBubbleStyleIcon(formData.chat_bubble_style || 'modern')}
                          </button>
                          
                          {/* Chat Window */}
                          {isWidgetOpen && (
                            <div 
                              className={`
                                absolute bottom-full mb-4 
                                ${formData.position === 'bottom-left' ? 'left-0' : 'right-0'}
                                ${getWidgetWindowSize()}
                                bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700
                                transform transition-all duration-300 origin-bottom
                                ${isWidgetOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                              `}
                            >
                              {/* Chat Header */}
                              <div 
                                className="p-4 rounded-t-lg border-b border-slate-200 dark:border-slate-700 flex items-center gap-3"
                                style={{ backgroundColor: formData.primary_color }}
                              >
                                {formData.show_agent_avatars && (
                                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
                                    {formData.agent_avatar_url ? (
                                      <img 
                                        src={formData.agent_avatar_url} 
                                        alt={formData.agent_name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      formData.agent_name?.charAt(0)?.toUpperCase() || 'S'
                                    )}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="text-white font-medium text-sm">
                                    {formData.agent_name || 'Support Agent'}
                                  </div>
                                  <div className="text-white/80 text-xs">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                      Online now
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={toggleSimulationWidget}
                                  className="text-white/80 hover:text-white p-1"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              
                              {/* Messages Area */}
                              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-72">
                                {simulationMessages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex ${message.type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`
                                        max-w-[80%] p-3 rounded-lg text-sm
                                        ${message.type === 'visitor'
                                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-br-sm'
                                          : message.type === 'system'
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 rounded-bl-sm'
                                          : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                                        }
                                      `}
                                      style={message.type === 'visitor' ? { backgroundColor: `${formData.primary_color}20` } : {}}
                                    >
                                      {message.content}
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Typing Indicator */}
                                {isTyping && (
                                  <div className="flex justify-start">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg rounded-bl-sm">
                                      <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Input Area */}
                              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex gap-2">
                                  {formData.allow_file_uploads && (
                                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                      <Paperclip className="h-4 w-4" />
                                    </button>
                                  )}
                                  <input
                                    type="text"
                                    placeholder="Type your message..."
                                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled
                                  />
                                  <button 
                                    type="button"
                                    className="p-2 text-white rounded-lg"
                                    style={{ backgroundColor: formData.primary_color }}
                                  >
                                    <Send className="h-4 w-4" />
                                  </button>
                                </div>
                                
                                {formData.show_powered_by && (
                                  <div className="mt-2 text-center">
                                    <div className="text-xs text-slate-400">
                                      Powered by TMS Chat
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={toggleSimulationWidget}
                      className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {isWidgetOpen ? 'Close Widget' : 'Open Widget'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTyping(true)
                        setTimeout(() => setIsTyping(false), 2000)
                      }}
                      className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Demo Typing
                    </button>
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