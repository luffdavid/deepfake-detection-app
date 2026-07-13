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
  Lightbulb,
  ClipboardCheck,
  Search,
  BadgeCheck,
  Newspaper,
  Heart,
  Brain,
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

  return (
    <div className="relative flex h-screen min-h-screen w-screen flex-col items-center justify-center overflow-hidden p-10">
      <div className="absolute right-8 top-8 z-20 flex items-center gap-5">
        <p className="hidden text-4xl text-slate-400 sm:block">Need help?</p>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-cyan-400/50 bg-cyan-400/10 px-6 py-6 text-3xl text-cyan-100 hover:bg-cyan-400/20"
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
                const Icon = iconMap[item.icon as keyof typeof iconMap]

                return (
                  <div
                    key={item.id}
                    className="flex gap-8 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-8"
                  >
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                      <Icon className="h-11 w-11" />
                    </div>

                    <div>
                      <h3 className="text-3xl font-semibold text-slate-100">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-2xl text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full max-w-4xl space-y-9 animate-scale-in">

        {/* User's choice badge */}
        <div className="text-center">
          <p className="mb-4 text-3xl text-muted-foreground">Your choice:</p>
          <span
            className={`inline-block rounded-full border px-8 py-3.5 text-2xl font-semibold ${
              getTrustLevelColorClass(userTrust)
            }`}
          >
            {getTrustLevelLabel(userTrust)}
          </span>
        </div>

        {/* Result header */}
        <div className="space-y-5 text-center">
          <div
            className={`inline-flex rounded-full p-6 ${
              isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-24 w-24 text-emerald-500" />
            ) : (
              <XCircle className="h-24 w-24 text-red-500" />
            )}
          </div>
          <h1 className="text-6xl font-bold md:text-7xl">
            {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
          </h1>
          <p className="text-4xl text-muted-foreground">
            This content was{" "}
            <span className={scenario.isFake ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
              {scenario.isFake ? "FAKE" : "AUTHENTIC"}
            </span>
          </p>
        </div>

        {/* Educational takeaway */}
        <div className="glass-card animate-slide-up rounded-xl border border-emerald-500/30 p-10" style={{ animationDelay: "0.2s" }}>
          <div className="flex gap-6">
            <div className="shrink-0">
              <div className="rounded-xl bg-emerald-500/20 p-4">
                <Lightbulb className="h-10 w-10 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="mb-2.5 text-3xl font-semibold">Key Takeaway</h3>
              <p className="text-[1.9rem] leading-relaxed text-muted-foreground">
                {scenario.educationalTakeaway}
              </p>
            </div>
          </div>
        </div>

        {/* Recommended trust level */}
        <div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <p className="mb-5 text-2xl text-muted-foreground">Recommended:</p>
          <div className="relative px-3">
            {/* Gradient track */}
            <div className="h-4 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
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