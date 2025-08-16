import React, { useState, useEffect } from 'react'
import { X, MessageCircle, User, Mail, Globe } from 'lucide-react'
import { apiClient } from '../lib/api'
import type { ChatWidget } from '../types/chat'

interface CreateChatSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionCreated: (sessionId: string) => void
}

export function CreateChatSessionModal({ isOpen, onClose, onSessionCreated }: CreateChatSessionModalProps) {
  const [widgets, setWidgets] = useState<ChatWidget[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingWidgets, setLoadingWidgets] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadWidgets()
    }
  }, [isOpen])

  const loadWidgets = async () => {
    try {
      setLoadingWidgets(true)
      const data = await apiClient.listChatWidgets()
      setWidgets(data.filter(w => w.is_active))
    } catch (err: any) {
      setError(`Failed to load widgets: ${err.message}`)
    } finally {
      setLoadingWidgets(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWidgetId || !customerEmail.trim()) return

    try {
      setLoading(true)
      setError(null)

      const session = await apiClient.createChatSession({
        widget_id: selectedWidgetId,
        customer_email: customerEmail.trim(),
        customer_name: customerName.trim() || undefined
      })

      onSessionCreated(session.id)
      handleClose()
    } catch (err: any) {
      setError(`Failed to create chat session: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedWidgetId('')
    setCustomerEmail('')
    setCustomerName('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Start New Chat</h2>
              <p className="text-sm text-muted-foreground">Create a chat session with a customer</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Widget Selection */}
          <div className="space-y-2">
            <label htmlFor="widget-select" className="text-sm font-medium text-card-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Chat Widget
            </label>
            {loadingWidgets ? (
              <div className="flex items-center justify-center h-10 border border-input rounded-md">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              </div>
            ) : (
              <select
                id="widget-select"
                value={selectedWidgetId}
                onChange={(e) => setSelectedWidgetId(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                required
              >
                <option value="">Select a chat widget...</option>
                {widgets.map((widget) => (
                  <option key={widget.id} value={widget.id}>
                    {widget.name} ({widget.domain_name})
                  </option>
                ))}
              </select>
            )}
            {widgets.length === 0 && !loadingWidgets && (
              <p className="text-sm text-muted-foreground">No active chat widgets found. Create one first.</p>
            )}
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <label htmlFor="customer-email" className="text-sm font-medium text-card-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Customer Email *
            </label>
            <input
              id="customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@company.com"
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              required
            />
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <label htmlFor="customer-name" className="text-sm font-medium text-card-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer Name
            </label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional customer name"
              className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 px-4 py-2 border border-input bg-background text-card-foreground rounded-md text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedWidgetId || !customerEmail.trim()}
              className="flex-1 h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  Start Chat
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
