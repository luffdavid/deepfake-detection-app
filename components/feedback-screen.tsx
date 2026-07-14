"use client"

import { 
  Scenario, 
  TrustLevel, 
  isCorrectAssessment, 
  getTrustLevelLabel, 
  getTrustLevelColorClass, 
  getTrustLevelValue, 
  securityChecklist, 
} from "@/lib/scenarios"

import { Button } from "@/components/ui/button"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ClipboardCheck,
  Search,
  BadgeCheck,
  Newspaper,
  Heart,
  Brain,
  Shield,
} from "lucide-react"

const iconMap = {
  search: Search,
  "badge-check": BadgeCheck,
  newspaper: Newspaper,
  heart: Heart,
  brain: Brain,
}

interface FeedbackScreenProps {
  scenario: Scenario
  userTrust: TrustLevel
  onContinue: () => void
}

export function FeedbackScreen({ scenario, userTrust, onContinue }: FeedbackScreenProps) {
  const isCorrect = isCorrectAssessment(userTrust, scenario.recommendedTrust)
  const recommendedSliderValue = getTrustLevelValue(scenario.recommendedTrust)
  const authentic = !scenario.isFake

  return (
    <div className="relative flex h-screen min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-10">
      <div className="absolute right-8 top-8 z-20 flex items-center gap-5">
        <p className="hidden text-4xl text-slate-400 sm:block">Need help?</p>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-emerald-400/60 bg-emerald-500/10 px-6 py-6 text-3xl text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
            >
            <ClipboardCheck className="mr-3 h-8 w-8" />
            Open checklist
            </Button>
          </DialogTrigger>

          <DialogContent className="border-cyan-500/30 bg-slate-950 text-white sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-5xl text-cyan-100">
                <ClipboardCheck className="h-10 w-10" />
                Security Checklist
              </DialogTitle>

              <DialogDescription className="text-2xl text-slate-300">
                Use this checklist when deciding whether online content is trustworthy.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 space-y-6">
              {securityChecklist.map((item) => {
                const Icon =
                  iconMap[item.icon as keyof typeof iconMap] ?? Shield

                return (
                  <li
                    key={item.title}
                    className="relative overflow-hidden rounded-3xl border bg-card p-8"
                  >
                    <Icon
                      className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-green-500/15"
                      strokeWidth={1}
                    />

                    <div className="relative">
                      <div className="mb-5 inline-flex rounded-2xl bg-emerald-500/10 p-4">
                        <Icon className="h-8 w-8 text-emerald-400" />
                      </div>

                      <h2 className="text-xl font-bold">
                        {item.title}
                      </h2>

                      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full max-w-4xl space-y-7 animate-scale-in">

        {/* User's choice badge */}
        <div className="text-center">
          <p className="mb-3 text-2xl text-muted-foreground">Your choice:</p>
          <span
            className={`inline-block rounded-full border px-7 py-3 text-xl font-semibold ${
              getTrustLevelColorClass(userTrust)
            }`}
          >
            {getTrustLevelLabel(userTrust)}
          </span>
        </div>

        {/* Result header */}
        <div className="space-y-4 text-center">
          <div
            className={`inline-flex rounded-full p-6 ${
              isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-20 w-20 text-emerald-500" />
            ) : (
              <XCircle className="h-20 w-20 text-red-500" />
            )}
          </div>
          <h1 className="text-5xl font-bold md:text-6xl">
            {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
          </h1>
          <p className="text-3xl text-muted-foreground">
            This content was{" "}
            <span className={scenario.isFake ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
              {scenario.isFake ? "FAKE" : "AUTHENTIC"}
            </span>
          </p>
        </div>

        {/* Detailed review */}
        <div className="glass-card animate-slide-up space-y-4 rounded-xl border border-border/60 p-6" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-xl border border-border/60 bg-background/30 p-5">
            <h3 className="mb-2 text-2xl font-semibold text-foreground">
              {authentic ? "Why it was credible" : "Why it was convincing"}
            </h3>
            <p className="text-xl leading-relaxed text-muted-foreground">{scenario.whyConvincing}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/30 p-5">
            <h3 className="mb-3 text-2xl font-semibold text-foreground">
              {authentic ? "Trust signals to recognise" : "Signals that mattered"}
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {scenario.cues.map((cue) => (
                <li key={cue} className="flex items-start gap-3 text-xl text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={`mt-3 h-2.5 w-2.5 shrink-0 rounded-full ${
                      authentic ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <span className="leading-snug">{cue}</span>
                </li>
              ))}
            </ul>
          </div>

         {/*  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5">
            <p className="mb-1.5 text-sm font-bold uppercase tracking-wider text-emerald-400">In the real world</p>
            <p className="text-xl leading-relaxed text-foreground/90">{scenario.educationalTakeaway}</p>
          </div> */}
        </div>

        {/* Recommended trust level */}
        <div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <p className="mb-5 text-2xl text-muted-foreground">Recommended:</p>
          <div className="relative px-3">
            {/* Gradient track */}
            <div className="h-4 rounded-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500" />
            {/* Thumb indicator */}
            <div
              className="absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-lg"
              style={{ left: `calc(${recommendedSliderValue}% - 18px)` }}
            />
          </div>
          <div className="mt-3 flex justify-between px-3 text-base sm:text-lg">
            <span className="font-medium text-emerald-500">Very trustworthy</span>
            <span className="font-medium text-amber-400">Not sure</span>
            <span className="font-medium text-red-500">Not trustworthy</span>
          </div>
        </div>

        {/* Continue button */}
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full rounded-xl bg-emerald-600 py-10 text-3xl hover:bg-emerald-700"
        >
          Next scenario
          <ArrowRight className="ml-3 h-9 w-9" />
        </Button>
      </div>
    </div>
  )
}