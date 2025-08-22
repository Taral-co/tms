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

// Helper function to get RGB values as numbers
function hexToRgbNumbers(hex: string): { r: number, g: number, b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 59, g: 130, b: 246 } // Default blue
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

// Calculate luminance to determine if color is light or dark
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// Generate placeholder color that's complementary to background
function generatePlaceholderColor(backgroundColor: string, secondaryColor: string): string {
  const bgRgb = hexToRgbNumbers(backgroundColor)
  
  // Calculate background luminance
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b)
  
  // If background is dark, make placeholder lighter; if light, make darker
  if (bgLuminance < 0.5) {
    // Dark background - blend more white for visibility
    return `color-mix(in srgb, ${secondaryColor} 60%, #ffffff 40%)`
  } else {
    // Light background - blend more black for visibility
    return `color-mix(in srgb, ${secondaryColor} 65%, #000000 35%)`
  }
}

export function generateWidgetCSS(widget: ChatWidget): string {
  const theme = getWidgetTheme(widget)
  const size = WIDGET_SIZES[widget.widget_size] || WIDGET_SIZES.medium
  const animation = ANIMATIONS[widget.animation_style] || ANIMATIONS.smooth
  const bubbleStyle = BUBBLE_STYLES[widget.chat_bubble_style] || BUBBLE_STYLES.modern

  // Generate dynamic placeholder color
  const placeholderColor = generatePlaceholderColor(
    widget.background_color || '#ffffff',
    widget.secondary_color || '#6b7280'
  )

  return `
    :root {
      --tms-primary-color: ${widget.primary_color};
      --tms-primary-color-rgb: ${hexToRgb(widget.primary_color)};
      --tms-secondary-color: ${widget.secondary_color || '#6b7280'};
      --tms-secondary-color-rgb: ${hexToRgb(widget.secondary_color || '#6b7280')};
      --tms-background-color: ${widget.background_color || '#ffffff'};
      --tms-background-color-rgb: ${hexToRgb(widget.background_color || '#ffffff')};
      --tms-placeholder-color: ${placeholderColor};
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
      background: var(--tms-background-color);
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
      background: var(--tms-background-color);
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
      background: var(--tms-secondary-color);
      color: color-mix(in srgb, var(--tms-secondary-color) 15%, #000);
      border-bottom-left-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--tms-secondary-color) 80%, #fff);
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
      background: transparent;
      border-top: 1px solid rgba(var(--tms-secondary-color-rgb), 0.2);
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 100px; /* Ensure adequate space for input */
  /* Keep input area anchored at the bottom while header stays static */
  margin-top: auto;
    }

    .tms-input-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tms-input-wrapper {
      flex: 1;
      display: flex;
      background: var(--tms-background-color);
      border-top: 2px solid rgba(var(--tms-secondary-color-rgb), 0.8);
      padding: 8px 12px;
      transition: all 0.2s ease;
    }

    .tms-input-wrapper:focus-within {
      /* border: 2px solid color-mix(in srgb, var(--tms-secondary-color) 100%, var(--tms-background-color)); */
      /* Use a subtle ring mixed from background and black for better theme contrast */
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--tms-background-color) 95%, #000 5%)
    }

    .tms-file-upload-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(var(--tms-secondary-color-rgb), 0.1);
      border: 1px solid rgba(var(--tms-secondary-color-rgb), 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: rgba(var(--tms-secondary-color-rgb), 0.7);
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .tms-file-upload-btn:hover {
      background: rgba(var(--tms-secondary-color-rgb), 0.15);
      color: var(--tms-primary-color);
      border-color: var(--tms-primary-color);
    }

    .tms-message-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      font-family: inherit;
      /* min-height: 60px;  Larger input area  */
      max-height: 120px;
      line-height: 1.5;
      padding: 4px 0;
      overflow-y: auto;
      resize: none;
    }

    /* Enhanced placeholder visibility with complementary colors */
    .tms-editable:empty:before {
      content: attr(data-placeholder);
      color: var(--tms-placeholder-color);
      pointer-events: none;
      font-style: italic;
      opacity: 0.8;
    }

    /* Reactions */
    .tms-reaction-group { 
      display: flex; 
      gap: 6px; 
      margin-left: auto; /* push reactions to the right */
      justify-content: flex-end; /* ensure buttons are right-aligned */
      align-items: center;
    }
    
    .tms-thumb-button {
      width: 32px; 
      height: 32px; 
      border-radius: 50%;
      border: 1px solid rgba(var(--tms-secondary-color-rgb), 0.3);
      background: rgba(var(--tms-secondary-color-rgb), 0.08);
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      transition: all 0.2s ease; 
      flex-shrink: 0; 
      font-size: 14px;
      color: rgba(var(--tms-secondary-color-rgb), 0.6);
    }
    
    .tms-thumb-button:hover { 
      color: var(--tms-primary-color); 
      border-color: var(--tms-primary-color);
      background: rgba(var(--tms-primary-color-rgb), 0.1);
      transform: scale(1.05);
    }

    .tms-thumb-button:active {
      transform: scale(0.95);
    }
    
    /* Thumb animation */
    .tms-thumb-animate {
      animation: thumb-bounce 0.6s ease-out;
      background: var(--tms-primary-color) !important;
      color: white !important;
      border-color: var(--tms-primary-color) !important;
    }
    
    @keyframes thumb-bounce {
      0% { transform: scale(1); }
      30% { transform: scale(1.3) rotate(10deg); }
      60% { transform: scale(1.1) rotate(-5deg); }
      100% { transform: scale(1) rotate(0deg); }
    }

    /* Powered By */
    .tms-powered-by {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #9ca3af;
    }

    /* Visitor Info Form */
    .tms-visitor-info-form {
      padding: 20px 16px;
      background: var(--tms-background-color);
      border-bottom: 1px solid color-mix(in srgb, var(--tms-secondary-color) 20%, var(--tms-background-color));
    }

    .tms-visitor-info-title {
      font-size: 16px;
      font-weight: 600;
      color: color-mix(in srgb, var(--tms-secondary-color) 15%, #000);
      margin: 0 0 8px 0;
      text-align: center;
    }

    .tms-visitor-info-subtitle {
      font-size: 14px;
      color: color-mix(in srgb, var(--tms-secondary-color) 40%, #000);
      margin: 0 0 16px 0;
      text-align: center;
      line-height: 1.4;
    }

    .tms-visitor-form-field {
      margin-bottom: 12px;
    }

    .tms-visitor-form-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: color-mix(in srgb, var(--tms-secondary-color) 20%, #000);
      margin-bottom: 4px;
    }

    .tms-visitor-form-input {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid color-mix(in srgb, var(--tms-secondary-color) 100%, var(--tms-background-color));
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: var(--tms-background-color);
      color: color-mix(in srgb, var(--tms-secondary-color) 20%, #000);
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .tms-visitor-form-input:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(var(--tms-primary-color-rgb), 0.15);
    }

    .tms-visitor-form-input::placeholder {
      color: var(--tms-placeholder-color);
      opacity: 0.8;
    }

    .tms-visitor-form-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .tms-visitor-form-button {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .tms-visitor-form-button.primary {
      background: var(--tms-primary-color);
      color: white;
    }

    .tms-visitor-form-button.primary:hover {
      background: color-mix(in srgb, var(--tms-primary-color) 90%, #000);
      transform: translateY(-1px);
    }

    .tms-visitor-form-button.primary:active {
      transform: translateY(0);
    }

    .tms-visitor-form-button.secondary {
      background: color-mix(in srgb, var(--tms-secondary-color) 15%, var(--tms-background-color));
      color: color-mix(in srgb, var(--tms-secondary-color) 20%, #000);
      border: 1px solid color-mix(in srgb, var(--tms-secondary-color) 100%, var(--tms-background-color));
    }

    .tms-visitor-form-button.secondary:hover {
      background: color-mix(in srgb, var(--tms-secondary-color) 20%, var(--tms-background-color));
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

    /* External Powered By badge (outside container) */
    .tms-powered-badge {
      position: fixed;
      bottom: 96px; /* Above toggle button */
      ${widget.position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 999px;
      text-decoration: none;
      z-index: 2147483646;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      opacity: 0.8;
    }

    .tms-powered-badge:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.8);
    }
    
    .tms-powered-badge.open { 
      bottom: ${parseInt(size.height) + 120}px; /* Above open widget */
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

      .tms-powered-badge { 
        bottom: 80px; 
        ${widget.position === 'bottom-right' ? 'right: 16px;' : 'left: 16px;'}
      }
      
      .tms-powered-badge.open { 
        bottom: 580px; /* Above mobile widget */
      }
    }

    /* Dark mode support */
    
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
