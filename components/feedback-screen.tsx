"use client"

import type { Scenario, TrustLevel } from "@/lib/scenarios"
import {
  getTrustLevelColorClass,
  getTrustLevelLabel,
  getTrustLevelValue,
  isCorrectAssessment,
} from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  SlidersHorizontal,
  XCircle,
} from "lucide-react"

interface FeedbackScreenProps {
  scenario: Scenario
  userTrust: TrustLevel
  isLastScenario?: boolean
  onContinue: () => void
}

export function FeedbackScreen({
  scenario,
  userTrust,
  isLastScenario = false,
  onContinue,
}: FeedbackScreenProps) {
  const isCorrect = isCorrectAssessment(userTrust, scenario.recommendedTrust)
  const recommendedSliderValue = getTrustLevelValue(scenario.recommendedTrust)

  return (
    <div className="min-h-screen w-full overflow-y-auto p-4 sm:p-6 lg:h-screen lg:overflow-hidden lg:p-8">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 lg:h-full">
        <header
          className={`shrink-0 rounded-3xl border p-5 text-center sm:p-6 ${
            isCorrect
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-red-500/40 bg-red-500/10"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <div
              className={`inline-flex shrink-0 rounded-full p-3 ${
                isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500 sm:h-14 sm:w-14" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500 sm:h-14 sm:w-14" />
              )}
            </div>

            <div className="sm:text-left">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
              </h1>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">
                This content was{" "}
                <span
                  className={
                    scenario.isFake
                      ? "font-bold text-red-500"
                      : "font-bold text-emerald-500"
                  }
                >
                  {scenario.isFake ? "FAKE" : "AUTHENTIC"}
                </span>
              </p>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
          <section className="min-h-64 overflow-hidden rounded-3xl border bg-black lg:min-h-0">
            {scenario.videoSrc ? (
              <video
                className="aspect-video h-full w-full object-contain"
                src={scenario.videoSrc}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div
                className={`aspect-video h-full w-full bg-gradient-to-br ${scenario.thumbnailColor}`}
                role="img"
                aria-label={scenario.videoPlaceholder}
              />
            )}
          </section>

          <aside className="flex min-h-0 flex-col gap-4">
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-accent/10 p-2.5 text-accent">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Your assessment</h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Your choice</span>
                <span
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${getTrustLevelColorClass(
                    userTrust
                  )}`}
                >
                  {getTrustLevelLabel(userTrust)}
                </span>
              </div>

              <div className="mt-5 border-t pt-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Recommended</span>
                  <span
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${getTrustLevelColorClass(
                      scenario.recommendedTrust
                    )}`}
                  >
                    {getTrustLevelLabel(scenario.recommendedTrust)}
                  </span>
                </div>

                <div className="relative px-2" aria-hidden="true">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
                  <div
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-background bg-white shadow"
                    style={{ left: `calc(${recommendedSliderValue}% - 10px)` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Trustworthy</span>
                  <span>Not sure</span>
                  <span>Not trustworthy</span>
                </div>
              </div>
            </section>

            <section className="flex-1 rounded-3xl border border-emerald-500/30 bg-card p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="h-fit shrink-0 rounded-xl bg-emerald-500/15 p-2.5">
                  <Lightbulb className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Key takeaway</h2>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                    {scenario.educationalTakeaway}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <Button
          onClick={onContinue}
          size="lg"
          className="h-14 w-full shrink-0 rounded-2xl bg-emerald-600 text-lg hover:bg-emerald-700 sm:text-xl"
        >
          {isLastScenario ? "See results" : "Next scenario"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
