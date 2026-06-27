import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClosingGuidanceProps {
  onRestart: () => void
}

const principles = [
  "Verify through official sources before reacting or sharing.",
  "Check context: who produced this, what evidence is cited, and what is missing.",
  "Rely on institutional and editorial verification, not visual judgment alone.",
  "Treat urgency, outrage, sympathy, and aspirational lifestyle cues as reasons to slow down, not speed up.",
]

export function ClosingGuidance({ onRestart }: ClosingGuidanceProps) {
  return (
    <section className="w-full max-w-xl mx-auto px-4 py-14 space-y-8">
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
          Beyond this exercise
        </h2>

        <p className="text-base text-foreground/90 leading-relaxed">
          Visual judgment alone is not a reliable safeguard. The following
          habits matter more than any single visual cue:
        </p>

        <ul className="space-y-3">
          {principles.map((principle) => (
            <li key={principle} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
              <span>{principle}</span>
            </li>
          ))}
        </ul>

        <p className="text-sm text-foreground/80 leading-relaxed pt-1">
          No single cue is reliable on its own. Verification is a process, not a glance.
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={onRestart} variant="outline" size="lg" className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart the exercise
        </Button>
        <p className="text-[11px] text-muted-foreground/50 tracking-widest uppercase text-center">
          LMU Munich · Usable Security Research
        </p>
      </div>
    </section>
  )
}
