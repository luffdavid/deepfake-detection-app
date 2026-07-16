"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Scenario, getSliderTrustLevel, TrustLevel, isCorrectAssessment } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { TRACK_IDS } from "@/lib/track-ids"
import { useAnalytics } from "@/hooks/use-analytics"
import {
  Heart,
  HeartOff,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  Check,
  Repeat2,
  Link2,
  Ghost,
  Building2,
  Smartphone,
  Flag,
  Download,
  PlusCircle,
  Flame,
  Cast,
  ImageIcon,
  AtSign,
  Smile,
  X,
  User,
  Play,
  Delete,
} from "lucide-react"

const HINT_DELAY = 10

const TOUCH_KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
]

function generateRandomCommentUser(): string {
  const prefixes = [
    "daily",
    "real",
    "urban",
    "late",
    "chill",
    "watch",
    "media",
    "honest",
    "quick",
    "street",
    "vibe",
    "focus",
  ]
  const suffixes = [
    "mike",
    "lena",
    "noah",
    "emma",
    "alex",
    "tay",
    "sam",
    "leo",
    "nina",
    "max",
    "kai",
    "jules",
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

interface FakeComment {
  user: string
  text: string
  likes: number
  time: string
  liked?: boolean
}

const SCENARIO_EXPERT_COMMENT_SETS: Record<string, FakeComment[]> = {
  "hantavirus-video1": [
    { user: "factpulse", text: "The edit looks very polished, which is exactly why it feels believable.", likes: 842, time: "2h" },
    { user: "cityfeed_muc", text: "The panic tone is what throws me off here.", likes: 611, time: "4h" },
    { user: "newswatcher_de", text: "The voiceover sounds a little too clean and scripted.", likes: 953, time: "3h" },
    { user: "safeclicks", text: "Anything that pushes urgency this hard makes me pause.", likes: 487, time: "5h" },
    { user: "clipnotes", text: "Fear + urgency is a classic combo for viral bait.", likes: 396, time: "6h" },
  ],
  "trading-video2": [
    { user: "marketmind", text: "Whenever someone says it's guaranteed, I instantly check out.", likes: 1162, time: "1h" },
    { user: "chartcheck", text: "Looks flashy, but the whole thing feels like performance.", likes: 889, time: "2h" },
    { user: "riskradar", text: "Profit screenshots are the easiest thing to fake.", likes: 734, time: "3h" },
    { user: "scamwatch", text: "The DM funnel pattern is way too familiar.", likes: 1024, time: "2h" },
    { user: "invest_basics", text: "Real investing never sounds this easy.", likes: 678, time: "4h" },
  ],
  "donationappeal-video3": [
    { user: "charitycheck", text: "This is emotionally intense, I almost tapped right away.", likes: 944, time: "2h" },
    { user: "kindsoul_s", text: "I almost donated immediately, then took a second look.", likes: 636, time: "3h" },
    { user: "watchcare", text: "It really pushes you to decide fast.", likes: 812, time: "2h" },
    { user: "civiccheck", text: "Sad content, but it also feels very staged.", likes: 705, time: "4h" },
    { user: "trustverify", text: "Heart first, then brain. Always.", likes: 522, time: "5h" },
  ],
  "product-recall-video4": [
    { user: "consumerwatch", text: "This tone is pure panic and feels like ragebait.", likes: 1034, time: "1h" },
    { user: "foodsafety_facts", text: "\"Share now\" is always a weird signal to me.", likes: 744, time: "2h" },
    { user: "newsliteracy_lab", text: "It creates stress instead of giving clear info.", likes: 916, time: "3h" },
    { user: "regina_muc", text: "I usually skip panic clips like this now.", likes: 582, time: "4h" },
    { user: "factfinder_koeln", text: "Lots of drama, not much substance.", likes: 471, time: "5h" },
  ],
  "tagesschau-video5": [
    { user: "policywatch", text: "Finally a calm clip that just explains the update.", likes: 731, time: "2h" },
    { user: "annika_news", text: "The tone alone makes this feel more trustworthy.", likes: 918, time: "3h" },
    { user: "verifyfirst", text: "Clear, short, no drama. Love that.", likes: 702, time: "2h" },
    { user: "bundespolitik_live", text: "Feels good to watch something that is not overhyped.", likes: 648, time: "4h" },
    { user: "media_literacy_mia", text: "More news clips should sound like this.", likes: 533, time: "5h" },
  ],
}

const SCENARIO_TIKTOK_COMMENT_SETS: Record<string, FakeComment[]> = {
  "hantavirus-video1": [
    { user: "lisa_247", text: "ok this actually got me for a second", likes: 1735, time: "1h" },
    { user: "mucgirl", text: "i legit thought this was a real tv segment", likes: 2241, time: "2h" },
    { user: "itsnoah", text: "why does this feel so stressful to watch", likes: 1302, time: "3h" },
    { user: "jana_live", text: "this is exactly the type of clip people reshare too fast", likes: 1691, time: "2h" },
  ],
  "trading-video2": [
    { user: "moneyboy_tim", text: "the second i hear \"easy money\" i am out", likes: 2558, time: "1h" },
    { user: "nina.crypto", text: "comment section feels botted ngl", likes: 1783, time: "2h" },
    { user: "justemre", text: "dm for details is always the same play", likes: 2110, time: "2h" },
    { user: "laurafinance", text: "looks cool but feels zero percent legit", likes: 1629, time: "4h" },
  ],
  "donationappeal-video3": [
    { user: "sofie_help", text: "i was literally two seconds away from donating", likes: 1972, time: "1h" },
    { user: "momo23", text: "this is edited to hit you right in the feelings", likes: 1331, time: "3h" },
    { user: "karo_talks", text: "these clips make you tap before you think", likes: 1718, time: "2h" },
    { user: "tobi_real", text: "\"every second counts\" puts so much pressure on you", likes: 1494, time: "4h" },
  ],
  "product-recall-video4": [
    { user: "lea_snacks", text: "i am so tired of panic clips like this", likes: 2148, time: "1h" },
    { user: "davidcheckt", text: "\"share before they delete\" is such a trigger line", likes: 2391, time: "2h" },
    { user: "miro_berlin", text: "this feels more like outrage content than info", likes: 1677, time: "3h" },
    { user: "sarah_ju", text: "these days this style makes me instantly suspicious", likes: 1288, time: "4h" },
  ],
  "tagesschau-video5": [
    { user: "paula_news", text: "finally a clip without dramatic music", likes: 1675, time: "2h" },
    { user: "nils_ho", text: "this is how i like news: calm and clear", likes: 1962, time: "3h" },
    { user: "miafacts", text: "instantly feels way more trustworthy", likes: 1517, time: "2h" },
    { user: "jonas_muc", text: "more videos like this, less panic content please", likes: 1111, time: "5h" },
  ],
}

function pickRandomItems<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const result: T[] = []

  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    const [item] = pool.splice(idx, 1)
    result.push(item)
  }

  return result
}

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getCommentsForScenario(scenarioId: string): FakeComment[] {
  const expertComments = SCENARIO_EXPERT_COMMENT_SETS[scenarioId]
  const tiktokComments = SCENARIO_TIKTOK_COMMENT_SETS[scenarioId]

  if (!expertComments && !tiktokComments) return []

  const selectedExpert = expertComments ? pickRandomItems(expertComments, 2) : []
  const selectedTiktok = tiktokComments ? pickRandomItems(tiktokComments, 3) : []

  return shuffleItems([...selectedExpert, ...selectedTiktok])
}

