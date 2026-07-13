"use client"

import { Button } from "@/components/ui/button"
import { securityChecklist } from "@/lib/scenarios"
import {
  ArrowLeft,
  RotateCcw,
  Search,
  BadgeCheck,
  Newspaper,
  Heart,
  Brain,
  Shield,
} from "lucide-react"

interface FinalChecklistScreenProps {
  onBack: () => void
  onRestart: () => void
}

const iconMap = {
  search: Search,
  "badge-check": BadgeCheck,
  newspaper: Newspaper,
  heart: Heart,
  brain: Brain,
  shield: Shield,
}

export function FinalChecklistScreen({
  onBack,
  onRestart,
}: FinalChecklistScreenProps) {
  return (
    <div className="h-screen w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-10 px-10 py-12">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Before you go
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Final deepfake checklist
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Use these steps whenever you encounter suspicious, emotional, or
            urgent online content.
          </p>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2">
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
        </ul>

        <footer className="mt-auto flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="rounded-full px-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to results
          </Button>

          <Button
            onClick={onRestart}
            size="lg"
            className="rounded-full px-8"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Start again
          </Button>
        </footer>
      </div>
    </div>
  )
}
