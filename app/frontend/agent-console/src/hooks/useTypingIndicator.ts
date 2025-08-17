import { useRef, useCallback } from 'react'

interface UseTypingIndicatorOptions {
  onTypingStart: () => void
  onTypingStop: () => void
  debounceMs?: number
}

/**
 * Enterprise hook for managing typing indicators with proper debouncing
 * Follows accessibility guidelines and performance best practices
 */
export function useTypingIndicator({ 
  onTypingStart, 
  onTypingStop, 
  debounceMs = 1000 
}: UseTypingIndicatorOptions) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTypingStart()
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        onTypingStop()
      }
    }, debounceMs)
  }, [onTypingStart, onTypingStop, debounceMs])

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    
    if (isTypingRef.current) {
      isTypingRef.current = false
      onTypingStop()
    }
  }, [onTypingStop])

  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    isTypingRef.current = false
  }, [])

  return {
    startTyping,
    stopTyping,
    cleanup,
    isTyping: isTypingRef.current
  }
}
