"use client"

import { Scenario, TrustLevel, isCorrectAssessment, getTrustLevelLabel, getTrustLevelColorClass, getTrustLevelValue } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowRight, Lightbulb } from "lucide-react"

interface FeedbackScreenProps {
  scenario: Scenario
  userTrust: TrustLevel
  onContinue: () => void
}

export function FeedbackScreen({ scenario, userTrust, onContinue }: FeedbackScreenProps) {
  const isCorrect = isCorrectAssessment(userTrust, scenario.recommendedTrust)
  const recommendedSliderValue = getTrustLevelValue(scenario.recommendedTrust)

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-2xl space-y-5 animate-scale-in">

        {/* User's choice badge */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Your choice:</p>
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${
              getTrustLevelColorClass(userTrust)
            }`}
          >
            {getTrustLevelLabel(userTrust)}
          </span>
        </div>

        {/* Result header */}
        <div className="text-center space-y-3">
          <div
            className={`inline-flex p-4 rounded-full ${
              isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            ) : (
              <XCircle className="w-14 h-14 text-red-500" />
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
          </h1>
          <p className="text-base text-muted-foreground">
            This content was{" "}
            <span className={scenario.isFake ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>
              {scenario.isFake ? "FAKE" : "AUTHENTIC"}
            </span>
          </p>
        </div>

        {/* Educational takeaway */}
        <div className="p-4 glass-card border border-emerald-500/30 rounded-xl animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <Lightbulb className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Key Takeaway</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.educationalTakeaway}
              </p>
            </div>
          </div>
        </div>

        {/* Recommended trust level */}
        <div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <p className="text-sm text-muted-foreground mb-3">Recommended:</p>
          <div className="relative px-2">
            {/* Gradient track */}
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
            {/* Thumb indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg bg-white"
              style={{ left: `calc(${recommendedSliderValue}% - 10px)` }}
            />
          </div>
          <div className="flex justify-between text-xs px-2 mt-1.5">
            <span className="text-emerald-500">Very trustworthy</span>
            <span className="text-amber-400">Not sure</span>
            <span className="text-red-500">Not trustworthy</span>
          </div>
        </div>

        {/* Continue button */}
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full text-lg py-5 rounded-xl bg-emerald-600 hover:bg-emerald-700"
        >
          Next scenario
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
