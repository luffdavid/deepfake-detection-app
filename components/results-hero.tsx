"use client"

import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScenarioReview } from "@/types/scenario"

interface ResultsHeroProps {
  correctCount: number
  totalScenarios: number
  scenarios: ScenarioReview[]
  activeIndex: number
  onSelectScenario: (index: number) => void
}

export function ResultsHero({
  correctCount,
  totalScenarios,
  scenarios,
  activeIndex,
  onSelectScenario,
}: ResultsHeroProps) {
  return (
    <section className="w-full max-w-3xl mx-auto px-4 pt-12 pb-8 text-center space-y-6">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
        Exercise complete · {correctCount} of {totalScenarios} correct
      </p>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground text-balance">
        What this exercise can — and can&apos;t — tell you
      </h1>

      <div className="max-w-xl mx-auto space-y-3">
        <p className="text-base text-muted-foreground leading-relaxed">
          Distinguishing authentic footage from manipulated or AI-generated
          content is difficult, even for attentive viewers. Production
          quality, emotional tone, and platform context are not reliable
          signals of truth on their own.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          A high score here reflects pattern recognition across a small set
          of constructed examples — it is not a guarantee of real-world
          detection ability. Convincing manipulated media rarely announces
          itself this clearly.
        </p>
      </div>

      <div
        className="flex items-center justify-center gap-2 pt-1"
        role="tablist"
        aria-label="Jump to scenario"
      >
        {scenarios.map((scenario, index) => (
          <button
            key={scenario.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`${scenario.shortLabel} — ${scenario.isCorrect ? "correct" : "incorrect"}`}
            onClick={() => onSelectScenario(index)}
            className={cn(
              "h-7 w-7 rounded-md border flex items-center justify-center transition-colors",
              index === activeIndex
                ? "border-foreground/40 bg-secondary"
                : "border-border hover:border-foreground/30"
            )}
          >
            {scenario.isCorrect ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <X className="w-3.5 h-3.5 text-red-500/80" />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
