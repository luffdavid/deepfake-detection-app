"use client"

import { useEffect, useState } from "react"
import type { Scenario, TrustLevel } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { ScenarioReviewSlide } from "@/components/scenario-review-slide"
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Shield,
  Check,
  X,
  Search,
  BadgeCheck,
  Newspaper,
  Heart,
  Brain,
  ChevronUp,
  ChevronDown,
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

const takeaways = [
  {
    icon: Search,
    title: "Verify the source",
    description: "Trace content back to the original, named account or outlet before you believe or share it.",
  },
  {
    icon: BadgeCheck,
    title: "Look for verification badges",
    description: "Official accounts on major platforms display verification marks — absence is a warning sign.",
  },
  {
    icon: Newspaper,
    title: "Check trusted news outlets",
    description: "Cross-reference breaking news with established media. A single clip is never enough.",
  },
  {
    icon: Heart,
    title: "Question emotional manipulation",
    description: "Content that triggers fear, outrage or pity is often designed to bypass your critical thinking.",
  },
  {
    icon: Brain,
    title: "Verify context and plausibility",
    description: "Ask whether the claim makes sense given what you already know, and what might be left out.",
  },
  {
    icon: Shield,
    title: "Use official channels",
    description: "For health, money or safety, act only through official websites and authorities you reach yourself.",
  },
]

export function SummaryScreen({
  scenarios,
  results,
  correctCount,
  totalScenarios,
  onRestart,
}: SummaryScreenProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!api) return
    setSelected(api.selectedScrollSnap())
    const onSelect = () => setSelected(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  const resultFor = (scenarioId: string) => results.find((r) => r.scenarioId === scenarioId)
  const percentage = totalScenarios > 0 ? Math.round((correctCount / totalScenarios) * 100) : 0
  const [isExpanded, setIsExpanded] = useState(false)
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12">
       {/* 1 — Score + per-scenario result icons */}
<header className="flex flex-col items-center text-center">
  <h1 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">Experience Complete</h1>

  <div className="relative mt-8 flex h-40 w-40 items-center justify-center">
    <svg viewBox="0 0 128 128" className="h-40 w-40 -rotate-90">
      <defs>
        <linearGradient id="scoreGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={RADIUS} fill="none" strokeWidth="8" className="stroke-border" />
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
        className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
      />
    </svg>
    <div className="absolute flex flex-col items-center">
      <span className="bg-gradient-to-br from-rose-400 via-amber-400 to-emerald-400 bg-clip-text text-4xl font-extrabold leading-none text-transparent">
        {percentage}%
      </span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Accuracy
      </span>
    </div>
  </div>

  <p className="mt-5 text-base text-muted-foreground">
    You judged{" "}
    <span className="font-semibold text-foreground">
      {correctCount} of {totalScenarios}
    </span>{" "}
    scenarios correctly
  </p>

  <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
    {scenarios.map((scenario, i) => {
      const result = resultFor(scenario.id)
      const isCorrect = result?.isCorrect
      return (
        <li key={scenario.id}>
          <div
            aria-label={`Scenario ${i + 1}: ${isCorrect ? "correct" : "incorrect"}`}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
              isCorrect
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </div>
        </li>
      )
    })}
  </ul>
</header>

       {/* 2 — Per-clip review carousel (expandable) */}
<section>
  <button
    type="button"
    onClick={() => setIsExpanded((prev) => !prev)}
    className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/50"
    aria-expanded={isExpanded}
    aria-controls="clip-review-carousel"
  >
    <div>
      <h2 className="text-base font-semibold sm:text-xl">Review each clip</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {isExpanded
          ? "Swipe through every video you saw to understand how it tried to convince you."
          : "Tap to see the detailed breakdown for each clip again."}
      </p>
    </div>
    {isExpanded ? (
      <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
    ) : (
      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
    )}
  </button>

  <div
    id="clip-review-carousel"
    className={`overflow-hidden transition-all duration-300 ${
      isExpanded ? "mt-4 max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
    }`}
  >
    <Carousel setApi={setApi} opts={{ align: "center" }} className="w-full">
      <CarouselContent>
        {scenarios.map((scenario, i) => {
          const result = resultFor(scenario.id)
          return (
            <CarouselItem key={scenario.id}>
              <div className="h-[460px]">
                <ScenarioReviewSlide
                  scenario={scenario}
                  index={i}
                  total={scenarios.length}
                  userTrust={result?.userTrust}
                  isCorrect={result?.isCorrect}
                />
              </div>
            </CarouselItem>
          )
        })}
      </CarouselContent>
    </Carousel>

    <div className="mt-4 flex items-center justify-between gap-4">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={() => api?.scrollPrev()}
        disabled={selected === 0}
        aria-label="Previous clip"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2" role="tablist" aria-label="Clip reviews">
        {scenarios.map((scenario, i) => (
          <button
            key={scenario.id}
            onClick={() => api?.scrollTo(i)}
            aria-label={`Go to clip ${i + 1}`}
            aria-selected={selected === i}
            role="tab"
            className={`h-1.5 rounded-full transition-all ${
              selected === i ? "w-6 bg-accent" : "w-1.5 bg-border hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={() => api?.scrollNext()}
        disabled={selected === scenarios.length - 1}
        aria-label="Next clip"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</section>
  

 {/* 3 — Key takeaways from deepfakes */}
<section className="rounded-3xl bg-secondary/40 px-6 py-10 sm:px-10">
  <div className="mb-8 text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Before you go</p>
    <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Key takeaways from deepfakes</h2>
    <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
      A good score here does not mean you are safe in real life — these clips were hard to judge for a reason,
      and even experts are routinely fooled. Build these habits instead of trusting your instincts.
    </p>
  </div>

  <ul className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-2">
    {takeaways.map((item) => {
      const Icon = item.icon
      return (
        <li key={item.title} className="relative overflow-hidden bg-card p-6">
          <Icon
  className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 text-green-500/20"
  strokeWidth={1}
/>
          <h3 className="relative text-base font-bold text-foreground">{item.title}</h3>
          <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </li>
      )
    })}
  </ul>
</section>

        {/* 4 — Start again */}
        <footer className="flex flex-col items-center gap-3">
          <Button onClick={onRestart} size="lg" className="rounded-full px-8">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start again
          </Button>
          <p className="text-center text-[11px] uppercase tracking-widest text-muted-foreground/50">
            LMU Munich · Usable Security Research
          </p>
        </footer>
      </div>
    </div>
  )
}
