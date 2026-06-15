"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Scenario, getSliderTrustLevel, TrustLevel } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Search,
  ImageIcon,
  AtSign,
  Smile,
  X,
  User,
} from "lucide-react"

const VIDEO_DURATION = 7   // seconds before the interaction controls appear
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

function generateRandomDate(): string {
  const day = Math.floor(Math.random() * 30) + 1
  return `2026-06-${String(day).padStart(2, "0")}`
}

const FAKE_COMMENT_TEXTS = [
  "Wait, is this actually real?? 😳",
  "No way this is true...",
  "My cousin works in media and says this checks out 👀",
  "Sharing this with everyone right now!!",
  "Something feels off about this tbh",
  "Source? I can't find this anywhere else",
  "This has to be fake right?",
  "Why is nobody else talking about this?!",
  "Finally someone says it 🙌",
  "I don't believe a word of this",
  "The way they edited this is wild",
  "Stay safe out there everyone 🙏",
]

interface FakeComment {
  user: string
  text: string
  likes: number
  time: string
}

function generateFakeComments(): FakeComment[] {
  const pool = [...FAKE_COMMENT_TEXTS]
  const result: FakeComment[] = []
  const count = 5
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    const text = pool.splice(idx, 1)[0]
    result.push({
      user: generateRandomCommentUser(),
      text,
      likes: Math.floor(Math.random() * 2400),
      time: `${Math.floor(Math.random() * 22) + 1}h`,
    })
  }
  return result
}

function parseCount(value?: string): number {
  if (!value) return 0
  const digits = value.replace(/[^0-9]/g, "")
  return digits ? parseInt(digits, 10) : 0
}

