/**
 * Browser notification utility for chat messages
 * Handles desktop notifications when the page is not in focus
 */

class BrowserNotifications {
  private permission: NotificationPermission = 'default'
  private isEnabled: boolean = false

  constructor() {
    this.checkPermission()
    this.requestPermissionOnUserAction()
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission
      this.isEnabled = this.permission === 'granted'
    }
  }

  private requestPermissionOnUserAction() {
    // Auto-request permission on first user interaction
    const requestPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission()
          this.permission = permission
          this.isEnabled = permission === 'granted'
        } catch (error) {
          console.warn('Notification permission request failed:', error)
        }
      }
      
      // Remove listeners after first interaction
      document.removeEventListener('click', requestPermission)
      document.removeEventListener('keydown', requestPermission)
    }

    document.addEventListener('click', requestPermission, { once: true })
    document.addEventListener('keydown', requestPermission, { once: true })
  }

  /**
   * Show a browser notification for new chat message
   */
  async showMessageNotification(options: {
    customerName?: string
    customerEmail?: string
    messagePreview: string
    sessionId: string
  }): Promise<void> {
    // Only show notifications if page is not visible and permission is granted
    if (!this.isEnabled || !document.hidden) {
      return
    }

    try {
      const customerDisplay = options.customerName || options.customerEmail || 'Unknown Customer'
      const title = `New message from ${customerDisplay}`
      const body = options.messagePreview.length > 100 
        ? `${options.messagePreview.substring(0, 100)}...`
        : options.messagePreview

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico', // Add your app icon here
        badge: '/favicon.ico',
        tag: `chat-${options.sessionId}`, // Prevents multiple notifications for same session
        requireInteraction: false, // Auto-dismiss after a few seconds
        silent: false // Allow sound (controlled by browser settings)
      })

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Focus the window when notification is clicked
      notification.onclick = () => {
        window.focus()
        notification.close()
        
        // Could dispatch a custom event here to navigate to the specific session
        window.dispatchEvent(new CustomEvent('notification-click', {
          detail: { sessionId: options.sessionId }
        }))
      }

    } catch (error) {
      console.warn('Failed to show notification:', error)
    }
  }

  /**
   * Request notification permission explicitly
   */
  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        this.permission = permission
        this.isEnabled = permission === 'granted'
        return permission
      } catch (error) {
        console.warn('Notification permission request failed:', error)
        return 'denied'
      }
    }
    return 'denied'
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window
  }

  /**
   * Check if notifications are enabled
   */
  isNotificationEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission
  }
}

// Create a singleton instance
export const browserNotifications = new BrowserNotifications()
