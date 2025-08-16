import { TMSChatWidget } from './widget'
import { ChatWidgetOptions } from './types'

// Global interface extension
declare global {
  interface Window {
    TMSChatWidget: typeof TMSChatWidget
    TMSChatConfig?: ChatWidgetOptions
  }
}

// Auto-initialize if config is present
function autoInit() {
  if (window.TMSChatConfig) {
    new TMSChatWidget(window.TMSChatConfig)
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit)
} else {
  autoInit()
}

// Export for manual initialization
window.TMSChatWidget = TMSChatWidget

export { TMSChatWidget }
export * from './types'
