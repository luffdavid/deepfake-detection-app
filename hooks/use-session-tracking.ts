import { useEffect, useState, useCallback } from 'react'

// 45 seconds of inactivity triggers a new session and resets to intro screen
const SESSION_TIMEOUT_MS = 45 * 1000
const DEBUG_SESSION = typeof window !== 'undefined' && localStorage.getItem('DEBUG_SESSION') === 'true'

/**
 * Custom hook for managing session tracking on a public display
 * 
 * For a public display, each user should get their own session:
 * - Session ID is generated on first interaction
 * - Automatically resets after 30 minutes of inactivity
 * - Resets when user clicks "Start again"
 * 
 * Uses localStorage with TTL to persist across the display lifecycle
 */
export function useSessionTracking() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now())

  // Generate or retrieve session ID on mount
  useEffect(() => {
    // Try to get existing session from localStorage with TTL check
    const stored = localStorage.getItem('trustcheck_session')
    const storedTime = localStorage.getItem('trustcheck_session_start')

    if (stored && storedTime) {
      const sessionStartTime = parseInt(storedTime, 10)
      const elapsedMs = Date.now() - sessionStartTime

      // If session is still valid, use it
      if (elapsedMs < SESSION_TIMEOUT_MS) {
        if (DEBUG_SESSION) console.log('📱 Using existing session:', stored)
        setSessionId(stored)
        setLastActivityTime(Date.now())
        return
      }
    }

    // Generate a new session ID using crypto.randomUUID()
    const newSessionId = crypto.randomUUID()
    localStorage.setItem('trustcheck_session', newSessionId)
    localStorage.setItem('trustcheck_session_start', String(Date.now()))
    if (DEBUG_SESSION) console.log('📱 Created new session:', newSessionId)
    setSessionId(newSessionId)
  }, [])

  // Track activity to detect inactivity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now())
    }

    // Track user interactions
    window.addEventListener('click', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)

    return () => {
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [])

  // Check for session timeout periodically
  useEffect(() => {
    const checkTimeout = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTime
      
      if (timeSinceLastActivity > SESSION_TIMEOUT_MS) {
        // Session timed out - generate new session
        const newSessionId = crypto.randomUUID()
        localStorage.setItem('trustcheck_session', newSessionId)
        localStorage.setItem('trustcheck_session_start', String(Date.now()))
        setSessionId(newSessionId)
        setLastActivityTime(Date.now())
        
        // Notify parent that session timed out (can be used to reset UI)
        window.dispatchEvent(new CustomEvent('sessionTimeout'))
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(checkTimeout)
  }, [lastActivityTime])

  // Reset session ID (e.g., when user clicks "Start again")
  const resetSessionId = useCallback(() => {
    const newSessionId = crypto.randomUUID()
    localStorage.setItem('trustcheck_session', newSessionId)
    localStorage.setItem('trustcheck_session_start', String(Date.now()))
    if (DEBUG_SESSION) console.log('📱 Reset session → New sessionId:', newSessionId)
    setSessionId(newSessionId)
    setLastActivityTime(Date.now())
  }, [])

  // Get current session ID
  const getSessionId = useCallback(() => {
    return sessionId || localStorage.getItem('trustcheck_session')
  }, [sessionId])

  return {
    sessionId,
    resetSessionId,
    getSessionId,
  }
}