function parseCount(value?: string): number {
  if (!value) return 0
  const digits = value.replace(/[^0-9]/g, "")
  return digits ? parseInt(digits, 10) : 0
}

function formatCount(value: number): string {
  return value.toLocaleString("de-DE")
}

function getSimilarContentTags(scenario: Scenario): string[] {
  const hashtagTags =
    scenario.hashtags
      ?.split(" ")
      .map((tag) => tag.trim())
      .filter((tag) => tag.startsWith("#")) ?? []

  const sourceTag = scenario.source
    ? `#${scenario.source.toLowerCase().replace(/[^a-z0-9]+/g, "")}`
    : ""

  const fallbackByScenario: Record<string, string[]> = {
    "hantavirus-video1": ["#breakingnews", "#healthalert", "#munich"],
    "trading-video2": ["#cryptotips", "#trading101", "#sidehustle"],
    "donationappeal-video3": ["#charitytok", "#urgentappeal", "#helpnow"],
    "product-recall-video4": ["#consumerwarning", "#factcheck", "#viralnews"],
    "tagesschau-video5": ["#newsupdate", "#bundestag", "#politics"],
  }

  const uniqueTags = Array.from(
    new Set(
      [...hashtagTags, sourceTag, ...(fallbackByScenario[scenario.id] ?? []), "#fyp"].filter(Boolean),
    ),
  )

  return uniqueTags.slice(0, 5)
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
  const [hintLiked, setHintLiked] = useState(false)
  const [postDate, setPostDate] = useState(generateRandomDate)
  const [comments, setComments] = useState<FakeComment[]>(() =>
    getCommentsForScenario(scenario.id),
  )
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shareCount, setShareCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState("")
  const [showTouchKeyboard, setShowTouchKeyboard] = useState(false)
  const [keyboardUppercase, setKeyboardUppercase] = useState(true)
  const [showSearchPulse, setShowSearchPulse] = useState(false)
  const [showSimilarContentOverlay, setShowSimilarContentOverlay] = useState(false)
  const [similarContentTags, setSimilarContentTags] = useState<string[]>(() =>
    getSimilarContentTags(scenario),
  )
  const [showSharePulse, setShowSharePulse] = useState(false)
  const [showShareOverlay, setShowShareOverlay] = useState(false)
  const [showShareSuccess, setShowShareSuccess] = useState(false)
  const [shareSuccessLabel, setShareSuccessLabel] = useState<string>("Shared")
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [hasVideoPlayedOnce, setHasVideoPlayedOnce] = useState(false)
  const submittedRef = useRef(false)
  const sliderRef = useRef(50) // immer aktueller Slider-Wert
  const pendingReplayRef = useRef(false)
  const searchPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchOverlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sharePulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareOverlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const clearSearchEffectTimeouts = useCallback(() => {
    if (searchPulseTimeoutRef.current) {
      clearTimeout(searchPulseTimeoutRef.current)
      searchPulseTimeoutRef.current = null
    }
    if (searchOverlayTimeoutRef.current) {
      clearTimeout(searchOverlayTimeoutRef.current)
      searchOverlayTimeoutRef.current = null
    }
  }, [])

  const clearShareEffectTimeouts = useCallback(() => {
    if (sharePulseTimeoutRef.current) {
      clearTimeout(sharePulseTimeoutRef.current)
      sharePulseTimeoutRef.current = null
    }
    if (shareOverlayTimeoutRef.current) {
      clearTimeout(shareOverlayTimeoutRef.current)
      shareOverlayTimeoutRef.current = null
    }
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
    setHintLiked(false)
    setPostDate(generateRandomDate())
    setComments(getCommentsForScenario(scenario.id))
    setLiked(false)
    setSaved(false)
    setShareCount(0)
    setFollowing(false)
    setShowComments(false)
    setCommentInput("")
    setShowTouchKeyboard(false)
    setKeyboardUppercase(true)
    setShowSearchPulse(false)
    setShowSimilarContentOverlay(false)
    setSimilarContentTags(getSimilarContentTags(scenario))
    setShowSharePulse(false)
    setShowShareOverlay(false)
    setShowShareSuccess(false)
    setShareSuccessLabel("Shared")
    setIsVideoEnded(false)
    setIsVideoPlaying(true)
    submittedRef.current = false
    clearSearchEffectTimeouts()
    clearShareEffectTimeouts()
  }, [clearSearchEffectTimeouts, clearShareEffectTimeouts, scenario])

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
    setShowTouchKeyboard(false)
    setKeyboardUppercase(true)
  }, [commentInput])

  const handleTouchKey = useCallback((key: string) => {
    if (key === "backspace") {
      setCommentInput((value) => value.slice(0, -1))
      return
    }
    if (key === "space") {
      setCommentInput((value) => `${value} `)
      return
    }

    setCommentInput((value) => `${value}${keyboardUppercase ? key.toUpperCase() : key}`)
    if (keyboardUppercase) setKeyboardUppercase(false)
  }, [keyboardUppercase])

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
    if (sessionId) {
      trackVideoReplay(sessionId, scenario.id)
    }

    setVideoProgress(0)
    setIsVideoEnded(false)
    setIsVideoPlaying(true)
    pendingReplayRef.current = true
    setPhase("video")
  }, [scenario.id, sessionId, trackVideoReplay])

  // Play video after it remounts when returning from interaction phase
  useEffect(() => {
    if (phase !== "video" || !pendingReplayRef.current) return
    const video = videoRef.current
    if (!video) return
    pendingReplayRef.current = false
    video.currentTime = 0
    video.play()
  }, [phase])

  const handleSkipVideo = useCallback(() => {
    const video = videoRef.current

    if (video) {
      video.pause()
    }

    setIsVideoPlaying(false)
    setPhase("interaction")
  }, [])

  const handleFindSimilarContent = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      clearSearchEffectTimeouts()

      setSimilarContentTags(shuffleItems(getSimilarContentTags(scenario)).slice(0, 5))
      setShowSearchPulse(true)
      setShowSimilarContentOverlay(true)

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([18, 28, 18])
      }

      searchPulseTimeoutRef.current = setTimeout(() => {
        setShowSearchPulse(false)
      }, 550)

      searchOverlayTimeoutRef.current = setTimeout(() => {
        setShowSimilarContentOverlay(false)
      }, 3200)
    },
    [clearSearchEffectTimeouts, scenario],
  )

  const handleShareTap = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      clearShareEffectTimeouts()

      setShowSharePulse(true)
      setShowShareOverlay(true)
      setShowShareSuccess(false)

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([16, 16])
      }

      sharePulseTimeoutRef.current = setTimeout(() => {
        setShowSharePulse(false)
      }, 480)
    },
    [clearShareEffectTimeouts],
  )

  const handleShareActionSelect = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, label: string) => {
      e.stopPropagation()
      clearShareEffectTimeouts()

      setShareCount((count) => count + 1)
      setShareSuccessLabel(`Shared via ${label}`)
      setShowShareSuccess(true)

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([12, 18, 12])
      }

      shareOverlayTimeoutRef.current = setTimeout(() => {
        setShowShareOverlay(false)
        setShowShareSuccess(false)
      }, 900)
    },
    [clearShareEffectTimeouts],
  )

  useEffect(() => {
    return () => {
      clearSearchEffectTimeouts()
      clearShareEffectTimeouts()
    }
  }, [clearSearchEffectTimeouts, clearShareEffectTimeouts])

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

                  <div className="mt-4 flex justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReplayVideo}
                      className="h-11 rounded-xl px-4 text-sm font-medium sm:h-12 sm:px-5 sm:text-base"
                    >
                      Back to video
                    </Button>
                  </div>
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
              className={`absolute inset-0 transition-all duration-200 scale-100 blur-0 ${scenario.videoSrc ? "bg-black" : `bg-gradient-to-br ${scenario.thumbnailColor}`}`}
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
                    setHasVideoPlayedOnce(true)
                    setPhase("interaction")
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
                <button
                  type="button"
                  onClick={handleFindSimilarContent}
                  data-track-id={TRACK_IDS.scenarioSearchBar}
                  className={`flex h-14 flex-1 items-center gap-3 rounded-full px-4.5 backdrop-blur-sm transition-all duration-300 ${
                    showSearchPulse
                      ? "scale-[1.03] bg-cyan-200/25 ring-2 ring-cyan-300/80 shadow-[0_0_32px_rgba(34,211,238,0.45)]"
                      : "bg-white/15"
                  }`}
                >
                  <Search className={`h-7 w-7 shrink-0 ${showSearchPulse ? "text-cyan-200" : "text-white/70"}`} />
                  <span className="flex-1 truncate text-left text-lg text-white/85">Find similar content</span>
                  <span className="text-lg font-medium text-white">Search</span>
                </button>
              </div>

              {showSimilarContentOverlay && (
                <div className="pointer-events-none absolute top-20 left-4 right-4 z-30">
                  <div className="overflow-hidden rounded-2xl border border-white/30 bg-black/70 px-4 py-3.5 shadow-2xl backdrop-blur-md">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 animate-pulse text-cyan-300" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Discover</p>
                      <span className="ml-auto text-xs font-medium text-emerald-300">Live matches</span>
                    </div>
                    <p className="text-sm text-white/75">People are watching these related topics right now:</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {similarContentTags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className={`rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-semibold text-white ${
                            index % 2 === 0 ? "animate-pulse" : ""
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-300" />
                    </div>
                  </div>
                </div>
              )}

              {showShareOverlay && (
                <div className="absolute inset-0 z-40 flex flex-col justify-end">
                  <button
                    type="button"
                    aria-label="Close share sheet"
                    className="absolute inset-0 bg-black/45"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearShareEffectTimeouts()
                      setShowShareOverlay(false)
                      setShowShareSuccess(false)
                    }}
                  />

                  <div
                    className="relative rounded-t-[1.6rem] bg-zinc-900 text-white shadow-2xl animate-comments-up"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {showShareSuccess && (
                      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/92 px-4 py-1.5 text-sm font-medium text-white shadow-xl">
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-emerald-400" />
                          {shareSuccessLabel}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center px-4 py-3">
                      <Search className="h-8 w-8 text-white/80" />
                      <p className="flex-1 text-center text-2xl font-semibold">Send to</p>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearShareEffectTimeouts()
                          setShowShareOverlay(false)
                          setShowShareSuccess(false)
                        }}
                        className="rounded-full p-1 text-white/80 hover:bg-white/10"
                      >
                        <X className="h-8 w-8" />
                      </button>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="space-y-6 px-4 pt-5 pb-7">
                      <div className="flex flex-wrap justify-center gap-5 pb-1">
                        {[
                          { label: "Repost", Icon: Repeat2, iconClass: "bg-yellow-400 text-zinc-900" },
                          { label: "WhatsApp", Icon: MessageCircle, iconClass: "bg-emerald-500 text-white" },
                          { label: "Copy link", Icon: Link2, iconClass: "bg-blue-500 text-white" },
                          { label: "Snapchat", Icon: Ghost, iconClass: "bg-yellow-300 text-zinc-900" },
                          { label: "WA Business", Icon: Building2, iconClass: "bg-emerald-500 text-white" },
                          { label: "Status", Icon: Smartphone, iconClass: "bg-emerald-500 text-white" },
                        ].map(({ label, Icon, iconClass }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={(e) => handleShareActionSelect(e, label)}
                            className="flex w-20 shrink-0 flex-col items-center"
                          >
                            <span className={`flex h-16 w-16 items-center justify-center rounded-full ${iconClass}`}>
                              <Icon className="h-8 w-8" />
                            </span>
                            <span className="mt-2 text-center text-[13px] leading-tight text-white/90">{label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-center gap-5 pb-1">
                        {[
                          { label: "Report", Icon: Flag },
                          { label: "Not interested", Icon: HeartOff },
                          { label: "Download", Icon: Download },
                          { label: "Add to Story", Icon: PlusCircle },
                          { label: "Promote", Icon: Flame },
                          { label: "Cast", Icon: Cast },
                        ].map(({ label, Icon }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={(e) => handleShareActionSelect(e, label)}
                            className="flex w-20 shrink-0 flex-col items-center"
                          >
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-700 text-white/75">
                              <Icon className="h-8 w-8" />
                            </span>
                            <span className="mt-2 text-center text-[13px] leading-tight text-white/70">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  onClick={handleShareTap}
                  className={`flex flex-col items-center transition-transform active:scale-90 ${
                    showSharePulse ? "scale-110" : ""
                  }`}
                  aria-label="Share"
                >
                  <div className="relative">
                    <Share2
                      className={`h-12 w-12 fill-white ${
                        showSharePulse ? "text-emerald-300" : "text-white"
                      }`}
                    />
                    {showSharePulse && (
                      <Sparkles className="absolute -top-2 -right-2 h-5 w-5 animate-bounce text-emerald-300" />
                    )}
                  </div>
                  <span className="mt-1 text-base font-semibold text-white">{formatCount(shareBase + shareCount)}</span>
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
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" className="text-sky-400" fill="currentColor" />
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
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
                        setShowTouchKeyboard(false)
                      }
                    } />
                  <div className={`animate-comments-up relative flex flex-col rounded-t-2xl bg-zinc-900 ${showTouchKeyboard ? "max-h-[96%]" : "max-h-[80%]"}`}>
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4.5">
                      <span className="text-xl font-semibold text-white">{formatCount(commentCount)} Comments</span>
                      <button onClick={(e) => { 
                            e.stopPropagation()
                            setShowComments(false)
                            setShowTouchKeyboard(false)
                          } 
                        }
                        aria-label="Close">
                        <X className="h-8 w-8 text-white/70" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4.5">
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setHintLikes((likes) => likes + (hintLiked ? -1 : 1))
                            setHintLiked((wasLiked) => !wasLiked)
                          }}
                          className="flex flex-col items-center pt-0.5"
                          aria-label={hintLiked ? "Unlike comment" : "Like comment"}
                        >
                          <Heart className={`h-6 w-6 ${hintLiked ? "fill-red-500 text-red-500" : "text-white/50"}`} />
                          <span className="text-base text-white/50">{hintLikes}</span>
                        </button>
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setComments((currentComments) =>
                                currentComments.map((comment, commentIndex) =>
                                  commentIndex === i
                                    ? {
                                        ...comment,
                                        liked: !comment.liked,
                                        likes: comment.likes + (comment.liked ? -1 : 1),
                                      }
                                    : comment,
                                ),
                              )
                            }}
                            className="flex flex-col items-center pt-0.5"
                            aria-label={c.liked ? "Unlike comment" : "Like comment"}
                          >
                            <Heart className={`h-6 w-6 ${c.liked ? "fill-red-500 text-red-500" : "text-white/50"}`} />
                            <span className="text-base text-white/50">{c.likes}</span>
                          </button>
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
                        onFocus={() => setShowTouchKeyboard(true)}
                        onPointerDown={() => setShowTouchKeyboard(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment()
                        }}
                        inputMode="none"
                        placeholder="Add comment ..."
                        aria-label="Comment text"
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
                    {showTouchKeyboard && (
                      <div
                        className="border-t border-white/10 bg-zinc-950 px-2 pb-3 pt-2"
                        aria-label="Touch keyboard"
                        onPointerDown={(e) => e.preventDefault()}
                      >
                        {TOUCH_KEYBOARD_ROWS.map((row, rowIndex) => (
                          <div key={row.join("")} className={`mb-1.5 flex justify-center gap-1 ${rowIndex === 1 ? "px-3" : rowIndex === 2 ? "px-8" : ""}`}>
                            {row.map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleTouchKey(key)}
                                className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-md bg-zinc-700 text-lg font-medium text-white shadow-sm active:bg-zinc-500"
                                aria-label={`Type ${key}`}
                              >
                                {keyboardUppercase ? key.toUpperCase() : key}
                              </button>
                            ))}
                          </div>
                        ))}
                        <div className="flex gap-1 px-1">
                          <button
                            type="button"
                            onClick={() => setKeyboardUppercase((value) => !value)}
                            className={`h-10 rounded-md px-4 text-sm font-semibold ${keyboardUppercase ? "bg-white text-zinc-950" : "bg-zinc-700 text-white"}`}
                            aria-label="Toggle uppercase"
                            aria-pressed={keyboardUppercase}
                          >
                            Shift
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTouchKey("space")}
                            className="h-10 flex-1 rounded-md bg-zinc-700 text-sm text-white active:bg-zinc-500"
                          >
                            Space
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTouchKey("backspace")}
                            className="flex h-10 w-14 items-center justify-center rounded-md bg-zinc-700 text-white active:bg-zinc-500"
                            aria-label="Backspace"
                          >
                            <Delete className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={!commentInput.trim()}
                            className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-bold text-zinc-950 disabled:bg-zinc-800 disabled:text-white/30"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video progress bar */}
            {!showShareOverlay && !showComments && (
              <div className="absolute bottom-16 left-0 right-0 z-30 h-2 bg-white/20">
                <div
                  className="h-full bg-white"
                  style={{ width: `${videoProgress}%`, transition: "width 0.1s linear" }}
                />
              </div>
            )}
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
      </div>
    </div>
  )
}
