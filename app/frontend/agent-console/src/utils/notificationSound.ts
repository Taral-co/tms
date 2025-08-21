/**
 * Notification sound utility for chat messages
 * Creates a pleasant notification sound using Web Audio API
 */

class NotificationSound {
  private audioContext: AudioContext | null = null
  private isEnabled: boolean = true
  private unlocked: boolean = false

  constructor() {
    // Initialize audio context on first user interaction
    this.initializeAudioContext()
  }

  private initializeAudioContext() {
    try {
      // Create audio context when needed (after user interaction)
      if (!this.audioContext && (window.AudioContext || (window as any).webkitAudioContext)) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        this.unlocked = this.audioContext.state !== 'suspended'
      }
    } catch (error) {
      console.warn('AudioContext not supported:', error)
    }
  }

  /**
   * Play a pleasant notification sound
   */
  async play(): Promise<void> {
    if (!this.isEnabled) return

    try {
      // Ensure audio context is initialized and resumed
      if (!this.audioContext) {
        this.initializeAudioContext()
      }

      if (!this.audioContext) {
        // Fallback to simple beep
        this.playFallbackSound()
        return
      }

      if (this.audioContext.state === 'suspended') {
        // If not yet unlocked by a gesture, don't spam resume calls
        if (!this.unlocked) {
          throw new Error('AudioContext suspended until user gesture')
        }
        await this.audioContext.resume()
      }

      // Create a pleasant notification sound (two-tone chime)
      this.createNotificationTone()
      this.unlocked = true
  } catch (_error) {
      // Avoid noisy warnings for autoplay policy; log once at debug level
      // console.debug('Audio playback not allowed yet:', error)
      // No fallback to avoid repeated autoplay warnings; will work after a user gesture
    }
  }

  private createNotificationTone() {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    
    // Create gain node for volume control
    const gainNode = this.audioContext.createGain()
    gainNode.connect(this.audioContext.destination)
    
    // First tone (higher pitch)
    const oscillator1 = this.audioContext.createOscillator()
    oscillator1.connect(gainNode)
    oscillator1.frequency.value = 800 // C5
    oscillator1.type = 'sine'
    
    // Second tone (lower pitch)
    const oscillator2 = this.audioContext.createOscillator()
    oscillator2.connect(gainNode)
    oscillator2.frequency.value = 600 // E4
    oscillator2.type = 'sine'
    
    // Volume envelope for smooth sound
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01) // Quick attack
    gainNode.gain.linearRampToValueAtTime(0.05, now + 0.1)  // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3)     // Release
    
    // Play first tone
    oscillator1.start(now)
    oscillator1.stop(now + 0.15)
    
    // Play second tone slightly delayed
    oscillator2.start(now + 0.05)
    oscillator2.stop(now + 0.3)
  }

  private playFallbackSound() {
    // Fallback: create a simple audio element with data URI
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBziR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzyU3PLWeSsF')
      audio.volume = 0.2
      audio.play().catch(() => {
        // Silently fail if audio playback is blocked
      })
    } catch (_error) {
      // Silently fail
    }
  }

  /**
   * Enable or disable notification sounds
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  /**
   * Mark audio as unlocked after any user gesture to allow playback
   */
  unlock() {
    this.unlocked = true
    if (!this.audioContext) this.initializeAudioContext()
    if (this.audioContext && this.audioContext.state === 'suspended') {
      // Try once on unlock
      this.audioContext.resume().catch(() => {})
    }
  }

  /**
   * Check if notification sounds are enabled
   */
  isNotificationEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Clean up audio context
   */
  destroy() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Create a singleton instance
export const notificationSound = new NotificationSound()

// Auto-initialize on first user interaction
const initializeOnUserInteraction = () => {
  notificationSound.unlock()
  
  // Remove listeners after first interaction
  document.removeEventListener('click', initializeOnUserInteraction)
  document.removeEventListener('keydown', initializeOnUserInteraction)
  document.removeEventListener('touchstart', initializeOnUserInteraction)
}

// Add listeners for first user interaction
document.addEventListener('click', initializeOnUserInteraction, { once: true })
document.addEventListener('keydown', initializeOnUserInteraction, { once: true })
document.addEventListener('touchstart', initializeOnUserInteraction, { once: true })
