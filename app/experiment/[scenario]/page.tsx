"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { VideoExperience } from "@/components/video-experience"
import { FeedbackScreen } from "@/components/feedback-screen"
import { useExperiment } from "@/components/experiment-provider"
import { usePageTracking } from "@/hooks/use-page-tracking"
import { useAnalytics } from "@/hooks/use-analytics"
import { scenarios, isCorrectAssessment, type TrustLevel } from "@/lib/scenarios"
import {
  COMPLETE_ROUTE,
  INTRO_ROUTE,
  PAGE_VERSION,
  getExperimentPageBySlug,
  getScenarioBySlug,
} from "@/lib/experiment-config"

type Phase = "video" | "feedback"

export default function ExperimentScenarioPage() {
  const router = useRouter()
  const params = useParams<{ scenario: string }>()
  const slug = params?.scenario ?? ""

  const scenario = getScenarioBySlug(slug)
  const page = getExperimentPageBySlug(slug)

  const { sessionId, addResult, resetExperiment } = useExperiment()
  const { trackSkipToResults } = useAnalytics()

  const [phase, setPhase] = useState<Phase>("video")
  const [userTrust, setUserTrust] = useState<TrustLevel>("medium")
  // The scenario UI contains client-generated random content (dates, usernames,
  // comments). Render it only after mount so server and client markup match.
  const [mounted, setMounted] = useState(false)

  usePageTracking(page?.pageId ?? "experiment", PAGE_VERSION, phase)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    router.prefetch(COMPLETE_ROUTE)
    router.prefetch(INTRO_ROUTE)
    if (page?.nextRoute) {
      router.prefetch(page.nextRoute)
    }
  }, [page?.nextRoute, router])

  // Reset the phase whenever the scenario route changes.
  useEffect(() => {
    setPhase("video")
    setUserTrust("medium")
  }, [slug])

  // Unknown scenario slug -> return to the intro page.
  useEffect(() => {
    if (!scenario) {
      router.replace(INTRO_ROUTE)
    }
  }, [scenario, router])

  const scenarioIndex = scenario
    ? scenarios.findIndex((entry) => entry.id === scenario.id)
    : -1

  const continueLabel =
    scenarioIndex === scenarios.length - 1
      ? "Show results"
      : scenarioIndex === scenarios.length - 2
        ? "Last scenario"
        : "Next scenario"

  const handleVideoSubmit = useCallback(
    (trust: TrustLevel) => {
      if (!scenario) return
      const isCorrect = isCorrectAssessment(trust, scenario.recommendedTrust)
      setUserTrust(trust)
      addResult({ scenarioId: scenario.id, userTrust: trust, isCorrect })
      setPhase("feedback")
    },
    [addResult, scenario],
  )

  const handleContinue = useCallback(() => {
    const nextRoute = page?.nextRoute ?? COMPLETE_ROUTE
    router.push(nextRoute)
  }, [page, router])

  const handleSkipToSummary = useCallback(() => {
    if (sessionId) {
      trackSkipToResults(sessionId, Math.max(0, scenarioIndex))
    }
    router.push(COMPLETE_ROUTE)
  }, [router, scenarioIndex, sessionId, trackSkipToResults])

  const handleRestartToIntro = useCallback(() => {
    resetExperiment()
    router.push(INTRO_ROUTE)
  }, [resetExperiment, router])

  if (!scenario || !page) {
    return null
  }

  if (!mounted) {
    return <main className="h-screen w-screen overflow-hidden bg-background" />
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      {/* Dev shortcut to preview the end screen directly */}
      <button
        onClick={handleRestartToIntro}
        className="fixed bottom-10 left-10 z-50 rounded-2xl border border-border bg-card/90 px-8 py-5 text-xl font-semibold text-muted-foreground shadow-xl backdrop-blur transition-colors hover:bg-card hover:text-foreground"
      >
        Restart experience
      </button>

      <button
        onClick={handleSkipToSummary}
        className="fixed bottom-10 right-10 z-50 rounded-2xl border border-border bg-card/90 px-8 py-5 text-xl font-semibold text-muted-foreground shadow-xl backdrop-blur transition-colors hover:bg-card hover:text-foreground"
      >
        Skip to results
      </button>

      {phase === "video" && (
        <VideoExperience
          key={scenario.id}
          scenario={scenario}
          currentIndex={scenarioIndex}
          totalScenarios={scenarios.length}
          sessionId={sessionId}
          onSubmit={handleVideoSubmit}
        />
      )}

      {phase === "feedback" && (
        <FeedbackScreen
          scenario={scenario}
          userTrust={userTrust}
          onContinue={handleContinue}
          continueLabel={continueLabel}
        />
      )}
    </main>
  )
}
