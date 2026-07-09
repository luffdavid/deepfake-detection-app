"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { IntroScreen } from "@/components/intro-screen"
import { VideoExperience } from "@/components/video-experience"
import { FeedbackScreen } from "@/components/feedback-screen"
import { SummaryScreen } from "@/components/summary-screen"
import { scenarios, TrustLevel, isCorrectAssessment } from "@/lib/scenarios"
import { useSessionTracking } from "@/hooks/use-session-tracking"
import { useAnalytics } from "@/hooks/use-analytics"

type Screen = "intro" | "video" | "feedback" | "summary"

interface UserResult {
  scenarioId: string
  userTrust: TrustLevel
  isCorrect: boolean
}

export default function TrustCheckApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("intro")
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [currentUserTrust, setCurrentUserTrust] = useState<TrustLevel>("medium")
  const [results, setResults] = useState<UserResult[]>([])
  
  // Session tracking and analytics
  const { sessionId, resetSessionId, getSessionId } = useSessionTracking()
  const { trackSessionCompleted } = useAnalytics()
  
  // Ref to track if we've already fired session_completed for this session
  // This prevents duplicate events from React Strict Mode or state updates
  const sessionCompletedTrackedRef = useRef(false)

  const currentScenario = scenarios[currentScenarioIndex]

  const handleStart = useCallback(() => {
    // Reset session when starting or restarting
    resetSessionId()
    setCurrentScreen("video")
    setCurrentScenarioIndex(0)
    setResults([])
  }, [resetSessionId])

  const handleVideoSubmit = useCallback(
    (userTrust: TrustLevel) => {
      setCurrentUserTrust(userTrust)
      
      const isCorrect = isCorrectAssessment(userTrust, currentScenario.recommendedTrust)
      
      setResults((prev) => [
        ...prev,
        {
          scenarioId: currentScenario.id,
          userTrust,
          isCorrect,
        },
      ])

      setCurrentScreen("feedback")
    },
    [currentScenario]
  )

  const handleContinue = useCallback(() => {
    if (currentScenarioIndex < scenarios.length - 1) {
      // Move to next scenario
      setCurrentScenarioIndex((prev) => prev + 1)
      setCurrentScreen("video")
    } else {
      // All scenarios complete
      setCurrentScreen("summary")
    }
  }, [currentScenarioIndex])

  const handleRestart = useCallback(() => {
    // Reset session when restarting
    resetSessionId()
    setCurrentScreen("intro")
    setCurrentScenarioIndex(0)
    setResults([])
    setCurrentUserTrust("medium")
  }, [resetSessionId])

  // Track session completion when user reaches summary screen (only fire once)
  useEffect(() => {
    if (currentScreen === "summary" && sessionId) {
      // Only track if we haven't already tracked this session completion
      if (!sessionCompletedTrackedRef.current) {
        console.log('🎯 Tracking session_completed for sessionId:', sessionId)
        trackSessionCompleted(sessionId)
        sessionCompletedTrackedRef.current = true
      }
    } else if (currentScreen !== "summary") {
      // Reset tracking flag when leaving summary (so next session can track again)
      sessionCompletedTrackedRef.current = false
    }
  }, [currentScreen, sessionId, trackSessionCompleted])

  // Listen for session timeout on public display (after 30 minutes inactivity)
  useEffect(() => {
    const handleSessionTimeout = () => {
      // Reset to intro screen when session times out
      handleRestart()
    }

    window.addEventListener('sessionTimeout', handleSessionTimeout)
    return () => window.removeEventListener('sessionTimeout', handleSessionTimeout)
  }, [handleRestart])

  // Dev shortcut: jump straight to the end screen with sample results
  const handleSkipToSummary = useCallback(() => {
    setResults(
      scenarios.map((s, i) => ({
        scenarioId: s.id,
        userTrust: s.recommendedTrust,
        isCorrect: i !== 1,
      })),
    )
    setCurrentScreen("summary")
  }, [])

  const correctCount = results.filter((r) => r.isCorrect).length

  return (
    <main className="min-h-screen bg-background">
      {/* Dev shortcut to preview the end screen directly */}
      {currentScreen !== "summary" && (
        <button
          onClick={handleSkipToSummary}
          className="fixed bottom-4 right-4 z-50 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground"
        >
          Skip to results
        </button>
      )}

      {/* Screen transitions */}
      <div
        className={`transition-opacity duration-500 ${
          currentScreen === "intro" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
        }`}
      >
        {currentScreen === "intro" && <IntroScreen onStart={handleStart} />}
      </div>

      <div
        className={`transition-opacity duration-500 ${
          currentScreen === "video" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
        }`}
      >
        {currentScreen === "video" && currentScenario && (
          <VideoExperience
            key={currentScenario.id}
            scenario={currentScenario}
            currentIndex={currentScenarioIndex}
            totalScenarios={scenarios.length}
            onSubmit={handleVideoSubmit}
          />
        )}
      </div>

      <div
        className={`transition-opacity duration-500 ${
          currentScreen === "feedback" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
        }`}
      >
        {currentScreen === "feedback" && currentScenario && (
          <FeedbackScreen
            scenario={currentScenario}
            userTrust={currentUserTrust}
            onContinue={handleContinue}
          />
        )}
      </div>

      <div
        className={`transition-opacity duration-500 ${
          currentScreen === "summary" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
        }`}
      >
        {currentScreen === "summary" && (
          <SummaryScreen
            scenarios={scenarios}
            results={results}
            correctCount={correctCount}
            totalScenarios={scenarios.length}
            onRestart={handleRestart}
          />
        )}
      </div>
    </main>
  )
}