function formatCount(value: number): string {
  return value.toLocaleString("de-DE")
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
  const [hintLikes, setHintLikes] = useState(() => Math.floor(Math.random() * 50))
  const [postDate, setPostDate] = useState(generateRandomDate)
  const [comments, setComments] = useState<FakeComment[]>(generateFakeComments)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [following, setFollowing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState("")
  const submittedRef = useRef(false)
  const sliderRef = useRef(50) // immer aktueller Slider-Wert

  const videoRef = useRef<HTMLVideoElement>(null)

  const accountName = scenario.source
    ? scenario.source.toLowerCase().replace(/\s+/g, ".")
    : "news.daily"
  const caption = scenario.description || scenario.title
  const likeBase = parseCount(scenario.likes) || 1371
  const commentBase = parseCount(scenario.comments) || 5
  const shareBase = parseCount(scenario.shares) || 346
  const saveBase = 311
  const commentCount = commentBase + Math.max(0, comments.length - 5)

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.duration || Number.isNaN(video.duration)) return
    setVideoProgress((video.currentTime / video.duration) * 100)
  }, [])

  // Phase 1: show the interaction controls after a short delay, video keeps playing
  useEffect(() => {
    if (phase !== "video") return
    const timeout = setTimeout(() => setPhase("interaction"), VIDEO_DURATION * 1000)
    return () => clearTimeout(timeout)
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
            const trustLevel = getSliderTrustLevel(sliderRef.current)
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
    setHintLikes(Math.floor(Math.random() * 50))
    setPostDate(generateRandomDate())
    setComments(generateFakeComments())
    setLiked(false)
    setSaved(false)
    setFollowing(false)
    setShowComments(false)
    setCommentInput("")
    submittedRef.current = false
  }, [scenario.id])

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    const trustLevel = getSliderTrustLevel(sliderRef.current)
    onSubmit(trustLevel)
  }, [sliderValue, onSubmit])

  const handleAddComment = useCallback(() => {
    const text = commentInput.trim()
    if (!text) return
    setComments((prev) => [
      { user: "you", text, likes: 0, time: "gerade eben" },
      ...prev,
    ])
    setCommentInput("")
  }, [commentInput])

  // Circular timer geometry
  const circumference = 2 * Math.PI * 40
  const timerProgress = (countdown / COUNTDOWN_DURATION) * 100
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between p-4 overflow-hidden">
      {/* Header */}
      <div className="text-center pt-1 shrink-0">
        <h1 className="text-xl sm:text-2xl font-medium text-balance">
          {phase === "video"
            ? "Watch the clip carefully."
            : "How trustworthy is this?"}
        </h1>
        {phase === "interaction" && (
          <p className="text-sm text-muted-foreground mt-1">Use the slider below.</p>
        )}
      </div>

      {/* Phone Mockup with Video */}
      <div className="flex-1 flex items-center justify-center py-3 min-h-0 w-full">
        <div className="relative h-full flex items-center justify-center">
          {/* Phone frame */}
          <div className="relative h-full max-h-[760px] aspect-[9/16] max-w-full bg-zinc-900 rounded-[2rem] border-[3px] border-zinc-700 shadow-2xl overflow-hidden">
            {/* Video content area */}
            <div className={`absolute inset-0 ${scenario.videoSrc ? "bg-black" : `bg-gradient-to-br ${scenario.thumbnailColor}`}`}>
              {scenario.videoSrc && (
                <video
                  ref={videoRef}
                  key={scenario.videoSrc}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={scenario.videoSrc}
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

              <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-2.5 pt-2.5">
                <ChevronLeft className="w-5 h-5 text-white shrink-0" />
                <div className="flex-1 flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-2.5 h-7">
                  <Search className="w-3.5 h-3.5 text-white/70 shrink-0" />
                  <span className="flex-1 truncate text-[11px] text-white/70">Finde ähnliche Inhalte</span>
                  <span className="text-[11px] font-medium text-white">Suchen</span>
                </div>
              </div>

              <div className="absolute right-1.5 bottom-[13%] z-10 flex flex-col items-center gap-3.5">
                <div className="relative mb-1">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-zinc-600">
                    {scenario.profileImage ? (
                      <img src={scenario.profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-white/80" />
                    )}
                  </div>
                  {!following && (
                    <button
                      onClick={() => setFollowing(true)}
                      className="absolute -bottom-1.5 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-white"
                      aria-label="Folgen"
                    >
                      <span className="text-xs leading-none">+</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setLiked((v) => !v)}
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Gefällt mir"
                >
                  <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "fill-white text-white"}`} />
                  <span className="mt-0.5 text-[10px] font-medium text-white">{formatCount(likeBase + (liked ? 1 : 0))}</span>
                </button>

                <button
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Kommentare"
                >
                  <MessageCircle className="w-6 h-6 fill-white text-white" />
                  <span className="mt-0.5 text-[10px] font-medium text-white">{formatCount(commentCount)}</span>
                </button>

                <button
                  onClick={() => setSaved((v) => !v)}
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Speichern"
                >
                  <Bookmark className={`w-6 h-6 ${saved ? "fill-amber-400 text-amber-400" : "fill-white text-white"}`} />
                  <span className="mt-0.5 text-[10px] font-medium text-white">{formatCount(saveBase + (saved ? 1 : 0))}</span>
                </button>

                <button
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Teilen"
                >
                  <Share2 className="w-6 h-6 fill-white text-white" />
                  <span className="mt-0.5 text-[10px] font-medium text-white">{formatCount(shareBase)}</span>
                </button>

                <div className="mt-1 h-8 w-8 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-700">
                  {scenario.profileImage ? (
                    <img src={scenario.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-full w-full p-1.5 text-white/80" />
                  )}
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-12 left-3 right-16 z-10">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-zinc-600">
                    {scenario.profileImage ? (
                      <img src={scenario.profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-white/80" />
                    )}
                  </div>
                  <span className="text-white font-semibold text-sm">{accountName}</span>
                  {scenario.isVerified && (
                    <svg className="h-3.5 w-3.5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.5l.9-2.9L3 10.7l2.6-1.5 1-2.8 3 .3L12 2z" />
                      <path d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3-3 1.1 1.1-4.1 4.1z" fill="#fff" />
                    </svg>
                  )}
                  <span className="text-white/60 text-xs">· {postDate}</span>
                </div>
                <p className="mt-1.5 text-xs leading-snug text-white">
                  <span className="line-clamp-2">{caption}</span>
                  {scenario.hashtags && <span className="text-white/90"> {scenario.hashtags}</span>}
                  <span className="ml-1 text-white/60">mehr</span>
                </p>
              </div>

              {/* Comment input bar */}
              <button
                onClick={() => setShowComments(true)}
                className="absolute bottom-0 left-0 right-0 z-10 flex h-10 items-center gap-2 border-t border-white/10 bg-black/70 px-3"
              >
                <span className="flex-1 text-left text-xs text-white/50">Kommentar hinzufügen ...</span>
                <ImageIcon className="h-4 w-4 text-white/60" />
                <Smile className="h-4 w-4 text-white/60" />
                <AtSign className="h-4 w-4 text-white/60" />
              </button>

              {/* Auto hint comment overlay */}
              {showHint && !showComments && (
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

              {/* Comments panel */}
              {showComments && (
                <div className="absolute inset-0 z-40 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowComments(false)} />
                  <div className="animate-comments-up relative flex max-h-[72%] flex-col rounded-t-2xl bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <span className="text-sm font-semibold text-white">{formatCount(commentCount)} Kommentare</span>
                      <button onClick={() => setShowComments(false)} aria-label="Schließen">
                        <X className="h-5 w-5 text-white/70" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 text-[10px] font-bold text-zinc-900">
                          UB
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-white/60">
                            <span className="font-semibold text-white/90">{commentUser}</span> · gerade eben
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-white/95">{scenario.hint}</p>
                        </div>
                        <div className="flex flex-col items-center pt-0.5">
                          <Heart className="h-3.5 w-3.5 text-white/50" />
                          <span className="text-[10px] text-white/50">{hintLikes}</span>
                        </div>
                      </div>
                      {comments.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.user === "you" ? "bg-emerald-600" : "bg-zinc-700"}`}>
                            <User className="h-4 w-4 text-white/70" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-white/60">
                              <span className="font-semibold text-white/90">{c.user === "you" ? "Du" : c.user}</span> · {c.time}
                            </p>
                            <p className="mt-0.5 text-xs leading-snug text-white/95">{c.text}</p>
                          </div>
                          <div className="flex flex-col items-center pt-0.5">
                            <Heart className="h-3.5 w-3.5 text-white/50" />
                            <span className="text-[10px] text-white/50">{c.likes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                        <User className="h-4 w-4 text-white/70" />
                      </div>
                      <input
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment()
                        }}
                        placeholder="Kommentar hinzufügen ..."
                        className="flex-1 rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                        className="text-xs font-semibold text-emerald-400 disabled:text-white/30"
                      >
                        Posten
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video progress bar */}
            <div className="absolute bottom-10 left-0 right-0 z-30 h-[3px] bg-white/20">
              <div
                className="h-full bg-white"
                style={{ width: `${videoProgress}%`, transition: "width 0.1s linear" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interaction phase controls */}
      {phase === "interaction" && (
        <div className="w-full max-w-xl space-y-3 pb-1 shrink-0">
          {/* Slider with gradient */}
          <div className="relative px-2">
            <div className="absolute inset-x-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 top-1/2 -translate-y-1/2" />
            <Slider
              value={sliderValue}
              onValueChange={(v) => { setSliderValue(v); sliderRef.current = v[0] }}
              max={100}
              step={1}
              className="relative trust-slider"
            />
          </div>

          {/* Slider labels */}
          <div className="flex justify-between text-xs sm:text-sm px-2">
            <span className="text-emerald-500 font-medium">Very trustworthy</span>
            <span className="text-amber-400 font-medium">Not sure</span>
            <span className="text-red-500 font-medium">Not trustworthy</span>
          </div>

          {/* Timer and Submit button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="5" className="text-zinc-800" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-1000 ${countdown <= 5 ? "text-red-500" : "text-emerald-500"}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-base font-bold">
                  {countdown}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">seconds</span>
            </div>

            <Button
              onClick={handleSubmit}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-5 text-base rounded-xl"
            >
              Submit <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          {/* Progress dots */}
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

      {/* Video phase bottom */}
      {phase === "video" && (
        <div className="pb-3 space-y-2 text-center shrink-0">
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
