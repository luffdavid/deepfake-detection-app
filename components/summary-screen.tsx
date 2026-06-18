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

  return (
    <div className="min-h-screen w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12">
        {/* 1 — Score + per-scenario result icons */}
        <header className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">Experience Complete</h1>
          <p className="mt-3 text-base text-muted-foreground">
            You judged{" "}
            <span className="font-semibold text-foreground">
              {correctCount} of {totalScenarios}
            </span>{" "}
            scenarios correctly ({percentage}%)
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

        {/* 2 — Per-clip review carousel */}
        <section>
          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold">Review each clip</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Swipe through every video you saw to understand how it tried to convince you.
            </p>
          </div>

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

          {/* Carousel navigation */}
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
        </section>

        {/* 3 — Key takeaways from deepfakes */}
        <section>
          <div className="mb-5 text-center">
            <h2 className="text-xl font-semibold">Key takeaways from deepfakes</h2>
            <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              A good score here does not mean you are safe in real life — these clips were hard to judge for a reason,
              and even experts are routinely fooled. Build these habits instead of trusting your instincts.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {takeaways.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</p>
                  </div>
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
