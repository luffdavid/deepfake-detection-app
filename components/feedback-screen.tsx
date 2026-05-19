"use client"

import { Scenario, TrustLevel, getTrustLevelValue, isCorrectAssessment } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, ArrowRight, Lightbulb } from "lucide-react"

interface FeedbackScreenProps {
  scenario: Scenario
  userTrust: TrustLevel
  onContinue: () => void
}

export function FeedbackScreen({ scenario, userTrust, onContinue }: FeedbackScreenProps) {
  const isCorrect = isCorrectAssessment(userTrust, scenario.recommendedTrust)
  const userValue = getTrustLevelValue(userTrust)
  const recommendedValue = getTrustLevelValue(scenario.recommendedTrust)

  const getTrustColor = (level: TrustLevel) => {
    switch (level) {
      case "low":
        return "bg-red-500"
      case "medium":
        return "bg-amber-500"
      case "high":
        return "bg-emerald-500"
    }
  }

  const getTrustLabel = (level: TrustLevel) => {
    switch (level) {
      case "low":
        return "Not trustworthy"
      case "medium":
        return "Unsure"
      case "high":
        return "Trustworthy"
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-2xl space-y-6 animate-scale-in">
        {/* Result header */}
        <div className="text-center space-y-4">
          <div
            className={`inline-flex p-4 rounded-full ${
              isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            {isCorrect ? scenario.feedbackCorrect : scenario.feedbackIncorrect}
          </h1>
          <p className="text-lg text-muted-foreground">
            This content was{" "}
            <span className={scenario.isFake ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>
              {scenario.isFake ? "FAKE" : "AUTHENTIC"}
            </span>
          </p>
        </div>

        {/* Trust comparison */}
        <Card className="p-4 glass-card border-border/50">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
            Trust Assessment Comparison
          </h3>

          {/* Visual comparison */}
          <div className="space-y-4">
            {/* User rating */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Your Rating</span>
                <span className="font-medium">{getTrustLabel(userTrust)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`absolute h-full rounded-full ${getTrustColor(userTrust)} transition-all duration-700`}
                  style={{ width: `${userValue}%` }}
                />
              </div>
            </div>

            {/* Recommended rating */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Recommended</span>
                <span className="font-medium">{getTrustLabel(scenario.recommendedTrust)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`absolute h-full rounded-full ${getTrustColor(scenario.recommendedTrust)} transition-all duration-700 delay-300`}
                  style={{ width: `${recommendedValue}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Educational takeaway */}
        <Card className="p-4 glass-card border-accent/30 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="p-2 rounded-xl bg-accent/20">
                <Lightbulb className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Key Takeaway</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {scenario.educationalTakeaway}
              </p>
            </div>
          </div>
        </Card>

        {/* Continue button */}
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full text-lg py-5 rounded-xl bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )
}
