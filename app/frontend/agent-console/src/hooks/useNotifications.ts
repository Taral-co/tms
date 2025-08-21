import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '../lib/api'
import type { Notification, NotificationCount } from '../types/notifications'

interface UseNotificationsOptions {
  pollingInterval?: number
}

interface NotificationState {
  notifications: Notification[]
  count: NotificationCount
  loading: boolean
  error: string | null
}

/**
 * Hook for managing notifications
 * Handles API calls and polling (WebSocket handled separately by chat system)
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pollingInterval = 30000 } = options
  
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    count: { total: -1, unread: 0 },
    loading: true,
    error: null
  })

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isComponentMounted = useRef(true)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (limit = 20, offset = 0) => {
    try {
      console.log('Fetching notifications...', { limit, offset })
      
      // Check if we have required authentication data
      const token = localStorage.getItem('auth_token')
      const tenantId = localStorage.getItem('tenant_id')
      const projectId = localStorage.getItem('project_id')
      
      console.log('Auth data:', { 
        hasToken: !!token, 
        tenantId: tenantId?.slice(0, 8) + '...', 
        projectId: projectId?.slice(0, 8) + '...' 
      })
      
      if (!token || !tenantId || !projectId) {
        throw new Error(`Missing required auth data: ${!token ? 'token ' : ''}${!tenantId ? 'tenantId ' : ''}${!projectId ? 'projectId' : ''}`)
      }
      
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const [notificationsData, countData] = await Promise.all([
        apiClient.getNotifications(limit, offset),
        apiClient.getNotificationCount()
      ])

      console.log('Notifications fetched:', { notificationsData, countData })

      if (isComponentMounted.current) {
        setState(prev => ({
          ...prev,
          notifications: offset === 0 ? (notificationsData.notifications || []) : [...prev.notifications, ...(notificationsData.notifications || [])],
          count: countData,
          loading: false
        }))
      }
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error)
      if (isComponentMounted.current) {
        setState(prev => ({
          ...prev,
          error: error.message || 'Failed to fetch notifications',
          loading: false
        }))
      }
    }
  }, [])

  // Fetch notification count only
  const fetchNotificationCount = useCallback(async () => {
    try {
      const countData = await apiClient.getNotificationCount()
      if (isComponentMounted.current) {
        setState(prev => ({ ...prev, count: countData }))
      }
    } catch (error: any) {
      console.error('Failed to fetch notification count:', error)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId)
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
        count: {
          ...prev.count,
          unread: Math.max(0, prev.count.unread - 1)
        }
      }))
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to mark notification as read' }))
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.markAllNotificationsAsRead()
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
        count: { ...prev.count, unread: 0 }
      }))
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || 'Failed to mark all notifications as read' }))
    }
  }, [])

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (state.loading) return
    await fetchNotifications(20, state.notifications.length)
  }, [state.loading, state.notifications.length, fetchNotifications])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Set up polling
  useEffect(() => {
    if (pollingInterval > 0) {
      pollingIntervalRef.current = setInterval(fetchNotificationCount, pollingInterval)
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    }
  }, [pollingInterval, fetchNotificationCount])

  // Initial load
  useEffect(() => {
    console.log('useNotifications: Initial load effect triggered')
    fetchNotifications()
  }, [fetchNotifications])

  // Cleanup
  useEffect(() => {
    return () => {
      // Only clean up the polling interval, don't set mounted to false
      // as this prevents setState from working when async calls complete
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  return {
    notifications: state.notifications,
    count: state.count,
    loading: state.loading,
    error: state.error,
    
    // Actions
    refresh: fetchNotifications,
    refreshCount: fetchNotificationCount,
    markAsRead,
    markAllAsRead,
    loadMore,
    clearError
  }
}
