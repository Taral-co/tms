import React, { useState, useEffect } from 'react'
import { Plus, MessageCircle, Globe, Settings, Copy, Trash2, Edit3, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '../lib/api'
import type { ChatWidget, CreateChatWidgetRequest, UpdateChatWidgetRequest } from '../types/chat'
import type { DomainValidation } from '../lib/api'

export function ChatWidgetsPage() {
  const [widgets, setWidgets] = useState<ChatWidget[]>([])
  const [domains, setDomains] = useState<DomainValidation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
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

  const handleCreateWidget = async (data: CreateChatWidgetRequest) => {
    try {
      const newWidget = await apiClient.createChatWidget(data)
      setWidgets(prev => [...prev, newWidget])
      setShowCreateModal(false)
      setSuccessMessage('Chat widget created successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(`Failed to create widget: ${err.message}`)
      setTimeout(() => setError(null), 5000)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Widgets</h1>
          <p className="text-gray-600">Manage chat widgets for your verified domains</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={domains.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Create Widget
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* No domains warning */}
      {domains.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          You need to verify at least one domain before creating chat widgets.
          <a href="/settings" className="ml-2 underline">Go to Settings</a>
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
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chat widgets</h3>
          <p className="text-gray-600 mb-4">Create your first chat widget to start engaging with visitors</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Your First Widget
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWidgetModal
          domains={domains}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateWidget}
        />
      )}

      {/* Edit Modal */}
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: widget.primary_color }}
          >
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{widget.name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {widget.domain_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`p-1.5 rounded ${widget.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
            title={widget.is_active ? 'Active' : 'Inactive'}
          >
            {widget.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
            title="Edit widget"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete widget"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-sm">
          <span className="text-gray-500">Position:</span>
          <span className="ml-2 text-gray-900 capitalize">{widget.position.replace('-', ' ')}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Welcome:</span>
          <span className="ml-2 text-gray-900">{widget.welcome_message}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Auto-open:</span>
          <span className="ml-2 text-gray-900">
            {widget.auto_open_delay > 0 ? `${widget.auto_open_delay}s` : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCopyEmbed}
          className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 flex items-center justify-center gap-2"
        >
          <Copy className="h-3 w-3" />
          Copy Embed Code
        </button>
        <button
          onClick={onEdit}
          className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200 flex items-center gap-1"
        >
          <Settings className="h-3 w-3" />
          Settings
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Create Chat Widget</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <select
                value={formData.domain_id}
                onChange={(e) => setFormData(prev => ({ ...prev, domain_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select a domain</option>
                {domains.map(domain => (
                  <option key={domain.id} value={domain.id}>{domain.domain}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Widget Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Support Chat"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value as 'bottom-right' | 'bottom-left' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
            <textarea
              value={formData.welcome_message}
              onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-open Delay (seconds)</label>
            <input
              type="number"
              value={formData.auto_open_delay}
              onChange={(e) => setFormData(prev => ({ ...prev, auto_open_delay: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="0"
              max="60"
            />
            <p className="text-xs text-gray-500 mt-1">0 = disabled</p>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_agent_avatars}
                onChange={(e) => setFormData(prev => ({ ...prev, show_agent_avatars: e.target.checked }))}
                className="mr-2"
              />
              Show agent avatars
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_file_uploads}
                onChange={(e) => setFormData(prev => ({ ...prev, allow_file_uploads: e.target.checked }))}
                className="mr-2"
              />
              Allow file uploads
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.require_email}
                onChange={(e) => setFormData(prev => ({ ...prev, require_email: e.target.checked }))}
                className="mr-2"
              />
              Require visitor email
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Edit Chat Widget</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Widget Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="mr-2"
                />
                Widget is active
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value as 'bottom-right' | 'bottom-left' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
            <textarea
              value={formData.welcome_message}
              onChange={(e) => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Offline Message</label>
            <textarea
              value={formData.offline_message}
              onChange={(e) => setFormData(prev => ({ ...prev, offline_message: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-open Delay (seconds)</label>
            <input
              type="number"
              value={formData.auto_open_delay}
              onChange={(e) => setFormData(prev => ({ ...prev, auto_open_delay: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min="0"
              max="60"
            />
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.show_agent_avatars}
                onChange={(e) => setFormData(prev => ({ ...prev, show_agent_avatars: e.target.checked }))}
                className="mr-2"
              />
              Show agent avatars
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allow_file_uploads}
                onChange={(e) => setFormData(prev => ({ ...prev, allow_file_uploads: e.target.checked }))}
                className="mr-2"
              />
              Allow file uploads
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.require_email}
                onChange={(e) => setFormData(prev => ({ ...prev, require_email: e.target.checked }))}
                className="mr-2"
              />
              Require visitor email
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
