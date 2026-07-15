"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { SummaryScreen } from "@/components/summary-screen"
import { useExperiment } from "@/components/experiment-provider"
import { usePageTracking } from "@/hooks/use-page-tracking"
import { scenarios } from "@/lib/scenarios"
import { INTRO_ROUTE, PAGE_VERSION } from "@/lib/experiment-config"

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
