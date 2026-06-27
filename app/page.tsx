"use client"

import { useState, useCallback } from "react"
import { IntroScreen } from "@/components/intro-screen"
import { VideoExperience } from "@/components/video-experience"
import { FeedbackScreen } from "@/components/feedback-screen"
import { SummaryScreen } from "@/components/summary-screen"
import { scenarios, TrustLevel, isCorrectAssessment } from "@/lib/scenarios"

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

  const currentScenario = scenarios[currentScenarioIndex]

  const handleStart = useCallback(() => {
    setCurrentScreen("video")
    setCurrentScenarioIndex(0)
    setResults([])
  }, [])

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
    setCurrentScreen("intro")
    setCurrentScenarioIndex(0)
    setResults([])
    setCurrentUserTrust("medium")
  }, [])

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
