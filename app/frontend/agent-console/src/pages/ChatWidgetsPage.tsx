import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageCircle, Globe, Settings, Copy, Trash2, Edit3, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { apiClient } from '../lib/api'
import type { ChatWidget, CreateChatWidgetRequest, UpdateChatWidgetRequest } from '../types/chat'
import type { DomainValidation } from '../lib/api'

export function ChatWidgetsPage() {
  const navigate = useNavigate()
  const [widgets, setWidgets] = useState<ChatWidget[]>([])
  const [domains, setDomains] = useState<DomainValidation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingWidget, setEditingWidget] = useState<ChatWidget | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [widgetsData, domainsData] = await Promise.all([
        apiClient.listChatWidgets(),
        apiClient.getDomainValidations()
      ])
      setWidgets(widgetsData)
      setDomains(domainsData.filter(d => d.status === 'verified'))
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWidget = async (widgetId: string, data: UpdateChatWidgetRequest) => {
    try {
      const updatedWidget = await apiClient.updateChatWidget(widgetId, data)
      setWidgets(prev => prev.map(w => w.id === widgetId ? updatedWidget : w))
      setEditingWidget(null)
      setSuccessMessage('Chat widget updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(`Failed to update widget: ${err.message}`)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this chat widget?')) return

    try {
      await apiClient.deleteChatWidget(widgetId)
      setWidgets(prev => prev.filter(w => w.id !== widgetId))
      setSuccessMessage('Chat widget deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(`Failed to delete widget: ${err.message}`)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleToggleActive = async (widget: ChatWidget) => {
    await handleUpdateWidget(widget.id, { is_active: !widget.is_active })
  }

  const copyEmbedCode = (embedCode: string) => {
    navigator.clipboard.writeText(embedCode)
    setSuccessMessage('Embed code copied to clipboard')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Chat Widgets</h2>
          <p className="text-sm text-muted-foreground">Create and manage chat widgets for your verified domains</p>
        </div>
        <button
          onClick={() => navigate('/chat/widget/create')}
          disabled={domains.length === 0}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
            bg-primary text-primary-foreground hover:bg-primary/90 
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          "
        >
          <Plus className="h-4 w-4" />
          Create Widget
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Success</p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
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

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            onEdit={() => setEditingWidget(widget)}
            onDelete={() => handleDeleteWidget(widget.id)}
            onToggleActive={() => handleToggleActive(widget)}
            onCopyEmbed={() => widget.embed_code && copyEmbedCode(widget.embed_code)}
          />
        ))}
      </div>

      {/* Empty State */}
      {widgets.length === 0 && domains.length > 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No chat widgets</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first chat widget to start engaging with visitors on your website
          </p>
          <button
            onClick={() => navigate('/chat/widget/create')}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
              bg-primary text-primary-foreground hover:bg-primary/90
              transition-colors duration-200
            "
          >
            <Plus className="h-4 w-4" />
            Create Your First Widget
          </button>
        </div>
      )}

      {editingWidget && (
        <EditWidgetModal
          widget={editingWidget}
          onClose={() => setEditingWidget(null)}
          onSubmit={(data) => handleUpdateWidget(editingWidget.id, data)}
        />
      )}
    </div>
  )
}

interface WidgetCardProps {
  widget: ChatWidget
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onCopyEmbed: () => void
}

