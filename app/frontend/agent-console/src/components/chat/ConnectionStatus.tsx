import React from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  error?: string | null
  selectedSession?: any
}

export const ConnectionStatus = React.memo(function ConnectionStatus({ isConnected, isConnecting, error, selectedSession }: ConnectionStatusProps) {
  if (!selectedSession) return null

  if (isConnected) {
    return (
      <div className="flex items-center gap-1 text-success" title="Real-time connection active">
        <Wifi className="w-3 h-3" />
        <span className="text-xs">Live</span>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-1 text-warning" title="Connecting to real-time updates...">
        <WifiOff className="w-3 h-3 animate-pulse" />
        <span className="text-xs">Connecting...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-1 text-destructive" title={error}>
        <WifiOff className="w-3 h-3" />
        <span className="text-xs">Error</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-muted-foreground" title="Disconnected from real-time updates">
      <WifiOff className="w-3 h-3" />
      <span className="text-xs">Offline</span>
    </div>
  )
})
