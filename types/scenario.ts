import type { Scenario, TrustLevel } from "@/lib/scenarios"

export type ScenarioReview = Scenario & {
  shortLabel?: string
  userTrust?: TrustLevel
  isCorrect?: boolean
}