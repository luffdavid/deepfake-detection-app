'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Clock3 } from 'lucide-react'

import { useSessionTracking } from '@/hooks/use-session-tracking'
import { TrustLevel } from '@/lib/scenarios'
import { INTRO_ROUTE } from '@/lib/experiment-config'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ScenarioResult {
  scenarioId: string
  userTrust: TrustLevel
  isCorrect: boolean
}

interface ExperimentContextValue {
  /** Pseudonymous session id kept for the whole experiment navigation. */
  sessionId: string | null
  /** Collected per-scenario results. */
  results: ScenarioResult[]
  /** Store (or overwrite) the result for a scenario. */
  addResult: (result: ScenarioResult) => void
  /** Deliberately start a new experiment (fresh session + cleared results). */
  startExperiment: () => void
  /** Reset the experiment (fresh session + cleared results). */
  resetExperiment: () => void
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null)

const RESULTS_STORAGE_KEY = 'trustcheck_results'

/**
 * Routes on which the inactivity tracking (kiosk auto-reset) is active. The
 * intro page and the separate dashboard routes are intentionally excluded.
 */
const TRACKED_ROUTE_PREFIXES = ['/calibration', '/experiment', '/complete']

function isTrackedRoute(pathname: string): boolean {
  return TRACKED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function readStoredResults(): ScenarioResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(RESULTS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ScenarioResult[]) : []
  } catch {
    return []
  }
}

function writeStoredResults(results: ScenarioResult[]) {
  try {
    window.sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results))
  } catch {
    // Ignore storage failures (e.g. private mode). State stays in memory.
  }
}

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isTrackingEnabled = isTrackedRoute(pathname)

  const {
    sessionId,
    resetSessionId,
    isInactivityWarningOpen,
    countdownSeconds,
    continueSession,
    startNewSession,
  } = useSessionTracking({ isTrackingEnabled })

  // Results are kept in sessionStorage so a reload within the same session
  // keeps the collected answers, while closing the tab clears them.
  const [results, setResults] = useState<ScenarioResult[]>([])

  useEffect(() => {
    setResults(readStoredResults())
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    try {
      window.sessionStorage.removeItem(RESULTS_STORAGE_KEY)
    } catch {
      // Ignore storage failures.
    }
  }, [])

  const addResult = useCallback((result: ScenarioResult) => {
    setResults((prev) => {
      const next = [
        ...prev.filter((entry) => entry.scenarioId !== result.scenarioId),
        result,
      ]
      writeStoredResults(next)
      return next
    })
  }, [])

  const startExperiment = useCallback(() => {
    // A deliberate start gets a fresh pseudonymous session id.
    resetSessionId()
    clearResults()
  }, [clearResults, resetSessionId])

  const resetExperiment = useCallback(() => {
    resetSessionId()
    clearResults()
  }, [clearResults, resetSessionId])

  // On kiosk inactivity timeout: clear results and return to the intro page.
  useEffect(() => {
    const handleSessionTimeout = () => {
      clearResults()
      router.push(INTRO_ROUTE)
    }

    window.addEventListener('sessionTimeout', handleSessionTimeout)
    return () => window.removeEventListener('sessionTimeout', handleSessionTimeout)
  }, [clearResults, router])

  return (
    <ExperimentContext.Provider
      value={{ sessionId, results, addResult, startExperiment, resetExperiment }}
    >
      {children}

      <Dialog open={isInactivityWarningOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-amber-500/30 bg-slate-950 text-white sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="items-center text-center sm:items-center sm:text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <Clock3 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-2xl text-white">Are you still there?</DialogTitle>
            <DialogDescription className="max-w-sm text-sm leading-relaxed text-slate-300">
              Your session will end soon due to inactivity.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-6 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">
              Session expires in
            </p>
            <div className="mt-2 text-5xl font-bold tabular-nums text-amber-300">
              {countdownSeconds}
            </div>
            <p className="mt-2 text-sm text-slate-300">A new session will begin automatically when the countdown ends.</p>
          </div>

          <DialogFooter className="sm:grid sm:grid-cols-2">
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white"
              onClick={startNewSession}
            >
              Start New Session
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={continueSession}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ExperimentContext.Provider>
  )
}

export function useExperiment(): ExperimentContextValue {
  const context = useContext(ExperimentContext)
  if (!context) {
    throw new Error('useExperiment must be used within an ExperimentProvider')
  }
  return context
}
