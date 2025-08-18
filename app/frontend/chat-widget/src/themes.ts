// Widget themes and styling system
import type { WidgetTheme, ChatWidget } from './types'

export const WIDGET_THEMES: Record<string, WidgetTheme> = {
  rounded: {
    name: 'Rounded',
    shape: 'rounded',
    description: 'Friendly and approachable with soft rounded corners',
    preview: '🔵 Modern & friendly',
    borderRadius: '16px',
    shadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    animation: 'smooth',
    layout: 'standard'
  },
  square: {
    name: 'Square',
    shape: 'square',
    description: 'Clean and professional with sharp edges',
    preview: '⬛ Professional & clean',
    borderRadius: '4px',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    animation: 'fade',
    layout: 'standard'
  },
  minimal: {
    name: 'Minimal',
    shape: 'minimal',
    description: 'Ultra-clean design with minimal visual elements',
    preview: '⚪ Simple & clean',
    borderRadius: '8px',
    shadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
    animation: 'fade',
    layout: 'compact'
  },
  professional: {
    name: 'Professional',
    shape: 'professional',
    description: 'Enterprise-grade appearance for business use',
    preview: '🏢 Enterprise & formal',
    borderRadius: '6px',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.1)',
    animation: 'slide',
    layout: 'spacious'
  },
  modern: {
    name: 'Modern',
    shape: 'modern',
    description: 'Contemporary design with subtle gradients',
    preview: '✨ Contemporary & sleek',
    borderRadius: '12px',
    shadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    animation: 'bounce',
    layout: 'standard'
  },
  classic: {
    name: 'Classic',
    shape: 'classic',
    description: 'Traditional chat widget with timeless design',
    preview: '📝 Traditional & reliable',
    borderRadius: '20px',
    shadow: '0 5px 25px rgba(0, 0, 0, 0.2)',
    animation: 'smooth',
    layout: 'standard'
  }
}

export const WIDGET_SIZES = {
  small: { width: '300px', height: '400px' },
  medium: { width: '350px', height: '500px' },
  large: { width: '400px', height: '600px' }
}

export const ANIMATIONS = {
  smooth: {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(0)',
    entry: 'translateY(20px)',
    exit: 'translateY(100%)'
  },
  bounce: {
    transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    transform: 'scale(1)',
    entry: 'scale(0.8)',
    exit: 'scale(0.8) translateY(100%)'
  },
  fade: {
    transition: 'all 0.2s ease-in-out',
    transform: 'opacity(1)',
    entry: 'opacity(0)',
    exit: 'opacity(0)'
  },
  slide: {
    transition: 'all 0.4s ease-out',
    transform: 'translateX(0)',
    entry: 'translateX(100%)',
    exit: 'translateX(100%)'
  }
}

export const BUBBLE_STYLES = {
  modern: {
    borderRadius: '18px 18px 4px 18px',
    padding: '12px 16px',
    maxWidth: '75%',
    wordBreak: 'break-word',
    lineHeight: '1.4'
  },
  classic: {
    borderRadius: '20px',
    padding: '10px 14px',
    maxWidth: '70%',
    wordBreak: 'break-word',
    lineHeight: '1.5'
  },
  minimal: {
    borderRadius: '8px',
    padding: '8px 12px',
    maxWidth: '80%',
    wordBreak: 'break-word',
    lineHeight: '1.3'
  },
  rounded: {
    borderRadius: '25px',
    padding: '12px 18px',
    maxWidth: '75%',
    wordBreak: 'break-word',
    lineHeight: '1.4'
  }
}

export function getWidgetTheme(widget: ChatWidget): WidgetTheme {
  return WIDGET_THEMES[widget.widget_shape] || WIDGET_THEMES.rounded
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '59, 130, 246' // Default blue RGB
  
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  
  return `${r}, ${g}, ${b}`
}

