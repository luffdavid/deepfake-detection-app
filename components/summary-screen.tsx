"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import {
  securityChecklist,
  type Scenario,
  type TrustLevel,
} from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { TRACK_IDS } from "@/lib/track-ids"
import { useAnalytics } from "@/hooks/use-analytics"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  RotateCcw,
  Shield,
  Search,
  BadgeCheck,
  Newspaper,
  Heart,
  Brain,
  ArrowRight,
} from "lucide-react"

interface UserResult {
  scenarioId: string
  userTrust: TrustLevel
  isCorrect: boolean
}

interface SummaryScreenProps {
  scenarios: Scenario[]
  results: UserResult[]
  correctCount: number
  totalScenarios: number
  sessionId: string | null
  onRestart: () => void
}

const iconMap = {
  search: Search,
  "badge-check": BadgeCheck,
  newspaper: Newspaper,
  heart: Heart,
  brain: Brain,
  shield: Shield,
}

export function SummaryScreen({
  scenarios,
  results,
  correctCount,
  totalScenarios,
  sessionId,
  onRestart,
}: SummaryScreenProps) {

  const [isChecklistOpen, setIsChecklistOpen] = useState(false)
  const { trackEvent } = useAnalytics()
  const resultFor = (scenarioId: string) => results.find((r) => r.scenarioId === scenarioId)
  const percentage = totalScenarios > 0 ? Math.round((correctCount / totalScenarios) * 100) : 0
  const RADIUS = 54
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const [animatedOffset, setAnimatedOffset] = useState(CIRCUMFERENCE)

  useEffect(() => {
  const target = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE
  const timeout = setTimeout(() => setAnimatedOffset(target), 150)
  return () => clearTimeout(timeout)
}, [percentage])

    useEffect(() => {
      if (!isChecklistOpen) return

      trackEvent('checklist_viewed', { source: 'summary_dialog' }, sessionId || undefined)
    }, [isChecklistOpen, sessionId, trackEvent])

  return (
    <div className="h-screen w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-8 px-12 py-10">
        {/* 1. Review first */}
        <section>
          <div className="mb-10 text-center">
            <p className="text-lg font-bold uppercase tracking-[0.22em] text-accent">
              Experience complete
            </p>

            <h1 className="mt-3 text-5xl font-extrabold leading-tight">
              Review your decisions.
            </h1>

            <p className="mx-auto mt-5 max-w-4xl text-2xl leading-relaxed text-muted-foreground">
              Here is how you assessed each video. Keep in mind that a good score doesn't mean you're safe and stay aware!
            </p>
          </div>

          <div className="flex flex-col gap-5" data-track-id={TRACK_IDS.summaryReviewList}>
            {scenarios.map((scenario, index) => {
              const authentic = !scenario.isFake

              return (
                <div
                  key={scenario.id}
                    className="grid grid-cols-[auto_auto_1fr] items-center gap-6 rounded-3xl border bg-card px-10 py-6"
                  >
                  {/* Scenario number */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold">
                    {index + 1}
                  </div>

                  {/* Portrait video screenshot preview */}
                  <div className="relative h-40 w-24 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-secondary/30">
                    <Image
                      src={`/Videoscreenshots/Video${index + 1}.png`}
                      alt={`Screenshot for video ${index + 1}`}
                      fill
                      sizes="96px"
                      className="object-cover object-center"
                    />
                  </div>

                  {/* Condensed review information */}
                  <div className="min-w-0 py-3">
                    <div className="flex flex-wrap items-center gap-6">
                      <h2 className="text-3xl font-bold leading-tight">
                        {scenario.title}
                      </h2>

                      <span
                        className={`rounded-full px-3.5 py-1.5 text-base font-semibold ${
                          authentic
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {authentic ? "Authentic" : "Manipulated"}
                      </span>
                    </div>

                    <p className="mt-6 max-w-5xl text-xl leading-relaxed text-muted-foreground">
                      {scenario.realWorldAction}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 2. Score and checklist side by side */}
        <section className="grid grid-cols-[0.8fr_1.2fr] gap-10 border-t pt-10">
          {/* Compact score card */}
          <div className="flex items-center justify-center gap-10 rounded-3xl border bg-card px-10 py-9" data-track-id={TRACK_IDS.summaryScore}>
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90">
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0%"
                    y1="100%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>

                <circle
                  cx="64"
                  cy="64"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="8"
                  className="stroke-border"
                />

                <circle
                  cx="64"
                  cy="64"
                  r={RADIUS}
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={animatedOffset}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold">
                  {percentage}%
                </span>

                <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Accuracy
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your final score
              </p>

              <p className="mt-2 text-3xl font-bold">
                {correctCount} of {totalScenarios}
              </p>

              <p className="mt-1 text-lg leading-snug text-muted-foreground">
                scenarios judged correctly
              </p>
            </div>
          </div>

          {/* Highlighted checklist card */}
          <div className="flex items-center gap-8 rounded-3xl border-2 border-accent/40 bg-accent/10 px-10 py-6 shadow-lg">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Shield className="h-8 w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold">
                One last thing before you go
              </h2>
            </div>

            <Button
              data-track-id={TRACK_IDS.summaryChecklistButton}
              onClick={() => setIsChecklistOpen(true)}
              size="lg"
              className="h-14 shrink-0 rounded-full px-8 text-lg font-bold shadow-xl"
            >
              View checklist
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </div>
        </section>

        {/* 4. Restart remains secondary */}
        <footer className="flex items-center justify-between border-t pt-8 pb-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60">
            LMU Munich · Usable Security Research
          </p>

          <Button
            data-track-id={TRACK_IDS.summaryRestartButton}
            onClick={onRestart}
            variant="outline"
            size="lg"
            className="h-16 min-w-60 rounded-full px-12 text-xl font-bold"
          >
            <RotateCcw className="mr-3 h-7 w-7" />
            Start again
          </Button>
        </footer> 

        {/* Checklist popup */}
        <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
          <DialogContent
            overlayClassName="bg-black/55 backdrop-blur-md"
            className="max-h-[92vh] w-[96vw]! sm:w-[92vw]! lg:w-[75vw]! max-w-none! sm:max-w-none! overflow-y-auto"
          >
            <DialogHeader>
              <div className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold">
                <Shield className="h-7 w-7" />
              </div>

              <DialogTitle className="text-center text-4xl font-bold">
                Your deepfake checklist
              </DialogTitle>

              <DialogDescription className="text-center text-base">
                Use these steps before trusting or sharing suspicious content.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {securityChecklist.map((item) => {
                const Icon =
                  iconMap[item.icon as keyof typeof iconMap] ?? Shield

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-5 rounded-2xl bg-secondary/60 p-6"
                  >
                    <div className="shrink-0 rounded-lg bg-accent/15 p-3 text-accent">
                      <Icon className="h-7 w-7" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button
              onClick={() => setIsChecklistOpen(false)}
              size="lg"
              className="mt-8 h-16 w-full text-xl font-semibold"
            >
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
