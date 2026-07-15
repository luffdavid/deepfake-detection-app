"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IntroScreen } from "@/components/intro-screen"
import { useExperiment } from "@/components/experiment-provider"
import { usePageTracking } from "@/hooks/use-page-tracking"
import { scenarios } from "@/lib/scenarios"
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
