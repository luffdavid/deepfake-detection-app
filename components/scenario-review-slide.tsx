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
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto rounded-3xl border-2 border-border bg-card shadow-lg">      
      {/* Slide header: which clip, and how the visitor judged it */}
      <div className="flex items-start justify-between gap-5 border-b border-border/70 px-8 py-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
            {scenario.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scenario.profileImage || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-foreground">{scenario.title}</p>
            <p className="mt-1 truncate text-base text-muted-foreground">@{accountName}</p>
          </div>
        </div>

        <span className="shrink-0 text-base font-semibold uppercase tracking-wider text-muted-foreground/70">
          {index + 1} / {total}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-7 px-8 py-7">
        {/* Verdict row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              authentic
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {authentic ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            {authentic ? "Authentic" : "Manipulated"}
          </span>

          {userTrust ? (
            <span
              className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-base ${
                isCorrect
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              You rated it &ldquo;{getTrustLevelLabel(userTrust)}&rdquo;
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-400">
              <X className="h-5 w-5" />
              You did not rate this clip
            </span>
          )}
        </div>

        {/* Why it was convincing / credible */}
        <div>
          <h3 className="mb-3 text-xl font-bold text-foreground">
            {authentic ? "Why it was credible" : "Why it was convincing"}
          </h3>
          <p className="text-lg leading-relaxed text-muted-foreground">{scenario.whyConvincing}</p>
        </div>

        {/* Cues that mattered */}
        <div>
          <h3 className="mb-3 text-xl font-bold text-foreground">
            {authentic ? "Trust signals to recognise" : "Signals that mattered"}
          </h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {scenario.cues.map((cue) => (
              <li key={cue} className="flex items-start gap-3 text-lg text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={`mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    authentic ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span className="leading-snug">{cue}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Real-world takeaway */}
        <div className="mt-auto rounded-2xl border-2 border-accent/25 bg-accent/5 px-6 py-5">
          <p className="mb-2 text-base font-bold uppercase tracking-wider text-accent">In the real world</p>
          <p className="text-lg leading-relaxed text-foreground/90">{scenario.realWorldAction}</p>
        </div>
      </div>
    </div>
  )
}
