import api from '@/lib/api'
import { useState, useEffect, useRef } from 'react'


interface UseCustomerOnlineStatusOptions {
  sessionId?: string
  pollInterval?: number
}

export function useCustomerOnlineStatus({ 
  sessionId, 
  pollInterval = 15000 // 15 seconds
}: UseCustomerOnlineStatusOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchStatus = async () => {
    if (!sessionId) return

    try {
      setLoading(true)
      setError(null)
      
      const tenantId = localStorage.getItem('tenant_id')
      const token = localStorage.getItem('auth_token')
      
      if (!tenantId || !token) {
        throw new Error('Authentication required')
      }

      const response = await api.getClientChatStatus(sessionId)

      if (response.status) {
        setIsOnline(response.status === 'online')
      }

    } catch (err) {
      console.error('Error fetching customer online status:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch customer status')
        setIsOnline(false)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Initial fetch and setup polling
  useEffect(() => {
    if (!sessionId) {
      setIsOnline(false)
      setError(null)
      return
    }

    // Fetch immediately
    fetchStatus()

    // Setup polling
    intervalRef.current = setInterval(fetchStatus, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sessionId, pollInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isOnline,
    loading,
    error,
    refetch: fetchStatus
  }
}
