"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { SummaryScreen } from "@/components/summary-screen"
import { useExperiment } from "@/components/experiment-provider"
import { usePageTracking } from "@/hooks/use-page-tracking"
import { scenarios } from "@/lib/scenarios"
import { INTRO_ROUTE, PAGE_VERSION } from "@/lib/experiment-config"
import { recordAttemptForCurrentParticipant } from "@/lib/face/participant-session"

export default function CompletePage() {
  const router = useRouter()
  const { sessionId, results, resetExperiment } = useExperiment()
  usePageTracking("complete", PAGE_VERSION)

  // Results are hydrated from sessionStorage on the client, so render the
  // summary only after mount to keep server and client markup consistent.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Associate this attempt's performance with the locally recognized
  // participant (no-op if none recognized / server unreachable). Fires once.
  const recordedRef = useRef(false)
  useEffect(() => {
    if (recordedRef.current || results.length === 0) return
    recordedRef.current = true
    void recordAttemptForCurrentParticipant({
      sessionId,
      correctCount: results.filter((r) => r.isCorrect).length,
      totalCount: scenarios.length,
      details: results.map((r) => ({
        scenarioId: r.scenarioId,
        userTrust: r.userTrust,
        isCorrect: r.isCorrect,
      })),
    })
  }, [results, sessionId])

  const correctCount = useMemo(
    () => results.filter((result) => result.isCorrect).length,
    [results],
  )

  const handleRestart = useCallback(() => {
    resetExperiment()
    router.push(INTRO_ROUTE)
  }, [resetExperiment, router])

  if (!mounted) {
    return <main className="h-screen w-screen overflow-hidden bg-background" />
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <SummaryScreen
        scenarios={scenarios}
        results={results}
        correctCount={correctCount}
        totalScenarios={scenarios.length}
        sessionId={sessionId}
        onRestart={handleRestart}
      />
    </main>
  )
}
