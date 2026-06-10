"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Scenario, getSliderTrustLevel, TrustLevel } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Heart, MessageCircle, Share2, ChevronRight } from "lucide-react"

const VIDEO_DURATION = 7   // seconds the clip "plays" before countdown
const COUNTDOWN_DURATION = 10 // seconds of decision time

function generateRandomCommentUser(): string {
  const prefixes = [
    "real",
    "news",
    "safe",
    "watch",
    "trust",
    "fact",
    "media",
    "check",
    "true",
    "urban",
    "daily",
    "voice",
  ]
  const suffixes = [
    "fox",
    "pilot",
    "viewer",
    "radar",
    "scope",
    "nexus",
    "spark",
    "byte",
    "echo",
    "atlas",
    "lane",
    "focus",
  ]

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  const number = Math.floor(Math.random() * 900 + 100)
  return `${prefix}_${suffix}${number}`
}

interface VideoExperienceProps {
  scenario: Scenario
  currentIndex: number
  totalScenarios: number
  onSubmit: (userTrust: TrustLevel) => void
}

export function VideoExperience({
  scenario,
  currentIndex,
  totalScenarios,
  onSubmit,
}: VideoExperienceProps) {
  const [sliderValue, setSliderValue] = useState([50])
  const [phase, setPhase] = useState<"video" | "interaction">("video")
  const [videoProgress, setVideoProgress] = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [showHint, setShowHint] = useState(false)
  const [commentUser, setCommentUser] = useState(generateRandomCommentUser)
  const submittedRef = useRef(false)
  const hasEngagement = Boolean(scenario.likes || scenario.comments || scenario.shares)

  // Phase 1: video playback progress bar, auto-advance
  useEffect(() => {
    if (phase !== "video") return
    const tickMs = 100
    const increment = 100 / (VIDEO_DURATION * (1000 / tickMs))
    const interval = setInterval(() => {
      setVideoProgress((prev) => {
        const next = prev + increment
        if (next >= 100) {
          clearInterval(interval)
          setPhase("interaction")
          return 100
        }
        return next
      })
    }, tickMs)
    return () => clearInterval(interval)
  }, [phase])

  // Phase 2: countdown
  useEffect(() => {
    if (phase !== "interaction") return
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!submittedRef.current) {
            submittedRef.current = true
            const trustLevel = getSliderTrustLevel(sliderValue[0])
            onSubmit(trustLevel)
          }
          return 0
        }
        if (prev <= 6) setShowHint(true)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Reset on scenario change
  useEffect(() => {
    setSliderValue([50])
    setPhase("video")
    setVideoProgress(0)
    setCountdown(COUNTDOWN_DURATION)
    setShowHint(false)
    setCommentUser(generateRandomCommentUser())
    submittedRef.current = false
  }, [scenario.id])

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    const trustLevel = getSliderTrustLevel(sliderValue[0])
    onSubmit(trustLevel)
  }, [sliderValue, onSubmit])

  // Circular timer geometry
  const circumference = 2 * Math.PI * 40
  const timerProgress = (countdown / COUNTDOWN_DURATION) * 100
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-medium text-balance">
          {phase === "video"
            ? "Watch the clip carefully."
            : "How trustworthy is this?"}
        </h1>
        {phase === "interaction" && (
          <p className="text-sm text-muted-foreground mt-1">Use the slider below.</p>
        )}
      </div>

      {/* Phone Mockup with Video */}
      <div className="flex-1 flex items-center justify-center py-4 min-h-0">
        <div className="relative">
          {/* Phone frame */}
          <div className="relative w-[280px] h-[500px] bg-zinc-900 rounded-[2.5rem] border-[3px] border-zinc-700 shadow-2xl overflow-hidden">
            {/* Phone notch area */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-black z-20 flex items-center justify-between px-6 pt-1">
              <div className="flex items-center gap-1">
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">LIVE</span>
                <span className="text-white/80 text-[10px] flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  {scenario.viewerCount || "12.4K"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-white/80">
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-1.5 bg-current rounded-full" />
                  <div className="w-0.5 h-2 bg-current rounded-full" />
                  <div className="w-0.5 h-2.5 bg-current rounded-full" />
                  <div className="w-0.5 h-3 bg-current rounded-full" />
                </div>
                <svg className="w-3 h-3 ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
                </svg>
              </div>
            </div>

            {/* Video content area */}
            <div className={`absolute inset-0 ${scenario.videoSrc ? "bg-black" : `bg-gradient-to-br ${scenario.thumbnailColor}`}`}>
              {scenario.videoSrc && (
                <video
                  key={scenario.videoSrc}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={scenario.videoSrc}
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="metadata"
                />
              )}
              <div className="absolute inset-0 bg-black/30" />
              
              {hasEngagement && (
                <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4 z-10">
                  {/* Profile */}
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/95 bg-zinc-700 text-sm font-bold text-white shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                      US
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">+</span>
                    </div>
                  </div>

                  {/* Heart */}
                  <div className="flex flex-col items-center">
                    <Heart className="w-7 h-7 text-white fill-white" />
                    <span className="text-white text-xs mt-1">{scenario.likes}</span>
                  </div>

                  {/* Comments */}
                  <div className="flex flex-col items-center">
                    <MessageCircle className="w-7 h-7 text-white fill-white" />
                    <span className="text-white text-xs mt-1">{scenario.comments}</span>
                  </div>

                  {/* Share */}
                  <div className="flex flex-col items-center">
                    <Share2 className="w-7 h-7 text-white" />
                    <span className="text-white text-xs mt-1">{scenario.shares}</span>
                  </div>
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-12 left-3 right-14 z-10">
                {scenario.source && (
                  <p className="text-white font-semibold text-sm">@{scenario.source.toLowerCase().replace(/\s+/g, '.')}</p>
                )}
                {scenario.description && (
                  <p className="text-white text-xs mt-1 leading-relaxed line-clamp-2">{scenario.description}</p>
                )}
                {scenario.hashtags && (
                  <p className="text-white/80 text-xs mt-1">{scenario.hashtags}</p>
                )}
              </div>

              {/* Comment input bar */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/60 border-t border-white/10 flex items-center px-3 gap-2">
                <span className="text-white/50 text-xs flex-1">Add comment...</span>
                <span className="text-xl">😊</span>
              </div>

              {/* Comment-like hint overlay – tiny transparent comment section */}
              {showHint && (
                <div className="absolute bottom-12 left-2 right-12 z-30 animate-live-comment">
                  <div className="rounded-xl border border-white/30 bg-black/62 px-2.5 py-2 shadow-xl backdrop-blur-md">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/75">Kommentare</p>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/45 bg-gradient-to-br from-zinc-300 to-zinc-500 text-[9px] font-bold text-zinc-900">
                        UB
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] leading-none text-white/80">
                          <span className="font-semibold text-white/95">{commentUser}</span> • gerade eben
                        </p>
                        <p className="mt-1 text-xs leading-snug text-white/95">{scenario.hint}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video progress bar (phase 1) */}
            {phase === "video" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 z-30 bg-white/20">
                <div
                  className="h-full bg-white"
                  style={{ width: `${videoProgress}%`, transition: "width 0.1s linear" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interaction phase controls */}
      {phase === "interaction" && (
        <div className="w-full max-w-xl space-y-4 pb-2">
          {/* Slider with gradient */}
          <div className="relative px-2">
            <div className="absolute inset-x-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 top-1/2 -translate-y-1/2" />
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              step={1}
              className="relative trust-slider"
            />
          </div>

          {/* Slider labels */}
          <div className="flex justify-between text-sm px-2">
            <span className="text-emerald-500 font-medium">Very trustworthy</span>
            <span className="text-amber-400 font-medium">Not sure</span>
            <span className="text-red-500 font-medium">Not trustworthy</span>
          </div>

          {/* Timer and Submit button */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-800" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-1000 ${countdown <= 5 ? "text-red-500" : "text-emerald-500"}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                  {countdown}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>

            <Button
              onClick={handleSubmit}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl"
            >
              Submit <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-1">
            {Array.from({ length: totalScenarios }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < currentIndex ? "bg-emerald-500" : i === currentIndex ? "bg-white" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Video phase bottom */}
      {phase === "video" && (
        <div className="pb-6 space-y-3 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Watch carefully before judging...</p>
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalScenarios }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < currentIndex ? "bg-emerald-500" : i === currentIndex ? "bg-white" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
