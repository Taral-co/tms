import { createContext, useContext, ReactNode } from 'react'
import { useNotifications } from '../hooks/useNotifications'

type NotificationContextType = ReturnType<typeof useNotifications>

const NotificationContext = createContext<NotificationContextType | null>(null)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notificationApi = useNotifications()

  return (
    <NotificationContext.Provider value={notificationApi}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}

// Export for backward compatibility
export { useNotifications }
