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
  Search,
  Layers,
  Building2,
  Eye,
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

const saferBehaviors = [
  {
    icon: Search,
    title: "Verify the source",
    description: "Trace content back to the original, named account or outlet before you believe or share it.",
  },
  {
    icon: Layers,
    title: "Check the context",
    description: "Cross-reference the claim with other established outlets. A single clip is never enough.",
  },
  {
    icon: Building2,
    title: "Use official channels",
    description: "For health, money or safety, act only through official websites and authorities you reach yourself.",
  },
  {
    icon: Eye,
    title: "Don't trust your eyes alone",
    description: "Convincing visuals are exactly what manipulation relies on. Treat what looks real as a question, not an answer.",
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

  // total slides = one per scenario + the closing "safer behaviour" slide
  const slideCount = scenarios.length + 1

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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden px-6 py-5">
      {/* Result + reflection — the score is present but deliberately quiet */}
      <header className="mx-auto w-full max-w-2xl shrink-0 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Review complete</span>
          <span aria-hidden="true">·</span>
          <span>
            You judged {correctCount} of {totalScenarios} correctly
          </span>
        </div>
        <h1 className="text-balance text-2xl font-semibold leading-tight sm:text-3xl">
          Trusting your eyes is not enough.
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Modern deepfakes and manipulated media are built to look real. A good score here does not mean you are safe in
          real life — these clips were hard to judge for a reason, and even experts are routinely fooled.
        </p>
      </header>

      {/* Scenario-by-scenario review */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        <Carousel
          setApi={setApi}
          opts={{ align: "center" }}
          className="h-full w-full max-w-2xl"
        >
          <CarouselContent className="h-full">
            {scenarios.map((scenario, i) => {
              const result = resultFor(scenario.id)
              return (
                <CarouselItem key={scenario.id} className="h-full">
                  <div className="h-full max-h-[58vh]">
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

            {/* Closing slide: safer behaviour */}
            <CarouselItem className="h-full">
              <div className="mx-auto flex h-full max-h-[58vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-accent/25 bg-card">
                <div className="border-b border-border/70 px-5 py-4">
                  <h2 className="text-base font-semibold text-foreground">How to stay safer than your instincts</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You cannot reliably out-look a deepfake. You can change what you do before you trust or share.
                  </p>
                </div>
                <ul className="grid flex-1 gap-3 px-5 py-4 sm:grid-cols-2">
                  {saferBehaviors.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.title} className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
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
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      {/* Navigation + restart */}
      <footer className="mx-auto w-full max-w-2xl shrink-0">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => api?.scrollPrev()}
            disabled={selected === 0}
            aria-label="Previous"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2" role="tablist" aria-label="Review slides">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
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
            disabled={selected === slideCount - 1}
            aria-label="Next"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <Button onClick={onRestart} variant="ghost" className="text-muted-foreground hover:text-foreground">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start again
          </Button>
          <p className="text-center text-[11px] uppercase tracking-widest text-muted-foreground/50">
            LMU Munich · Usable Security Research
          </p>
        </div>
      </footer>
    </div>
  )
}
