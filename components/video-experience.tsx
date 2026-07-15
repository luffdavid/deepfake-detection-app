"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Scenario, getSliderTrustLevel, TrustLevel, isCorrectAssessment } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { TRACK_IDS } from "@/lib/track-ids"
import { useAnalytics } from "@/hooks/use-analytics"
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
  Play,
} from "lucide-react"

const HINT_DELAY = 10

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
  sessionId: string | null
  onSubmit: (userTrust: TrustLevel) => void
}

export function VideoExperience({
  scenario,
  currentIndex,
  totalScenarios,
  sessionId,
  onSubmit,
}: VideoExperienceProps) {
  const { trackVideoReplay, trackSliderSubmitted } = useAnalytics()

  const [sliderValue, setSliderValue] = useState([50])
  const [phase, setPhase] = useState<"video" | "interaction">("video")
  const [videoProgress, setVideoProgress] = useState(0)
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
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [isVideoCompleteModalOpen, setIsVideoCompleteModalOpen] = useState(false)
  const [hasVideoPlayedOnce, setHasVideoPlayedOnce] = useState(false)
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

  // Show hint after a short delay, but do not auto-submit
  useEffect(() => {
    if (phase !== "interaction") return
    const timeout = setTimeout(() => {
      setShowHint(true)
    }, HINT_DELAY * 1000)
    return () => clearTimeout(timeout)
  }, [phase])

  // Reset on scenario change
  useEffect(() => {
    setSliderValue([50])
    setPhase("video")
    setVideoProgress(0)
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
    setIsVideoEnded(false)
    setIsVideoPlaying(true)
    setIsVideoCompleteModalOpen(false)
    submittedRef.current = false
  }, [scenario.id])

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true
    const trustLevel = getSliderTrustLevel(sliderRef.current)
    
    // Calculate accuracy: is the user's assessment correct?
    const isCorrect = isCorrectAssessment(trustLevel, scenario.recommendedTrust)
    
    // Track slider submission with accuracy
    if (sessionId) {
      trackSliderSubmitted(sessionId, scenario.id, String(sliderRef.current), isCorrect)
    }
    
    onSubmit(trustLevel)
  }, [onSubmit, scenario.id, scenario.recommendedTrust, sessionId, trackSliderSubmitted])

  const handleAddComment = useCallback(() => {
    const text = commentInput.trim()
    if (!text) return
    setComments((prev) => [
      { user: "you", text, likes: 0, time: "just now" },
      ...prev,
    ])
    setCommentInput("")
  }, [commentInput])

  const handleVideoClick = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      // Track replay event if video had ended
      if (isVideoEnded) {
        if (sessionId) {
          trackVideoReplay(sessionId, scenario.id)
        }
      }

      setIsVideoCompleteModalOpen(false)
      setIsVideoEnded(false) // hide overlay before/while replaying
      setPhase("video")
      video.play()
      setIsVideoPlaying(true)
    } else {
      video.pause()
      setIsVideoPlaying(false)
    }
  }, [isVideoEnded, scenario.id, sessionId, trackVideoReplay])

  const handleReplayVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (sessionId) {
      trackVideoReplay(sessionId, scenario.id)
    }

    video.currentTime = 0
    setVideoProgress(0)
    setIsVideoEnded(false)
    setIsVideoPlaying(true)
    setIsVideoCompleteModalOpen(false)
    setPhase("video")
    video.play()
  }, [scenario.id, sessionId, trackVideoReplay])

  const handleOpenRating = useCallback(() => {
    setIsVideoCompleteModalOpen(false)
    setPhase("interaction")
  }, [])

  const handleSkipVideo = useCallback(() => {
    const video = videoRef.current

    if (video) {
      video.pause()
    }

    setIsVideoPlaying(false)
    setIsVideoCompleteModalOpen(false)
    setPhase("interaction")
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden px-4 pt-2 pb-2">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-start gap-4">
      {/* Header */}
      {phase === "video" && (
        <div className="shrink-0 pt-10 text-center sm:pt-12">
          <h1
            data-track-id={TRACK_IDS.scenarioHeading}
            className="text-xl font-medium text-balance sm:text-5xl"
          >
            Watch the video carefully. Afterwards, rate how trustworthy it feels.
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-xl">
            Focus on details before making your judgment.
          </p>
        </div>
      )}

      {/* Interaction phase controls */}
      {phase === "interaction" && (
        <div className="flex w-full flex-1 items-center justify-center py-6 sm:py-8">
          <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-6 sm:gap-8">
            <div className="space-y-3 px-4 text-center sm:space-y-4">
              <h1
                data-track-id={TRACK_IDS.scenarioHeading}
                className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
              >
                How trustworthy was this?
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-xl">
                Move the slider, then submit your rating.
              </p>
            </div>

            <div className="w-full rounded-[2rem] border border-border/80 bg-card/75 p-6 shadow-xl backdrop-blur sm:p-10">
              <div className="space-y-7 sm:space-y-8">
                {/* Slider with gradient */}
                <div
                  data-track-id={TRACK_IDS.ratingSlider}
                  className="relative px-1 py-3 sm:px-2 sm:py-4"
                >
                  <div className="absolute top-1/2 inset-x-1 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 sm:inset-x-2 sm:h-4" />
                  <Slider
                    value={sliderValue}
                    onValueChange={(v) => { setSliderValue(v); sliderRef.current = v[0] }}
                    max={100}
                    step={1}
                    className="relative trust-slider [&_[data-slot=slider-thumb]]:size-7 [&_[data-slot=slider-thumb]]:border-4 sm:[&_[data-slot=slider-thumb]]:size-8 [&_[data-slot=slider-track]]:h-3 sm:[&_[data-slot=slider-track]]:h-4"
                  />
                  {/* Logically separated AOI markers (invisible, non-interactive,
                      percentage-based so they stay valid at any resolution). */}
                  <div
                    data-track-id={TRACK_IDS.ratingSliderTrackLeft}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
                  />
                  <div
                    data-track-id={TRACK_IDS.ratingSliderTrackRight}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
                  />
                  <div
                    data-track-id={TRACK_IDS.ratingSliderThumb}
                    aria-hidden="true"
                    style={{ left: `${sliderValue[0]}%` }}
                    className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 sm:h-8 sm:w-8"
                  />
                </div>

                {/* Slider labels */}
                <div
                  data-track-id={TRACK_IDS.ratingSliderLabels}
                  className="grid grid-cols-3 gap-2 px-1 text-center text-sm font-medium sm:px-2 sm:text-xl"
                >
                  <span className="text-emerald-500">Very trustworthy</span>
                  <span className="text-amber-400">Not sure</span>
                  <span className="text-red-500">Not trustworthy</span>
                </div>

                {/* Submit button */}
                <div className="w-full pt-1 sm:pt-2">
                  <Button
                    data-track-id={TRACK_IDS.ratingSubmitButton}
                    onClick={handleSubmit}
                    size="lg"
                    className="h-14 w-full rounded-2xl bg-emerald-600 text-xl font-semibold hover:bg-emerald-700 sm:h-16 sm:text-2xl"
                  >
                    Submit <ChevronRight className="ml-2 h-6 w-6 sm:h-7 sm:w-7" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Mockup with Video */}
      {phase === "video" && (
      <div className="w-full min-h-0 flex-1 py-0">
        <div className="flex h-full w-full flex-col items-center">
          <div className="relative flex w-full items-start justify-center">
          {/* Phone frame */}
          <div className="relative h-[min(72vh,calc(100vh-12rem))] sm:h-[min(74vh,calc(100vh-14rem))] aspect-[9/16] max-w-full bg-zinc-900 rounded-[2rem] border-[3px] border-zinc-700 shadow-2xl overflow-hidden">
            {/* Video content area */}
            <div
              data-track-id={TRACK_IDS.scenarioVideo}
              className={`absolute inset-0 transition-all duration-200 ${isVideoCompleteModalOpen ? "scale-[0.985] blur-sm" : "scale-100 blur-0"} ${scenario.videoSrc ? "bg-black" : `bg-gradient-to-br ${scenario.thumbnailColor}`}`}
              onClick={handleVideoClick}
            >
              {scenario.videoSrc && (
                <video
                  ref={videoRef}
                  key={scenario.videoSrc}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={scenario.videoSrc}
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => {
                    setIsVideoEnded(true)
                    setIsVideoPlaying(false)
                    setIsVideoCompleteModalOpen(true)
                    setHasVideoPlayedOnce(true)
                  }}
                />
              )}
              {!isVideoPlaying && (
                <button
                  data-track-id={TRACK_IDS.scenarioReplayButton}
                  type="button"
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/40"
                  aria-label="Replay video"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
                    <Play className="h-10 w-10 ml-1" />
                  </div>
                </button>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

              <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-4 px-5 pt-5">
                <ChevronLeft className="h-9 w-9 shrink-0 text-white" />
                <div
                  data-track-id={TRACK_IDS.scenarioSearchBar}
                  className="flex h-14 flex-1 items-center gap-3 rounded-full bg-white/15 px-4.5 backdrop-blur-sm"
                >
                  <Search className="h-7 w-7 shrink-0 text-white/70" />
                  <span className="flex-1 truncate text-lg text-white/70">Find similar content</span>
                  <span className="text-lg font-medium text-white">Search</span>
                </div>
              </div>

              <div className="absolute right-4 bottom-[13%] z-10 flex flex-col items-center gap-6.5">
                <div data-track-id={TRACK_IDS.scenarioProfile} className="relative mb-1">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-zinc-600">
                    {scenario.profileImage ? (
                      <img src={scenario.profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-white/80" />
                    )}
                  </div>
                  {!following && (
                    <button
                      data-track-id={TRACK_IDS.scenarioFollowButton}
                      onClick={(e) => {
                          e.stopPropagation()
                          setFollowing(true)
                        }
                      }
                      className="absolute -bottom-2 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-red-500 text-white"
                      aria-label="Follow"
                    >
                      <span className="text-lg leading-none">+</span>
                    </button>
                  )}
                </div>

                <button
                  data-track-id={TRACK_IDS.scenarioLikeButton}
                  onClick={(e) => {
                      e.stopPropagation()
                      setLiked((v) => !v)
                    }
                  }
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Like"
                >
                  <Heart className={`h-12 w-12 ${liked ? "fill-red-500 text-red-500" : "fill-white text-white"}`} />
                  <span className="mt-1 text-base font-semibold text-white">{formatCount(likeBase + (liked ? 1 : 0))}</span>
                </button>

                <button
                  data-track-id={TRACK_IDS.scenarioCommentButton}
                  onClick={(e) => {
                      e.stopPropagation()
                      setShowComments(true)
                    }
                  }
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Comments"
                >
                  <MessageCircle className="h-12 w-12 fill-white text-white" />
                  <span className="mt-1 text-base font-semibold text-white">{formatCount(commentCount)}</span>
                </button>

                <button
                  data-track-id={TRACK_IDS.scenarioSaveButton}
                  onClick={(e) => {
                      e.stopPropagation()
                      setSaved((v) => !v)
                    }
                  }
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Save"
                >
                  <Bookmark className={`h-12 w-12 ${saved ? "fill-amber-400 text-amber-400" : "fill-white text-white"}`} />
                  <span className="mt-1 text-base font-semibold text-white">{formatCount(saveBase + (saved ? 1 : 0))}</span>
                </button>

                <button
                  data-track-id={TRACK_IDS.scenarioShareButton}
                  className="flex flex-col items-center transition-transform active:scale-90"
                  aria-label="Share"
                >
                  <Share2 className="h-12 w-12 fill-white text-white" />
                  <span className="mt-1 text-base font-semibold text-white">{formatCount(shareBase)}</span>
                </button>

                <div className="mt-1 h-14 w-14 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-700">
                  {scenario.profileImage ? (
                    <img src={scenario.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-full w-full p-3 text-white/80" />
                  )}
                </div>
              </div>

              {/* Bottom info */}
              <div data-track-id={TRACK_IDS.scenarioCaption} className="absolute bottom-18 left-6 right-28 z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-zinc-600">
                    {scenario.profileImage ? (
                      <img src={scenario.profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-white/80" />
                    )}
                  </div>
                  <span className="text-xl font-semibold text-white">{accountName}</span>
                  {scenario.isVerified && (
                    <svg className="h-6 w-6 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.5l.9-2.9L3 10.7l2.6-1.5 1-2.8 3 .3L12 2z" />
                      <path d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3-3 1.1 1.1-4.1 4.1z" fill="#fff" />
                    </svg>
                  )}
                  <span className="text-lg text-white/60">· {postDate}</span>
                </div>
                <p className="mt-3 text-lg leading-snug text-white">
                  <span className="line-clamp-2">{caption}</span>
                  {scenario.hashtags && <span className="text-white/90"> {scenario.hashtags}</span>}
                  <span className="ml-1 text-white/60">more</span>
                </p>
              </div>

              {/* Comment input bar */}
              <button
                data-track-id={TRACK_IDS.scenarioCommentInput}
                onClick={(e) => {
                    e.stopPropagation()
                    setShowComments(true)
                  }
                }
                className="absolute bottom-0 left-0 right-0 z-10 flex h-16 items-center gap-3.5 border-t border-white/10 bg-black/70 px-4.5"
              >
                <span className="flex-1 text-left text-lg text-white/50">Add comment ...</span>
                <ImageIcon className="h-7 w-7 text-white/60" />
                <Smile className="h-7 w-7 text-white/60" />
                <AtSign className="h-7 w-7 text-white/60" />
              </button>

              {/* Auto hint comment overlay */}
              {showHint && !showComments && (
                <div
                  data-track-id={TRACK_IDS.scenarioHint}
                  className="absolute bottom-16 left-4 right-16 z-30 animate-live-comment"
                >
                  <div className="rounded-xl border border-white/30 bg-black/62 px-4 py-3.5 shadow-xl backdrop-blur-md">
                    <p className="mb-2 text-base font-medium uppercase tracking-wide text-white/75">Comments</p>
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/45 bg-gradient-to-br from-zinc-300 to-zinc-500 text-sm font-bold text-zinc-900">
                        UB
                      </div>
                      <div className="min-w-0">
                        <p className="text-base leading-none text-white/80">
                          <span className="font-semibold text-white/95">{commentUser}</span> • just now
                        </p>
                        <p className="mt-2 text-lg leading-snug text-white/95">{scenario.hint}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments panel */}
              {showComments && (
                <div className="absolute inset-0 z-40 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-black/40" 
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowComments(false)
                      }
                    } />
                  <div className="animate-comments-up relative flex max-h-[80%] flex-col rounded-t-2xl bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4.5">
                      <span className="text-xl font-semibold text-white">{formatCount(commentCount)} Comments</span>
                      <button onClick={(e) => { 
                            e.stopPropagation()
                            setShowComments(false)
                          } 
                        }
                        aria-label="Close">
                        <X className="h-8 w-8 text-white/70" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-6 overflow-hidden px-5 py-4.5">
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 text-base font-bold text-zinc-900">
                          UB
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base text-white/60">
                            <span className="font-semibold text-white/90">{commentUser}</span> · just now
                          </p>
                          <p className="mt-2 text-lg leading-snug text-white/95">{scenario.hint}</p>
                        </div>
                        <div className="flex flex-col items-center pt-0.5">
                          <Heart className="h-6 w-6 text-white/50" />
                          <span className="text-base text-white/50">{hintLikes}</span>
                        </div>
                      </div>
                      {comments.map((c, i) => (
                        <div key={i} className="flex items-start gap-3.5">
                          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${c.user === "you" ? "bg-emerald-600" : "bg-zinc-700"}`}>
                            <User className="h-6 w-6 text-white/70" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base text-white/60">
                              <span className="font-semibold text-white/90">{c.user === "you" ? "You" : c.user}</span> · {c.time}
                            </p>
                            <p className="mt-2 text-lg leading-snug text-white/95">{c.text}</p>
                          </div>
                          <div className="flex flex-col items-center pt-0.5">
                            <Heart className="h-6 w-6 text-white/50" />
                            <span className="text-base text-white/50">{c.likes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3.5 border-t border-white/10 px-4.5 py-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                        <User className="h-7 w-7 text-white/70" />
                      </div>
                      <input
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment()
                        }}
                        placeholder="Add comment ..."
                        className="flex-1 rounded-full bg-zinc-800 px-4.5 py-3 text-lg text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                        className="text-lg font-semibold text-emerald-400 disabled:text-white/30"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video progress bar */}
            <div className="absolute bottom-16 left-0 right-0 z-30 h-2 bg-white/20">
              <div
                className="h-full bg-white"
                style={{ width: `${videoProgress}%`, transition: "width 0.1s linear" }}
              />
            </div>
          </div>
          </div>

          {/* Progress dots */}
          <div data-track-id={TRACK_IDS.scenarioProgress} className="mt-10 flex justify-center gap-2">
            {Array.from({ length: totalScenarios }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < currentIndex ? "bg-emerald-500" : i === currentIndex ? "bg-white" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {hasVideoPlayedOnce && (
            <div className="mr-70 mt-3 flex w-full justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipVideo}
                className="h-16 rounded-2xl px-8 text-xl font-semibold"
              >
                Skip video
                <ChevronRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
      </div>
      )}
      <Dialog open={isVideoCompleteModalOpen} onOpenChange={setIsVideoCompleteModalOpen}>
        <DialogContent
          className="border-emerald-500/20 bg-slate-950 p-7 text-white sm:max-w-lg sm:p-8"
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="items-center text-center sm:items-center sm:text-center">
            <DialogTitle className="text-2xl text-white sm:text-3xl">Ready to rate how trustworthy the video was?</DialogTitle>
            <DialogDescription className="max-w-md text-base leading-relaxed text-slate-300">
              If you need to watch the video again before rating, you can replay it. Otherwise, click "Rate now" to submit your trust rating.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:grid sm:grid-cols-2 mb-20">
            <Button
              type="button"
              variant="outline"
              className="h-12 border-slate-700 bg-slate-900 text-base text-slate-100 hover:bg-slate-800 hover:text-white"
              onClick={handleReplayVideo}
            >
              Replay
            </Button>
            <Button
              type="button"
              className="h-12 bg-emerald-600 text-base text-white hover:bg-emerald-700"
              onClick={handleOpenRating}
            >
              Rate now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
