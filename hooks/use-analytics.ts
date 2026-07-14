import { track } from '@vercel/analytics'

export interface AnalyticsEvent {
  eventName: string
  properties?: Record<string, string | number | boolean>
}

/**
 * Hook for tracking Vercel Web Analytics events AND internal PostgreSQL database
 * Provides utility functions to track user interactions consistently
 * 
 * Events are tracked in parallel:
 * 1. Vercel Analytics (real-time)
 * 2. Internal PostgreSQL database (for custom dashboard)
 * 
 * Debug: Set localStorage.setItem('DEBUG_ANALYTICS', 'true') to log all events
 */
export function useAnalytics() {
  const isDebugMode = typeof window !== 'undefined' && localStorage.getItem('DEBUG_ANALYTICS') === 'true'

  /**
   * Store event in internal database via API endpoint
   * Called asynchronously, does not block tracking
   */
  const storeEventInDatabase = async (
    eventName: string,
    properties?: Record<string, string | number | boolean>,
    sessionId?: string
  ) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName,
          properties,
          sessionId,
        }),
      })
    } catch (error) {
      console.error('Failed to store event in database:', error)
      // Silently fail - don't disrupt user experience
    }
  }

  const trackEvent = (eventName: string, properties?: Record<string, string | number | boolean>, sessionId?: string) => {
    try {
      if (isDebugMode) {
        console.log(`📊 Analytics Event: ${eventName}`, properties)
      }
      
      // Track in Vercel Analytics (primary)
      track(eventName, properties)
      
      // Also store in internal database (fire and forget)
      storeEventInDatabase(eventName, properties, sessionId)
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  const trackSessionCompleted = (sessionId: string) => {
    trackEvent('session_completed', { sessionId }, sessionId)
  }

  const trackVideoReplay = (sessionId: string, videoId: string) => {
    trackEvent('video_replay', { sessionId, videoId }, sessionId)
  }

  const trackSliderSubmitted = (sessionId: string, videoId: string, sliderValue: string, isCorrect: boolean) => {
    trackEvent('slider_submitted', { sessionId, videoId, sliderValue, isCorrect }, sessionId)
  }

  const trackSkipToResults = (sessionId: string, videoCount: number) => {
    trackEvent('skip_to_results', { sessionId, videoCount }, sessionId)
  }

  return {
    trackEvent,
    trackSessionCompleted,
    trackVideoReplay,
    trackSliderSubmitted,
    trackSkipToResults,
  }
}
