"use client"

import { securityChecklist } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Search,
  BadgeCheck,
  Newspaper,
  Heart,
  Brain,
  RotateCcw,
} from "lucide-react"

interface ChecklistScreenProps {
  correctCount: number
  totalScenarios: number
  onRestart: () => void
}

const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-5 h-5" />,
  "badge-check": <BadgeCheck className="w-5 h-5" />,
  newspaper: <Newspaper className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  brain: <Brain className="w-5 h-5" />,
}

export function ChecklistScreen({
  correctCount,
  totalScenarios,
  onRestart,
}: ChecklistScreenProps) {
  const percentage = Math.round((correctCount / totalScenarios) * 100)

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between p-6 overflow-hidden">
      {/* Header */}
      <div className="text-center space-y-3 animate-fade-in pt-4">
        <div className="inline-flex p-3 rounded-full bg-accent/20">
          <Shield className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-3xl font-bold">Experience Complete</h1>
        <p className="text-lg text-muted-foreground">
          You correctly identified{" "}
          <span className="text-primary font-bold">
            {correctCount} of {totalScenarios}
          </span>{" "}
          scenarios ({percentage}%)
        </p>
      </div>

      {/* Score visualization */}
      <div className="flex justify-center gap-3 animate-scale-in">
        {Array.from({ length: totalScenarios }).map((_, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-500 ${
              i < correctCount
                ? "bg-emerald-500 text-background"
                : "bg-red-500/20 text-red-500"
            }`}
          >
            {i < correctCount ? "✓" : "✗"}
          </div>
        ))}
      </div>

      {/* Security checklist - compact grid */}
      <div className="w-full max-w-3xl animate-slide-up">
        <h2 className="text-lg font-semibold mb-4 text-center">
          Security Checklist
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {securityChecklist.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50"
            >
              <div className="shrink-0 p-1.5 rounded-lg bg-accent/20 text-accent">
                {iconMap[item.icon]}
              </div>
              <div>
                <h3 className="font-medium text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="w-full max-w-xl space-y-4 pb-4">
        {/* Final message */}
        <div className="text-center">
          <p className="text-2xl font-bold mb-1">Think before you trust.</p>
          <p className="text-sm text-muted-foreground">
            Stay vigilant. Stay informed. Stay safe.
          </p>
        </div>

        {/* Restart button */}
        <Button
          onClick={onRestart}
          size="lg"
          variant="outline"
          className="w-full text-lg py-5 rounded-xl"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Start Again
        </Button>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/60 tracking-widest uppercase text-center">
          LMU Munich • Usable Security Research
        </p>
      </div>
    </div>
  )
}
