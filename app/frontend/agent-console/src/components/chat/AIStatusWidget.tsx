import { useState, useEffect } from 'react'
import { Bot, Brain, AlertCircle, CheckCircle } from 'lucide-react'
import { apiClient } from '../../lib/api'
import type { AIStatus, AICapabilities } from '../../types/chat'

interface AIStatusWidgetProps {
  className?: string
  useAI?: boolean
}

export function AIStatusWidget({ className = '', useAI = false }: AIStatusWidgetProps) {
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAIInfo = async () => {
      try {
        setLoading(true)
        const [capabilitiesResponse] = await Promise.all([
          apiClient.getAICapabilities()
        ])
        setCapabilities(capabilitiesResponse)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch AI information:', err)
        setError('Failed to load AI status')
      } finally {
        setLoading(false)
      }
    }

    fetchAIInfo()
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted ${className}`}>
        <Bot className="h-4 w-4 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Loading AI status...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 ${className}`}>
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">{error}</span>
      </div>
    )
  }

  if (!useAI) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted ${className}`}>
        <Bot className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">AI Assistant disabled</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          AI Assistant Active
        </p>
      </div>
      {capabilities && (
        <div className="text-xs text-blue-600 dark:text-blue-400">
          <span title={`Features: ${capabilities.features.join(', ')}`}>
            {capabilities.features.length} features
          </span>
        </div>
      )}
    </div>
  )
}
