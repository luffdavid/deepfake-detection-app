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
  Check,
  X,
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
  onShowChecklist: () => void
  onRestart: () => void
}

export function SummaryScreen({
  scenarios,
  results,
  correctCount,
  totalScenarios,
  onShowChecklist,
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-10 py-14">  
    <header className="flex flex-col items-center text-center">
    <h1 className="text-balance text-5xl font-bold leading-tight sm:text-6xl">
      Experience Complete
    </h1>
    <div className="relative mt-10 flex h-64 w-64 items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-64 w-64 -rotate-90">
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
        <span className="bg-gradient-to-br from-rose-400 via-amber-400 to-emerald-400 bg-clip-text text-7xl font-extrabold leading-none text-transparent">          
          {percentage}%
        </span>
        <span className="mt-3 text-base font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Accuracy
        </span>
      </div>
    </div>

<p className="mt-7 text-2xl font-medium text-muted-foreground">      
  You judged{" "}
      <span className="font-semibold text-foreground">
        {correctCount} of {totalScenarios}
      </span>{" "}
      scenarios correctly
    </p>

    <ul className="mt-6 flex flex-wrap items-center justify-center gap-4">
      {scenarios.map((scenario, i) => {
        const result = resultFor(scenario.id)
        const isCorrect = result?.isCorrect
        return (
          <li key={scenario.id}>
            <div
              aria-label={`Scenario ${i + 1}: ${isCorrect ? "correct" : "incorrect"}`}
              className={`flex h-16 w-16 items-center justify-center rounded-xl border ${
                isCorrect
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {isCorrect ? <Check className="h-8 w-8" /> : <X className="h-8 w-8" />}
            </div>
          </li>
        )
      })}
    </ul>
  </header>

{/* 2 — Per-clip review carousel */}
<section>
  <div className="mb-10 text-center">
    <h2 className="text-4xl font-semibold sm:text-3xl">
      Review each clip
    </h2>

    <p className="mx-auto mt-4 max-w-3xl text-xl leading-relaxed text-muted-foreground">
      Swipe through every video you saw to review the result and understand
      how the content tried to convince you.
    </p>

    <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">      
      Swipe left or right
    </p>
  </div>

    <Carousel
      setApi={setApi}
      opts={{
        align: "start",
        dragFree: false,
        containScroll: false,
      }}
      className="w-full touch-pan-y overflow-hidden"
    >
    <CarouselContent className="-ml-6">
      {scenarios.map((scenario, i) => {
        const result = resultFor(scenario.id)
        const isActive = selected === i

        return (
          <CarouselItem 
            key={scenario.id}
            className="basis-[88%] pl-6 md:basis-[82%] lg:basis-[76%]"  
          >
            <div
              className={`min-h-0 transition-all duration-300 ${
                isActive
                  ? "scale-100 opacity-100"
                  : "scale-[0.96] opacity-60"
              }`}
            >
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

    <div
      className="flex items-center gap-2"
      role="tablist"
      aria-label="Clip reviews"
    >
      {scenarios.map((scenario, i) => (
        <button
          key={scenario.id}
          onClick={() => api?.scrollTo(i)}
          aria-label={`Go to clip ${i + 1}`}
          aria-selected={selected === i}
          role="tab"
          className={`h-1.5 rounded-full transition-all ${
            selected === i
              ? "w-6 bg-accent"
              : "w-1.5 bg-border hover:bg-muted-foreground/50"
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
</section>
  



        {/* 4 — Start again */}
        <footer className="flex flex-col items-center gap-6">
          <Button
            onClick={onShowChecklist}
            size="lg"
            className="h-20 min-w-[340px] rounded-full px-14 text-2xl font-semibold"
          >
            Show final checklist
            <ArrowRight className="ml-3 h-7 w-7" />
          </Button>

          <Button
            onClick={onRestart}
            variant="outline"
            size="lg"
            className="h-20 min-w-[340px] rounded-full px-14 text-2xl font-semibold"
          >
            <RotateCcw className="mr-3 h-7 w-7" />
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
