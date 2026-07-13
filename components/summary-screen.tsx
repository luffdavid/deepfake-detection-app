"use client"

import { useEffect, useState } from "react"
import type { Scenario, TrustLevel } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"

import { securityChecklist, getTrustLevelLabel } from "@/lib/scenarios"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  RotateCcw,
  Check,
  X,
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
  onRestart,
}: SummaryScreenProps) {

  const [isChecklistOpen, setIsChecklistOpen] = useState(false)
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

  return (
    <div className="h-screen w-full overflow-y-auto">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 px-10 py-8">

        {/* 1. Review first */}
        <section>
          <div className="mb-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Experience complete
            </p>

            <h1 className="mt-1 text-4xl font-bold">
              Review your decisions
            </h1>

            <p className="mx-auto mt-1 max-w-2xl text-lg text-muted-foreground">
              Here is how you assessed each video.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {scenarios.map((scenario, index) => {
              const result = resultFor(scenario.id)
              const authentic = !scenario.isFake

              return (
                <div
                  key={scenario.id}
                  className="grid min-h-[130px] grid-cols-[auto_minmax(0,1fr)_minmax(250px,auto)] items-center gap-7 rounded-2xl border bg-card px-8 py-6"
                >
                  {/* Scenario number */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-bold">
                    {index + 1}
                  </div>

                  {/* Condensed review information */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
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

                    <p className="mt-2 text-xl leading-snug text-muted-foreground">
                      {scenario.realWorldAction}
                    </p>
                  </div>

                  {/* User result */}
                  <div
                    className={`flex min-w-[250px] items-center justify-center gap-3 rounded-xl px-7 py-6 text-xl font-semibold ${
                      result?.isCorrect
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {result?.isCorrect ? (
                      <Check className="h-6 w-6 shrink-0" />
                    ) : (
                      <X className="h-6 w-6 shrink-0" />
                    )}

                    {result
                      ? `You chose ${getTrustLevelLabel(result.userTrust)}`
                      : "No rating"}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 2. Score and checklist side by side */}
        <section className="grid grid-cols-[0.8fr_1.2fr] gap-6 border-t pt-6">
          {/* Compact score card */}
          <div className="flex items-center justify-center gap-7 rounded-3xl border bg-card px-7 py-6">
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
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
                <span className="text-4xl font-extrabold">
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

              <p className="mt-2 text-4xl font-bold">
                {correctCount} of {totalScenarios}
              </p>

              <p className="mt-1 text-lg leading-snug text-muted-foreground">
                scenarios judged correctly
              </p>
            </div>
          </div>

          {/* Highlighted checklist card */}
          <div className="flex items-center gap-6 rounded-3xl border-2 border-accent/40 bg-accent/10 px-8 py-6 shadow-lg">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Shield className="h-8 w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold">
                One last thing before you go
              </h2>

              <p className="mt-1 text-lg leading-snug text-muted-foreground">
                Open the checklist and remember these steps when you encounter
                suspicious content online.
              </p>
            </div>

            <Button
              onClick={() => setIsChecklistOpen(true)}
              size="lg"
              className="h-16 shrink-0 rounded-full px-8 text-xl font-bold shadow-xl"
            >
              View checklist
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </div>
        </section>

        {/* 4. Restart remains secondary */}
        <footer className="flex items-center justify-between pb-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/50">
            LMU Munich · Usable Security Research
          </p>

          <Button
            onClick={onRestart}
            variant="outline"
            size="lg"
            className="h-14 rounded-full px-10 text-lg"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Start again
          </Button>
        </footer>   

        {/* Checklist popup */}
        <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
          <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
            <DialogHeader>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
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