function WidgetCard({ widget, onEdit, onDelete, onToggleActive, onCopyEmbed }: WidgetCardProps) {
  return (
    <div className="group bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: widget.primary_color }}
          >
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-foreground truncate">{widget.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{widget.domain_name}</span>
            </div>
          </div>
        </div>
        
        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          <div className={`
            w-2 h-2 rounded-full flex-shrink-0
            ${widget.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}
          `} />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={onToggleActive}
              className={`
                p-1.5 rounded-md transition-colors duration-200
                ${widget.is_active 
                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50' 
                  : 'text-muted-foreground hover:bg-muted'
                }
              `}
              title={widget.is_active ? 'Deactivate widget' : 'Activate widget'}
            >
              {widget.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors duration-200"
              title="Edit widget"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-200"
              title="Delete widget"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Widget Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Position</span>
          <span className="text-foreground font-medium capitalize">
            {widget.position.replace('-', ' ')}
          </span>
        </div>
        <div className="flex items-start justify-between text-sm gap-3">
          <span className="text-muted-foreground flex-shrink-0">Welcome</span>
          <span className="text-foreground text-right truncate" title={widget.welcome_message}>
            {widget.welcome_message}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Auto-open</span>
          <span className="text-foreground font-medium">
            {widget.auto_open_delay > 0 ? `${widget.auto_open_delay}s` : 'Disabled'}
          </span>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 pt-1">
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            ${widget.is_active 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-muted text-muted-foreground border border-border'
            }
          `}>
            <div className={`w-1.5 h-1.5 rounded-full ${widget.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            {widget.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-border">
        <button
          onClick={onCopyEmbed}
          className="
            flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            bg-muted hover:bg-muted/80 text-foreground transition-colors duration-200
          "
        >
          <Copy className="h-3 w-3" />
          Copy Code
        </button>
        <button
          onClick={onEdit}
          className="
            inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            bg-primary/10 hover:bg-primary/20 text-primary transition-colors duration-200
          "
        >
          <Settings className="h-3 w-3" />
          Configure
        </button>
      </div>
    </div>
  )
}

interface CreateWidgetModalProps {
  domains: DomainValidation[]
  onClose: () => void
  onSubmit: (data: CreateChatWidgetRequest) => void
}

function CreateWidgetModal({ domains, onClose, onSubmit }: CreateWidgetModalProps) {
  const [formData, setFormData] = useState<CreateChatWidgetRequest>({
    domain_id: '',
    name: '',
    primary_color: '#2563eb',
    secondary_color: '#f3f4f6',
    position: 'bottom-right',
    welcome_message: 'Hello! How can we help you?',
    offline_message: 'We are currently offline. Please leave a message.',
    auto_open_delay: 0,
    show_agent_avatars: true,
    allow_file_uploads: true,
    require_email: false,
    business_hours: { enabled: false }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Create Chat Widget</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure a new chat widget for your website</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Domain</label>
              <select
                value={formData.domain_id}
                onChange={(e) => setFormData(prev => ({ ...prev, domain_id: e.target.value }))}
                className="
                  w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                  transition-colors duration-200
                "
                required
              >
                <option value="">Select a domain</option>
                {domains.map(domain => (
                  <option key={domain.id} value={domain.id}>{domain.domain}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Widget Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="
                  w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                  transition-colors duration-200
                "
                placeholder="Support Chat"
                required
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-10 rounded-lg border border-input cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="
                      flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                      transition-colors duration-200
                    "
                    placeholder="#2563eb"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Position</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value as 'bottom-right' | 'bottom-left' }))}
                  className="
                    w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                    transition-colors duration-200
                  "
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Messages</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Welcome Message</label>
                <textarea
                  value={formData.welcome_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                  className="
                    w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                    transition-colors duration-200 resize-none
                  "
                  rows={2}
                  placeholder="Hello! How can we help you?"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Auto-open Delay</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData.auto_open_delay}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_open_delay: parseInt(e.target.value) || 0 }))}
                    className="
                      w-24 px-3 py-2 rounded-lg border border-input bg-background text-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                      transition-colors duration-200
                    "
                    min="0"
                    max="60"
                  />
                  <span className="text-sm text-muted-foreground">seconds (0 = disabled)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_agent_avatars}
                  onChange={(e) => setFormData(prev => ({ ...prev, show_agent_avatars: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Show agent avatars</span>
                  <p className="text-xs text-muted-foreground">Display agent profile pictures in chat</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_file_uploads}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_file_uploads: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Allow file uploads</span>
                  <p className="text-xs text-muted-foreground">Let customers share files in chat</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.require_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, require_email: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Require visitor email</span>
                  <p className="text-xs text-muted-foreground">Collect email before starting chat</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="
                px-4 py-2 rounded-lg text-sm font-medium border border-input
                bg-background text-foreground hover:bg-muted
                transition-colors duration-200
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                bg-primary text-primary-foreground hover:bg-primary/90
                transition-colors duration-200
              "
            >
              Create Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditWidgetModalProps {
  widget: ChatWidget
  domains: DomainValidation[]
  onClose: () => void
  onSubmit: (data: UpdateChatWidgetRequest) => void
}

function EditWidgetModal({ widget, onClose, onSubmit }: Omit<EditWidgetModalProps, 'domains'>) {
  const [formData, setFormData] = useState<UpdateChatWidgetRequest>({
    name: widget.name,
    is_active: widget.is_active,
    primary_color: widget.primary_color,
    secondary_color: widget.secondary_color,
    position: widget.position,
    welcome_message: widget.welcome_message,
    offline_message: widget.offline_message,
    auto_open_delay: widget.auto_open_delay,
    show_agent_avatars: widget.show_agent_avatars,
    allow_file_uploads: widget.allow_file_uploads,
    require_email: widget.require_email,
    business_hours: widget.business_hours
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Edit Chat Widget</h2>
          <p className="text-sm text-muted-foreground mt-1">Update widget configuration</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Widget Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="
                  w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                  transition-colors duration-200
                "
                required
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Widget is active</span>
                  <p className="text-xs text-muted-foreground">Enable widget on your website</p>
                </div>
              </label>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-10 rounded-lg border border-input cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="
                      flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                      transition-colors duration-200
                    "
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Position</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value as 'bottom-right' | 'bottom-left' }))}
                  className="
                    w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                    transition-colors duration-200
                  "
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Messages</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Welcome Message</label>
                <textarea
                  value={formData.welcome_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
                  className="
                    w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                    transition-colors duration-200 resize-none
                  "
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Offline Message</label>
                <textarea
                  value={formData.offline_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, offline_message: e.target.value }))}
                  className="
                    w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground
                    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                    transition-colors duration-200 resize-none
                  "
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Auto-open Delay</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData.auto_open_delay}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_open_delay: parseInt(e.target.value) || 0 }))}
                    className="
                      w-24 px-3 py-2 rounded-lg border border-input bg-background text-foreground
                      focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                      transition-colors duration-200
                    "
                    min="0"
                    max="60"
                  />
                  <span className="text-sm text-muted-foreground">seconds (0 = disabled)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_agent_avatars}
                  onChange={(e) => setFormData(prev => ({ ...prev, show_agent_avatars: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Show agent avatars</span>
                  <p className="text-xs text-muted-foreground">Display agent profile pictures in chat</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_file_uploads}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_file_uploads: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Allow file uploads</span>
                  <p className="text-xs text-muted-foreground">Let customers share files in chat</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.require_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, require_email: e.target.checked }))}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Require visitor email</span>
                  <p className="text-xs text-muted-foreground">Collect email before starting chat</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="
                px-4 py-2 rounded-lg text-sm font-medium border border-input
                bg-background text-foreground hover:bg-muted
                transition-colors duration-200
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                bg-primary text-primary-foreground hover:bg-primary/90
                transition-colors duration-200
              "
            >
              Update Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
