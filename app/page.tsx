"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { IntroScreen } from "@/components/intro-screen"
import { VideoExperience } from "@/components/video-experience"
import { FeedbackScreen } from "@/components/feedback-screen"
import { SummaryScreen } from "@/components/summary-screen"
import { FinalChecklistScreen } from "@/components/final-checklist-screen"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { scenarios, TrustLevel, isCorrectAssessment } from "@/lib/scenarios"
import { useSessionTracking } from "@/hooks/use-session-tracking"
import { useAnalytics } from "@/hooks/use-analytics"
import { Clock3 } from "lucide-react"

type Screen = "intro" | "video" | "feedback" | "summary" | "checklist"

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
  const [videosReady, setVideosReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const handleShowChecklist = () => {
    setCurrentScreen("checklist")
  }

  const handleBackToSummary = () => {
    setCurrentScreen("summary")
  }

  // Session tracking and analytics
  const {
    sessionId,
    resetSessionId,
    isInactivityWarningOpen,
    countdownSeconds,
    continueSession,
    startNewSession,
  } = useSessionTracking({ isTrackingEnabled: currentScreen !== "intro" })
  const { trackSessionCompleted } = useAnalytics()
  
  // Ref to track if we've already fired session_completed for this session
  // This prevents duplicate events from React Strict Mode or state updates
  const sessionCompletedTrackedRef = useRef(false)

  const currentScenario = scenarios[currentScenarioIndex]

  const resetExperienceState = useCallback(() => {
    setCurrentScreen("intro")
    setCurrentScenarioIndex(0)
    setResults([])
    setCurrentUserTrust("medium")
  }, [])

  const handleStart = useCallback(() => {
    // Reuse the current fresh session prepared on mount, timeout, or restart.
    setCurrentScreen("video")
    setCurrentScenarioIndex(0)
    setResults([])
    setCurrentUserTrust("medium")
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
    // Reset session when restarting
    resetSessionId()
    resetExperienceState()
  }, [resetExperienceState, resetSessionId])

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

  // Listen for session timeout on public display and reset only the UI state.
  useEffect(() => {
    const handleSessionTimeout = () => {
      resetExperienceState()
    }

    window.addEventListener('sessionTimeout', handleSessionTimeout)
    return () => window.removeEventListener('sessionTimeout', handleSessionTimeout)
  }, [resetExperienceState])

  // Preload all videos in PARALLEL for faster loading on mobile/tablet devices.
  // This ensures all videos are buffered before the user starts instead of loading sequentially.
  useEffect(() => {
    const videoSources = scenarios
      .map((scenario) => scenario.videoSrc)
      .filter((src): src is string => Boolean(src))

    if (videoSources.length === 0) {
      setVideosReady(true)
      return
    }

    let cancelled = false
    setVideosReady(false)
    setLoadingProgress(0)

    const preloadVideo = document.createElement("video")
    preloadVideo.muted = true
    preloadVideo.playsInline = true
    preloadVideo.preload = "auto"

    const preloadSingleVideo = (src: string): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          preloadVideo.removeEventListener("loadeddata", onSuccess)
          preloadVideo.removeEventListener("error", onError)
          console.warn(`Video preload timeout: ${src}`)
          resolve(false)
        }, 30000)

        const onSuccess = () => {
          clearTimeout(timeout)
          preloadVideo.removeEventListener("loadeddata", onSuccess)
          preloadVideo.removeEventListener("error", onError)
          resolve(true)
        }

        const onError = () => {
          clearTimeout(timeout)
          preloadVideo.removeEventListener("loadeddata", onSuccess)
          preloadVideo.removeEventListener("error", onError)
          console.warn(`Video preload error: ${src}`)
          resolve(false)
        }

        preloadVideo.addEventListener("loadeddata", onSuccess, { once: true })
        preloadVideo.addEventListener("error", onError, { once: true })
        preloadVideo.src = src
        preloadVideo.load()
      })

    const warmAllVideos = async () => {
      const promises = videoSources.map((src, index) => {
        return preloadSingleVideo(src).then((success) => {
          if (!cancelled) {
            setLoadingProgress((prev) => {
              const newProgress = ((index + 1) / videoSources.length) * 100
              return Math.max(prev, newProgress)
            })
          }
          return success
        })
      })

      try {
        await Promise.all(promises)
        if (!cancelled) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          setVideosReady(true)
          setLoadingProgress(100)
        }
      } catch (error) {
        console.error("Video preload failed:", error)
        if (!cancelled) {
          setVideosReady(true)
        }
      }
    }

    void warmAllVideos()

    return () => {
      cancelled = true
      preloadVideo.removeAttribute("src")
      preloadVideo.load()
    }
  }, [])

  // Dev shortcut: jump straight to the end screen with sample results
  const handleSkipToSummary = useCallback(() => {
    setCurrentScreen("summary")
  }, [])

  const correctCount = results.filter((r) => r.isCorrect).length

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      {/* Dev shortcut to preview the end screen directly */}
      {currentScreen !== "summary" && currentScreen !== "intro" && (
       <button
  onClick={handleSkipToSummary}
  className="fixed bottom-1 right-1 z-50 rounded-2xl border border-border bg-card/90 px-8 py-5 text-xl font-semibold text-muted-foreground shadow-xl backdrop-blur transition-colors hover:bg-card hover:text-foreground"
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
        {currentScreen === "intro" && (
          <IntroScreen
            onStart={handleStart}
            isVideosReady={videosReady}
            loadingProgress={loadingProgress}
          />
        )}
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
            sessionId={sessionId}
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
            onShowChecklist={handleShowChecklist}
            onRestart={handleRestart}
          />
        )}
      </div>

      <div
        className={`transition-opacity duration-500 ${
          currentScreen === "checklist"
            ? "opacity-100"
            : "opacity-0 absolute inset-0 pointer-events-none"
        }`}
      >
        {currentScreen === "checklist" && (
          <FinalChecklistScreen
            onRestart={handleRestart}
          />
        )}
      </div>

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
              Your session will end soon due to inactivity. If you are still using the application, select
              {" "}<span className="font-semibold text-white">Continue</span>. Otherwise, a new session will start
              automatically in {countdownSeconds} seconds.
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
    </main>
  )
}
