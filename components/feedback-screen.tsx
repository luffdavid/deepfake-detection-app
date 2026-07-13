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
    <div className="relative min-h-screen h-screen w-screen flex flex-col items-center justify-center p-8 overflow-hidden">
      <div className="absolute right-6 top-6 z-20 flex items-center gap-4">
        <p className="hidden text-2xl text-slate-400 sm:block ">Need help?</p>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-cyan-400/50 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 text-2xl px-5 py-5"
            >
            <ClipboardCheck className="mr-2.5 h-5 w-5" />
            Open checklist
            </Button>
          </DialogTrigger>

          <DialogContent className="border-cyan-500/30 bg-slate-950 text-white sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-3xl text-cyan-100">
                <ClipboardCheck className="h-7 w-7" />
                Security Checklist
              </DialogTitle>

              <DialogDescription className="text-slate-300 text-base">
                Use this checklist when deciding whether online content is trustworthy.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              {securityChecklist.map((item) => {
                const Icon = iconMap[item.icon as keyof typeof iconMap]

                return (
                  <div
                    key={item.id}
                    className="flex gap-5 rounded-xl border border-slate-700/70 bg-slate-900/70 p-5"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-100">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-base text-slate-300">
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

      <div className="w-full max-w-3xl space-y-7 animate-scale-in">

        {/* User's choice badge */}
        <div className="text-center">
          <p className="text-2xl text-muted-foreground mb-3">Your choice:</p>
          <span
            className={`inline-block px-6 py-2.5 rounded-full text-lg font-semibold border ${
              getTrustLevelColorClass(userTrust)
            }`}
          >
            {getTrustLevelLabel(userTrust)}
          </span>
        </div>

        {/* Result header */}
        <div className="text-center space-y-4">
          <div
            className={`inline-flex p-5 rounded-full ${
              isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-18 h-18 text-emerald-500" />
            ) : (
              <XCircle className="w-18 h-18 text-red-500" />
            )}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold">
            {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
          </h1>
          <p className="text-xl text-muted-foreground">
            This content was{" "}
            <span className={scenario.isFake ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
              {scenario.isFake ? "FAKE" : "AUTHENTIC"}
            </span>
          </p>
        </div>

        {/* Educational takeaway */}
        <div className="p-6 glass-card border border-emerald-500/30 rounded-xl animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex gap-4">
            <div className="shrink-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <Lightbulb className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-1.5">Key Takeaway</h3>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {scenario.educationalTakeaway}
              </p>
            </div>
          </div>
        </div>

        {/* Recommended trust level */}
        <div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <p className="text-lg text-muted-foreground mb-4">Recommended:</p>
          <div className="relative px-2">
            {/* Gradient track */}
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
            {/* Thumb indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-white shadow-lg bg-white"
              style={{ left: `calc(${recommendedSliderValue}% - 14px)` }}
            />
          </div>
          <div className="flex justify-between text-sm sm:text-base px-2 mt-2">
            <span className="text-emerald-500">Very trustworthy</span>
            <span className="text-amber-400">Not sure</span>
            <span className="text-red-500">Not trustworthy</span>
          </div>
        </div>

        {/* Continue button */}
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full text-2xl py-8 rounded-xl bg-emerald-600 hover:bg-emerald-700"
        >
          Next scenario
          <ArrowRight className="w-7 h-7 ml-2.5" />
        </Button>
      </div>
    </div>
  )
}
