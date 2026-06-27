"use client"

import type { Scenario, TrustLevel } from "@/lib/scenarios"
import { getTrustLevelLabel } from "@/lib/scenarios"
import { User, Check, X, ShieldCheck, AlertTriangle } from "lucide-react"

interface ScenarioReviewSlideProps {
  scenario: Scenario
  index: number
  total: number
  userTrust?: TrustLevel
  isCorrect?: boolean
}

export function ScenarioReviewSlide({
  scenario,
  index,
  total,
  userTrust,
  isCorrect,
}: ScenarioReviewSlideProps) {
  const accountName = scenario.source
    ? scenario.source.toLowerCase().replace(/\s+/g, ".")
    : "news.daily"

  const authentic = !scenario.isFake

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-border bg-card">
      {/* Slide header: which clip, and how the visitor judged it */}
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
            {scenario.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scenario.profileImage || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{scenario.title}</p>
            <p className="truncate text-xs text-muted-foreground">@{accountName}</p>
          </div>
        </div>

        <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          {index + 1} / {total}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {/* Verdict row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              authentic
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {authentic ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {authentic ? "Authentic" : "Manipulated"}
          </span>

          {userTrust && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                isCorrect
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              You rated it &ldquo;{getTrustLevelLabel(userTrust)}&rdquo;
            </span>
          )}
        </div>

        {/* Why it was convincing / credible */}
        <div>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">
            {authentic ? "Why it was credible" : "Why it was convincing"}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{scenario.whyConvincing}</p>
        </div>

        {/* Cues that mattered */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {authentic ? "Trust signals to recognise" : "Signals that mattered"}
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {scenario.cues.map((cue) => (
              <li key={cue} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    authentic ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span className="leading-snug">{cue}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Real-world takeaway */}
        <div className="mt-auto rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">In the real world</p>
          <p className="text-sm leading-relaxed text-foreground/90">{scenario.realWorldAction}</p>
        </div>
      </div>
    </div>
  )
}
