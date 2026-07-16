"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntroScreen } from "@/components/intro-screen"
import { useExperiment } from "@/components/experiment-provider"
import { usePageTracking } from "@/hooks/use-page-tracking"
import { scenarios } from "@/lib/scenarios"
import { hasPreloadedVideos, preloadVideosOnce } from "@/lib/video-preload"
import { INTRO_ROUTE, PAGE_VERSION, getExperimentRoutes, getPageByRoute } from "@/lib/experiment-config"

export default function IntroPage() {
  const router = useRouter()
  const { startExperiment } = useExperiment()
  usePageTracking("intro", PAGE_VERSION)

  const [videosReady, setVideosReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  const handleStart = useCallback(() => {
    // Deliberately starting the experiment creates a fresh pseudonymous session.
    // The flow goes straight into the videos — calibration is a hidden staff step.
    startExperiment()
    const next = getPageByRoute(INTRO_ROUTE)?.nextRoute ?? getExperimentRoutes()[0] ?? "/"
    router.push(next)
  }, [router, startExperiment])

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

    if (hasPreloadedVideos()) {
      setVideosReady(true)
      setLoadingProgress(100)
      return
    }

    let cancelled = false
    setVideosReady(false)
    setLoadingProgress(0)

    const warmAllVideos = async () => {
      try {
        await preloadVideosOnce(videoSources, (progress) => {
          if (!cancelled) {
            setLoadingProgress((prev) => Math.max(prev, progress))
          }
        })

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
    }
  }, [])

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <IntroScreen
        onStart={handleStart}
        isVideosReady={videosReady}
        loadingProgress={loadingProgress}
      />
    </main>
  )
}
