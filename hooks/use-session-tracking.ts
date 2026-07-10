import { useEffect, useState, useCallback } from 'react'

const INACTIVITY_WARNING_MS = 45 * 1000
const WARNING_COUNTDOWN_SECONDS = 15
const WARNING_COUNTDOWN_MS = WARNING_COUNTDOWN_SECONDS * 1000
const SESSION_TIMEOUT_MS = INACTIVITY_WARNING_MS + WARNING_COUNTDOWN_MS
const DEBUG_SESSION = typeof window !== 'undefined' && localStorage.getItem('DEBUG_SESSION') === 'true'
const SESSION_STORAGE_KEY = 'trustcheck_session'
const SESSION_ACTIVITY_KEY = 'trustcheck_session_last_activity'

/**
 * Custom hook for managing session tracking on a public display
 * 
 * For a public display, each user should get their own session:
 * - Session ID is generated on first interaction
 * - Shows an inactivity warning after 45 seconds
 * - Starts a fresh session after another 15 seconds without confirmation
 * - Resets when user clicks "Start again"
 * 
 * Uses localStorage with TTL to persist across the display lifecycle
 */
export function useSessionTracking({ isTrackingEnabled = true }: { isTrackingEnabled?: boolean } = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now())
  const [isInactivityWarningOpen, setIsInactivityWarningOpen] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(WARNING_COUNTDOWN_SECONDS)

  const storeLastActivityTime = useCallback((timestamp: number) => {
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp))
  }, [])

  const markActivity = useCallback((timestamp: number = Date.now()) => {
    storeLastActivityTime(timestamp)
    setLastActivityTime(timestamp)
  }, [storeLastActivityTime])

  const createAndStoreSessionId = useCallback(() => {
    const newSessionId = crypto.randomUUID()
    const createdAt = Date.now()
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId)
    storeLastActivityTime(createdAt)
    setSessionId(newSessionId)
    setLastActivityTime(createdAt)
    return newSessionId
  }, [storeLastActivityTime])

  const resetInactivityState = useCallback(() => {
    setIsInactivityWarningOpen(false)
    setCountdownSeconds(WARNING_COUNTDOWN_SECONDS)
    markActivity()
  }, [markActivity])

  const startFreshSession = useCallback((reason: 'manual' | 'timeout') => {
    const newSessionId = createAndStoreSessionId()
    if (DEBUG_SESSION) console.log(`📱 Started fresh session (${reason}):`, newSessionId)
    resetInactivityState()

    if (reason === 'timeout') {
      window.dispatchEvent(new CustomEvent('sessionTimeout'))
    }
  }, [createAndStoreSessionId, resetInactivityState])

  // Generate or retrieve session ID on mount
  useEffect(() => {
    // Try to get existing session from localStorage with TTL check
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    const storedTime = localStorage.getItem(SESSION_ACTIVITY_KEY)

    if (stored && storedTime) {
      const lastActivity = parseInt(storedTime, 10)
      const elapsedMs = Date.now() - lastActivity

      // If session is still valid, use it
      if (elapsedMs < SESSION_TIMEOUT_MS) {
        if (DEBUG_SESSION) console.log('📱 Using existing session:', stored)
        setSessionId(stored)
        setLastActivityTime(lastActivity)
        return
      }
    }

    const newSessionId = createAndStoreSessionId()
    if (DEBUG_SESSION) console.log('📱 Created new session:', newSessionId)
  }, [createAndStoreSessionId])

  // Track activity to detect inactivity while the warning modal is not visible.
  useEffect(() => {
    if (!isTrackingEnabled) return

    const handleActivity = () => {
      if (isInactivityWarningOpen) return
      markActivity()
    }

    // Track user interactions on kiosk-like devices.
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [isInactivityWarningOpen, isTrackingEnabled, markActivity])

  useEffect(() => {
    if (isTrackingEnabled) return

    setIsInactivityWarningOpen(false)
    setCountdownSeconds(WARNING_COUNTDOWN_SECONDS)
    markActivity()
  }, [isTrackingEnabled, markActivity])

  // Stage 1: open a warning modal after 45 seconds of inactivity.
  useEffect(() => {
    if (!isTrackingEnabled || isInactivityWarningOpen) return

    const elapsedMs = Date.now() - lastActivityTime
    const remainingMs = Math.max(0, INACTIVITY_WARNING_MS - elapsedMs)

    const warningTimeout = window.setTimeout(() => {
      setIsInactivityWarningOpen(true)
      setCountdownSeconds(WARNING_COUNTDOWN_SECONDS)
    }, remainingMs)

    return () => window.clearTimeout(warningTimeout)
  }, [isInactivityWarningOpen, isTrackingEnabled, lastActivityTime])

  // Stage 2: keep the warning visible for 15 seconds, then start a fresh session.
  useEffect(() => {
    if (!isTrackingEnabled || !isInactivityWarningOpen) return

    const warningOpenedAt = Date.now()
    setCountdownSeconds(WARNING_COUNTDOWN_SECONDS)

    const countdownInterval = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - warningOpenedAt) / 1000)
      const remainingSeconds = Math.max(0, WARNING_COUNTDOWN_SECONDS - elapsedSeconds)
      setCountdownSeconds(remainingSeconds)
    }, 250)

    const expirationTimeout = window.setTimeout(() => {
      startFreshSession('timeout')
    }, WARNING_COUNTDOWN_MS)

    return () => {
      window.clearInterval(countdownInterval)
      window.clearTimeout(expirationTimeout)
    }
  }, [isInactivityWarningOpen, isTrackingEnabled, startFreshSession])

  // Reset session ID (e.g., when user clicks "Start again")
  const resetSessionId = useCallback(() => {
    startFreshSession('manual')
  }, [startFreshSession])

  const continueSession = useCallback(() => {
    if (DEBUG_SESSION) console.log('📱 Continuing active session:', sessionId)
    resetInactivityState()
  }, [resetInactivityState, sessionId])

  const startNewSession = useCallback(() => {
    startFreshSession('timeout')
  }, [startFreshSession])

  // Get current session ID
  const getSessionId = useCallback(() => {
    return sessionId || localStorage.getItem(SESSION_STORAGE_KEY)
  }, [sessionId])

  return {
    sessionId,
    resetSessionId,
    isInactivityWarningOpen,
    countdownSeconds,
    continueSession,
    startNewSession,
    getSessionId,
  }
}
