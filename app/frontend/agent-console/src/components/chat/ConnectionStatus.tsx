import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  error?: string | null
  selectedSession?: any
  variant?: 'sm' | 'md' | 'lg'
}

export const ConnectionStatus = React.memo(function ConnectionStatus({ 
  isConnected, 
  isConnecting, 
  error, 
  selectedSession, 
  variant = 'sm',
}: ConnectionStatusProps) {


  if (!selectedSession) return null

  // Define sizes based on variant
  const sizes = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', gap: 'gap-1', dot: 'w-2 h-2' },
    md: { icon: 'w-4 h-4', text: 'text-sm', gap: 'gap-1.5', dot: 'w-2.5 h-2.5' },
    lg: { icon: 'w-5 h-5', text: 'text-sm', gap: 'gap-2', dot: 'w-3 h-3' }
  }

  const { icon: iconSize, text: textSize, gap } = sizes[variant]


  // Original WebSocket connection status
  if (isConnected) {
    return (
      <div className={`flex items-center ${gap} text-success`} title="Real-time connection active">
        <Wifi className={iconSize} />
        <span className={textSize}>Live</span>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className={`flex items-center ${gap} text-warning`} title="Connecting to real-time updates...">
        <WifiOff className={`${iconSize} animate-pulse`} />
        <span className={textSize}>Connecting...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center ${gap} text-destructive`} title={error}>
        <WifiOff className={iconSize} />
        <span className={textSize}>Error</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center ${gap} text-muted-foreground`} title="Disconnected from real-time updates">
      <WifiOff className={iconSize} />
      <span className={textSize}>Offline</span>
    </div>
  )
})
