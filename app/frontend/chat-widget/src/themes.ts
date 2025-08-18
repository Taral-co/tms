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

export function generateWidgetCSS(widget: ChatWidget): string {
  const theme = getWidgetTheme(widget)
  const size = WIDGET_SIZES[widget.widget_size] || WIDGET_SIZES.medium
  const animation = ANIMATIONS[widget.animation_style] || ANIMATIONS.smooth
  const bubbleStyle = BUBBLE_STYLES[widget.chat_bubble_style] || BUBBLE_STYLES.modern

  return `
    :root {
      --tms-primary-color: ${widget.primary_color};
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

    .tms-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      position: fixed;
      ${widget.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: var(--tms-widget-width);
      height: var(--tms-widget-height);
      z-index: 2147483647;
      border-radius: var(--tms-border-radius);
      box-shadow: var(--tms-shadow);
      overflow: hidden;
      background: white;
      transition: var(--tms-animation);
      display: none;
    }

    .tms-widget-container.open {
      display: flex;
      flex-direction: column;
      transform: ${animation.transform};
    }

    .tms-widget-container.opening {
      animation: tms-widget-enter 0.3s ease-out forwards;
    }

    .tms-widget-container.closing {
      animation: tms-widget-exit 0.3s ease-out forwards;
    }

    @keyframes tms-widget-enter {
      from {
        transform: ${animation.entry};
        opacity: 0;
      }
      to {
        transform: ${animation.transform};
        opacity: 1;
      }
    }

    @keyframes tms-widget-exit {
      from {
        transform: ${animation.transform};
        opacity: 1;
      }
      to {
        transform: ${animation.exit};
        opacity: 0;
      }
    }

    .tms-chat-header {
      background: linear-gradient(135deg, var(--tms-primary-color), var(--tms-primary-color));
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: var(--tms-border-radius) var(--tms-border-radius) 0 0;
    }

    .tms-agent-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tms-agent-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .tms-agent-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .tms-message-bubble {
      border-radius: var(--tms-bubble-border-radius);
      padding: var(--tms-bubble-padding);
      max-width: var(--tms-bubble-max-width);
      word-break: break-word;
      line-height: 1.4;
      margin-bottom: 8px;
    }

    .tms-message-bubble.visitor {
      background: var(--tms-primary-color);
      color: white;
      margin-left: auto;
      margin-right: 0;
    }

    .tms-message-bubble.agent {
      background: #f1f5f9;
      color: #334155;
      margin-left: 0;
      margin-right: auto;
    }

    .tms-toggle-button {
      position: fixed;
      ${widget.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      background: var(--tms-primary-color);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--tms-shadow);
      z-index: 2147483647;
      transition: var(--tms-animation);
      border: none;
      outline: none;
    }

    .tms-toggle-button:hover {
      transform: scale(1.05);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .tms-toggle-button:focus {
      outline: 2px solid var(--tms-primary-color);
      outline-offset: 2px;
    }

    .tms-notification-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }

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
