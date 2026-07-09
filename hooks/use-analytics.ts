import { track } from '@vercel/analytics'

export interface AnalyticsEvent {
  eventName: string
  properties?: Record<string, string | number | boolean>
}

/**
 * Hook for tracking Vercel Web Analytics events
 * Provides utility functions to track user interactions consistently
 * 
 * Debug: Set localStorage.setItem('DEBUG_ANALYTICS', 'true') to log all events
 */
export function useAnalytics() {
  const isDebugMode = typeof window !== 'undefined' && localStorage.getItem('DEBUG_ANALYTICS') === 'true'

  const trackEvent = (eventName: string, properties?: Record<string, string | number | boolean>) => {
    try {
      if (isDebugMode) {
        console.log(`📊 Analytics Event: ${eventName}`, properties)
      }
      track(eventName, properties)
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  const trackSessionCompleted = (sessionId: string) => {
    trackEvent('session_completed', { sessionId })
  }

  const trackVideoReplay = (sessionId: string, videoId: string) => {
    trackEvent('video_replay', { sessionId, videoId })
  }

  const trackSliderSubmitted = (sessionId: string, videoId: string, sliderValue: string, isCorrect: boolean) => {
    trackEvent('slider_submitted', { sessionId, videoId, sliderValue, isCorrect })
  }

  return {
    trackEvent,
    trackSessionCompleted,
    trackVideoReplay,
    trackSliderSubmitted,
  }
}