export function generateWidgetCSS(widget: ChatWidget): string {
  const theme = getWidgetTheme(widget)
  const size = WIDGET_SIZES[widget.widget_size] || WIDGET_SIZES.medium
  const animation = ANIMATIONS[widget.animation_style] || ANIMATIONS.smooth
  const bubbleStyle = BUBBLE_STYLES[widget.chat_bubble_style] || BUBBLE_STYLES.modern

  return `
    :root {
      --tms-primary-color: ${widget.primary_color};
      --tms-primary-color-rgb: ${hexToRgb(widget.primary_color)};
      --tms-secondary-color: ${widget.secondary_color || '#6b7280'};
      --tms-widget-width: ${size.width};
      --tms-widget-height: ${size.height};
      --tms-border-radius: ${theme.borderRadius};
      --tms-shadow: ${theme.shadow};
      --tms-animation: ${animation.transition};
      --tms-bubble-border-radius: ${bubbleStyle.borderRadius};
      --tms-bubble-padding: ${bubbleStyle.padding};
      --tms-bubble-max-width: ${bubbleStyle.maxWidth};
    }

    /* Main Widget Container */
    .tms-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      position: fixed;
      ${widget.position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
      bottom: 96px;
      width: var(--tms-widget-width);
      height: var(--tms-widget-height);
      z-index: 2147483647;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05);
      overflow: hidden;
      background: #ffffff;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: none;
      flex-direction: column;
      backdrop-filter: blur(20px);
    }

    .tms-widget-container.open {
      display: flex;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .tms-widget-container.opening {
      animation: tms-widget-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .tms-widget-container.closing {
      animation: tms-widget-exit 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    @keyframes tms-widget-enter {
      0% {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes tms-widget-exit {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
    }

    /* Header Section */
    .tms-chat-header {
      background: linear-gradient(135deg, var(--tms-primary-color) 0%, color-mix(in srgb, var(--tms-primary-color) 85%, #000) 100%);
      color: white;
      padding: 20px 20px 18px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      box-shadow: 0 4px 12px rgba(var(--tms-primary-color-rgb), 0.15);
    }

    .tms-chat-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    }

    .tms-agent-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .tms-agent-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
    }

    .tms-agent-avatar::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transform: rotate(45deg);
      animation: avatar-shine 3s infinite;
    }

    @keyframes avatar-shine {
      0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
      50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }

    .tms-agent-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      position: relative;
      z-index: 1;
    }

    .tms-agent-details {
      flex: 1;
      min-width: 0;
    }

    .tms-agent-name {
      font-weight: 600;
      font-size: 16px;
      margin: 0 0 2px 0;
      color: white;
      line-height: 1.2;
    }

    .tms-agent-status {
      font-size: 13px;
      opacity: 0.9;
      color: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tms-status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .tms-header-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 300;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .tms-header-close:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .tms-header-close:active {
      transform: scale(0.95);
    }

    /* Messages Area */
    .tms-chat-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #fafbfc;
      min-height: 0;
    }

    .tms-messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px 12px 16px;
      scroll-behavior: smooth;
    }

    .tms-messages-container::-webkit-scrollbar {
      width: 4px;
    }

    .tms-messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .tms-messages-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 2px;
    }

    .tms-messages-container::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.2);
    }

    /* Message Bubbles */
    .tms-message-wrapper {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }

    .tms-message-wrapper.visitor {
      align-items: flex-end;
    }

    .tms-message-wrapper.agent {
      align-items: flex-start;
    }

    .tms-message-bubble {
      position: relative;
      border-radius: 18px;
      padding: 12px 16px;
      max-width: 280px;
      word-wrap: break-word;
      line-height: 1.4;
      font-size: 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      animation: message-appear 0.3s ease-out;
    }

    @keyframes message-appear {
      0% {
        opacity: 0;
        transform: translateY(10px) scale(0.9);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .tms-message-bubble.visitor {
      background: linear-gradient(135deg, var(--tms-primary-color) 0%, color-mix(in srgb, var(--tms-primary-color) 90%, #000) 100%);
      color: white;
      border-bottom-right-radius: 6px;
    }

    .tms-message-bubble.agent {
      background: white;
      color: #374151;
      border-bottom-left-radius: 6px;
      border: 1px solid #e5e7eb;
    }

    .tms-message-bubble.system {
      background: #f3f4f6;
      color: #6b7280;
      font-style: italic;
      text-align: center;
      border-radius: 12px;
      font-size: 13px;
      max-width: 100%;
    }

    .tms-message-time {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 4px;
      padding: 0 4px;
    }

    .tms-message-wrapper.visitor .tms-message-time {
      text-align: right;
      color: #6b7280;
    }

    .tms-message-wrapper.agent .tms-message-time {
      text-align: left;
      color: #9ca3af;
    }

    /* Typing Indicator */
    .tms-typing-indicator {
      padding: 8px 16px;
      font-size: 13px;
      color: #6b7280;
      font-style: italic;
      min-height: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tms-typing-dots {
      display: flex;
      gap: 2px;
    }

    .tms-typing-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typing-bounce 1.4s infinite ease-in-out;
    }

    .tms-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .tms-typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes typing-bounce {
      0%, 80%, 100% { 
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% { 
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Input Area */
    .tms-input-area {
      background: white;
      border-top: 1px solid #e5e7eb;
      padding: 16px;
    }

    .tms-input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      padding: 8px;
      transition: all 0.2s ease;
    }

    .tms-input-wrapper:focus-within {
      border-color: var(--tms-primary-color);
      box-shadow: 0 0 0 3px rgba(var(--tms-primary-color-rgb), 0.1);
    }

    .tms-file-upload-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f3f4f6;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #6b7280;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .tms-file-upload-btn:hover {
      background: #e5e7eb;
      color: var(--tms-primary-color);
    }

    .tms-message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      font-family: inherit;
      color: #374151;
      resize: none;
      min-height: 20px;
      max-height: 100px;
      line-height: 1.4;
      padding: 8px 12px;
    }

    .tms-message-input::placeholder {
      color: #9ca3af;
    }

    .tms-send-button {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--tms-primary-color);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .tms-send-button:hover {
      background: color-mix(in srgb, var(--tms-primary-color) 90%, #000);
      transform: scale(1.05);
    }

    .tms-send-button:active {
      transform: scale(0.95);
    }

    .tms-send-button:disabled {
      background: #d1d5db;
      cursor: not-allowed;
      transform: none;
    }

    /* Powered By */
    .tms-powered-by {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #9ca3af;
      background: #fafbfc;
    }

    /* Toggle Button */
    .tms-toggle-button {
      position: fixed;
      ${widget.position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
      bottom: 24px;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, var(--tms-primary-color) 0%, color-mix(in srgb, var(--tms-primary-color) 85%, #000) 100%);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 25px rgba(var(--tms-primary-color-rgb), 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2147483647;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      outline: none;
      color: white;
      font-size: 24px;
    }

    .tms-toggle-button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 12px 35px rgba(var(--tms-primary-color-rgb), 0.4), 0 8px 20px rgba(0, 0, 0, 0.2);
    }

    .tms-toggle-button:active {
      transform: translateY(0) scale(1.02);
    }

    .tms-toggle-button:focus {
      outline: 3px solid rgba(var(--tms-primary-color-rgb), 0.3);
      outline-offset: 2px;
    }

    .tms-toggle-button svg {
      width: 28px;
      height: 28px;
      transition: all 0.2s ease;
    }

    .tms-toggle-button:hover svg {
      transform: scale(1.1);
    }

    /* Notification Badge */
    .tms-notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      min-width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      border: 2px solid white;
      animation: badge-bounce 0.5s ease-out;
    }

    @keyframes badge-bounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    /* Mobile Responsiveness */
    @media (max-width: 480px) {
      .tms-widget-container {
        ${widget.position === 'bottom-right' ? 'right: 16px;' : 'left: 16px;'}
        bottom: 80px;
        width: calc(100vw - 32px);
        max-width: 360px;
        height: 500px;
      }

      .tms-toggle-button {
        ${widget.position === 'bottom-right' ? 'right: 16px;' : 'left: 16px;'}
        bottom: 16px;
        width: 56px;
        height: 56px;
      }

      .tms-chat-header {
        padding: 16px;
      }

      .tms-agent-avatar {
        width: 36px;
        height: 36px;
      }

      .tms-message-bubble {
        max-width: 240px;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .tms-widget-container {
        background: #1f2937;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      }

      .tms-chat-body {
        background: #111827;
      }

      .tms-message-bubble.agent {
        background: #374151;
        color: #f9fafb;
        border-color: #4b5563;
      }

      .tms-input-area {
        background: #1f2937;
        border-color: #374151;
      }

      .tms-input-wrapper {
        background: #374151;
        border-color: #4b5563;
      }

      .tms-message-input {
        color: #f9fafb;
      }

      .tms-powered-by {
        background: #111827;
        color: #6b7280;
      }
    }

    /* Custom CSS */
    ${widget.custom_css || ''}
  `
}

export function injectWidgetCSS(widget: ChatWidget): void {
  const existingStyle = document.getElementById('tms-widget-styles')
  if (existingStyle) {
    existingStyle.remove()
  }

  const style = document.createElement('style')
  style.id = 'tms-widget-styles'
  style.textContent = generateWidgetCSS(widget)
  document.head.appendChild(style)
}

export function playNotificationSound(type: 'message' | 'notification' | 'error', enabled: boolean = true): void {
  if (!enabled) return

  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)

    // Different sounds for different events
    const frequencies = {
      message: [800, 600],
      notification: [600, 800],
      error: [300, 200]
    }

    const [freq1, freq2] = frequencies[type]
    
    oscillator.frequency.setValueAtTime(freq1, context.currentTime)
    oscillator.frequency.setValueAtTime(freq2, context.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
    
    oscillator.start(context.currentTime)
    oscillator.stop(context.currentTime + 0.2)
  } catch (error) {
    console.debug('Audio notification not available:', error)
  }
}
