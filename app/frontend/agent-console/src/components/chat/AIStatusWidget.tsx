import { useState, useEffect } from 'react'
import { Bot, Brain, AlertCircle, CheckCircle, Zap } from 'lucide-react'
import { apiClient } from '../../lib/api'
import type { AIStatus, AICapabilities } from '../../types/chat'

interface AIStatusWidgetProps {
  className?: string
  useAI?: boolean
  variant?: 'full' | 'compact' | 'minimal'
}

export function AIStatusWidget({ 
  className = '', 
  useAI = false, 
  variant = 'full' 
}: AIStatusWidgetProps) {
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

  // Minimal variant - just a small indicator
  if (variant === 'minimal') {
    if (!useAI) return null
    
    return (
      <div 
        className={`inline-flex items-center gap-1.5 ${className}`}
        role="status"
        aria-label="AI assistant status"
      >
        <div className="relative">
          <Brain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {!loading && !error && (
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border border-background" />
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground">AI</span>
      </div>
    )
  }

  // Compact variant - single line
  if (variant === 'compact') {
    if (loading) {
      return (
        <div className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
          <Bot className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          <span>Loading...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div 
          className={`inline-flex items-center gap-2 text-xs text-destructive ${className}`}
          role="alert"
          aria-label={`AI assistant error: ${error}`}
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>AI Error</span>
        </div>
      )
    }

    if (!useAI) {
      return (
        <div 
          className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className}`}
          role="status"
          aria-label="AI assistant disabled"
        >
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
          <span>AI Off</span>
        </div>
      )
    }

    return (
      <div 
        className={`inline-flex items-center gap-2 text-xs text-primary ${className}`}
        role="status"
        aria-label={`AI assistant active with ${capabilities?.features.length || 0} features`}
      >
        <div className="relative">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" />
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full" />
        </div>
        <span className="font-medium">AI Active</span>
      </div>
    )
  }

  // Full variant - the enterprise card layout
  if (loading) {
    return (
      <div 
        className={`flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-card transition-colors ${className}`}
        role="status"
        aria-label="Loading AI assistant status"
      >
        <Bot className="h-4 w-4 text-muted-foreground animate-pulse" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">Loading AI status...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className={`flex items-center gap-3 px-3 py-2.5 border border-destructive/20 rounded-md bg-destructive/5 transition-colors ${className}`}
        role="alert"
        aria-label={`AI assistant error: ${error}`}
      >
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-destructive">AI Assistant Error</div>
          <div className="text-xs text-destructive/80 mt-0.5">{error}</div>
        </div>
      </div>
    )
  }

  if (!useAI) {
    return (
      <div 
        className={`flex items-center gap-3 px-3 py-2.5 border border-border rounded-md bg-muted/30 transition-colors ${className}`}
        role="status"
        aria-label="AI assistant disabled for this session"
      >
        <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-muted-foreground">AI Assistant</div>
          <div className="text-xs text-muted-foreground/80 mt-0.5">Disabled for this session</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`flex items-center gap-3 px-3 py-2.5 border border-primary/20 rounded-md bg-primary/5 transition-colors hover:bg-primary/10 ${className}`}
      role="status"
      aria-label={`AI assistant active with ${capabilities?.features.length || 0} features available`}
    >
      <div className="relative flex-shrink-0">
        <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full border border-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">AI Assistant</span>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Active
          </div>
        </div>
        {capabilities && capabilities.features.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Zap className="h-3 w-3 text-primary/60" aria-hidden="true" />
            <span 
              className="text-xs text-muted-foreground"
              title={`Available features: ${capabilities.features.join(', ')}`}
            >
              {capabilities.features.length} feature{capabilities.features.length !== 1 ? 's' : ''} available
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
