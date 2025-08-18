# Agent Notification System

## Overview

The TMS Agent Console now includes a comprehensive notification system that alerts agents when new messages arrive from website visitors. The system provides multiple types of notifications to ensure agents never miss important customer communications.

## Features

### 🔊 Audio Notifications
- **Pleasant Notification Sound**: Custom-generated two-tone chime using Web Audio API
- **Fallback Support**: Graceful fallback to basic audio for older browsers
- **Volume Control**: Moderate volume (30%) for non-intrusive alerts
- **User Control**: Toggle button in chat header to enable/disable sounds
- **Persistent Settings**: Sound preference saved in localStorage

### 🖥️ Browser Notifications
- **Desktop Alerts**: Native browser notifications when page is not in focus
- **Smart Triggering**: Only shows when page is hidden/minimized
- **Rich Content**: Displays customer name and message preview
- **Auto-Dismiss**: Notifications auto-close after 5 seconds
- **Click to Focus**: Clicking notification brings window to focus
- **Permission Handling**: Automatic permission request on first user interaction

### 👁️ Visual Indicators
- **Session Flash Effect**: Sessions briefly flash with blue background when new messages arrive
- **Pulse Animation**: Subtle pulsing animation for 2 seconds
- **Auto-Clear**: Flash effect clears when session is selected
- **Real-time Updates**: Visual feedback synchronized with WebSocket messages

### 🎛️ User Controls
- **Sound Toggle**: Volume icon in chat header to enable/disable audio
- **Visual Feedback**: Icon changes between Volume2 and VolumeX
- **Tooltips**: Helpful hover text explaining the function
- **Accessibility**: Proper ARIA labels for screen readers

## Technical Implementation

### Audio System (`notificationSound.ts`)
```typescript
// Pleasant two-tone chime using Web Audio API
const oscillator1 = audioContext.createOscillator()
oscillator1.frequency.value = 800 // C5
const oscillator2 = audioContext.createOscillator() 
oscillator2.frequency.value = 600 // E4
```

### Browser Notifications (`browserNotifications.ts`)
```typescript
const notification = new Notification(title, {
  body: messagePreview,
  icon: '/favicon.ico',
  tag: `chat-${sessionId}`,
  requireInteraction: false
})
```

### Visual Flash Effect
```css
/* CSS classes applied dynamically */
.animate-pulse.bg-primary/10 {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background-color: rgba(primary, 0.1);
}
```

## Usage

### For Agents
1. **Enable Sounds**: Click the volume icon in the chat header to toggle audio notifications
2. **Browser Notifications**: Allow notification permissions when prompted for desktop alerts
3. **Visual Cues**: Watch for sessions that flash blue when new messages arrive
4. **Settings Persistence**: Your sound preference is automatically saved

### For Developers
1. **Import Utilities**:
   ```typescript
   import { notificationSound } from '../utils/notificationSound'
   import { browserNotifications } from '../utils/browserNotifications'
   ```

2. **Play Audio Notification**:
   ```typescript
   notificationSound.play().catch(() => {
     // Handle audio playback failures silently
   })
   ```

3. **Show Browser Notification**:
   ```typescript
   browserNotifications.showMessageNotification({
     customerName: 'John Doe',
     customerEmail: 'john@example.com',
     messagePreview: 'Hello, I need help with...',
     sessionId: 'session-123'
   })
   ```

## Accessibility Features

- **ARIA Labels**: All interactive elements have proper accessibility labels
- **Keyboard Support**: Sound toggle accessible via keyboard navigation
- **Screen Reader Support**: Notifications announced to assistive technologies
- **Visual Alternatives**: Visual flash effects for users who disable sound
- **Permission Respect**: Honors user's browser notification preferences

## Browser Compatibility

### Audio Notifications
- ✅ Modern browsers with Web Audio API support
- ✅ Fallback to HTML5 Audio for older browsers
- ✅ Graceful degradation when audio is blocked

### Browser Notifications
- ✅ Chrome 22+, Firefox 22+, Safari 6+, Edge 14+
- ✅ Requires user permission (auto-requested)
- ✅ Respects user's notification settings

### Visual Effects
- ✅ All modern browsers supporting CSS animations
- ✅ Tailwind CSS pulse animation
- ✅ Hardware-accelerated transitions

## Configuration

### Default Settings
- **Audio Enabled**: True (can be toggled by user)
- **Volume Level**: 30% (moderate, non-intrusive)
- **Flash Duration**: 2 seconds
- **Notification Auto-Dismiss**: 5 seconds

### Customization Options
```typescript
// Adjust notification sound volume
notificationSound.setVolume(0.5) // 50% volume

// Customize flash duration
const FLASH_DURATION = 3000 // 3 seconds

// Modify notification display time
const NOTIFICATION_DURATION = 8000 // 8 seconds
```

## Best Practices

1. **User Experience**:
   - Always provide user control over notifications
   - Use moderate volume levels
   - Implement graceful fallbacks
   - Respect browser permissions

2. **Performance**:
   - Initialize audio context only on user interaction
   - Clean up resources when components unmount
   - Use efficient timeout management
   - Debounce rapid notification events

3. **Accessibility**:
   - Provide multiple notification types (audio, visual, browser)
   - Include proper ARIA labels
   - Support keyboard navigation
   - Announce important events to screen readers

## Troubleshooting

### Audio Not Playing
- Check if browser allows autoplay
- Verify user has interacted with page first
- Ensure sound is enabled in user settings
- Check browser's audio output settings

### Browser Notifications Not Showing
- Verify notification permission is granted
- Check if page is actually hidden/minimized
- Ensure browser supports Notification API
- Verify site is served over HTTPS (required for notifications)

### Visual Effects Not Working
- Check if CSS animations are enabled
- Verify Tailwind CSS is properly loaded
- Ensure component re-renders trigger state updates
- Check browser's reduced motion settings

## Future Enhancements

- **Custom Sound Selection**: Allow agents to choose from different notification sounds
- **Volume Slider**: Fine-grained volume control
- **Notification Scheduling**: Quiet hours and do-not-disturb modes
- **Message Categories**: Different sounds for different message types
- **Team Notifications**: Alerts for team mentions or urgent messages
- **Mobile Optimization**: Enhanced notifications for mobile devices
