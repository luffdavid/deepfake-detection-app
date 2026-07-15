/**
 * Server-only analytics helpers for face-recognition participant progress.
 * Returns ONLY non-biometric aggregates (never templates/ciphertext).
 */

import { ensureFaceSchema } from "./init"
import {
  getAttemptsByParticipant,
  getParticipantsWithProgress,
  type AttemptRow,
  type ParticipantProgressRow,
} from "./participants-db"

export interface FaceProgressOverview {
  participants: number
  /** Participants with more than one recorded attempt. */
  returning: number
  /** Participants recognized more than once (observations > 1). */
  recognizedAgain: number
  /** Among multi-attempt participants, how many improved (last > first). */
  improvedCount: number
  /** Among multi-attempt participants, how many regressed (last < first). */
  regressedCount: number
  /** Number of participants with >1 attempt (denominator for improvement). */
  multiAttemptCount: number
  /** Mean first-attempt score (0..1) among multi-attempt participants. */
  avgFirst: number
  /** Mean last-attempt score (0..1) among multi-attempt participants. */
  avgLast: number
  /** avgLast - avgFirst (0..1). */
  avgImprovement: number
  rows: ParticipantProgressRow[]
}

const EMPTY: FaceProgressOverview = {
  participants: 0,
  returning: 0,
  recognizedAgain: 0,
  improvedCount: 0,
  regressedCount: 0,
  multiAttemptCount: 0,
  avgFirst: 0,
  avgLast: 0,
  avgImprovement: 0,
  rows: [],
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

export async function getFaceProgressOverview(): Promise<FaceProgressOverview> {
  try {
    await ensureFaceSchema()
    const rows = await getParticipantsWithProgress()

    const multi = rows.filter(
      (r) => r.attempts > 1 && r.firstScore !== null && r.lastScore !== null,
    )
    const improvedCount = multi.filter((r) => (r.lastScore as number) > (r.firstScore as number)).length
    const regressedCount = multi.filter((r) => (r.lastScore as number) < (r.firstScore as number)).length
    const avgFirst = avg(multi.map((r) => r.firstScore as number))
    const avgLast = avg(multi.map((r) => r.lastScore as number))

    return {
      participants: rows.length,
      returning: rows.filter((r) => r.attempts > 1).length,
      recognizedAgain: rows.filter((r) => r.observations > 1).length,
      improvedCount,
      regressedCount,
      multiAttemptCount: multi.length,
      avgFirst,
      avgLast,
      avgImprovement: avgLast - avgFirst,
      rows,
    }
  } catch {
    return EMPTY
  }
}

/** Relative improvement percentage from first to last (e.g. 0.4 -> 0.8 = +100%). */
export function relativeImprovementPct(first: number | null, last: number | null): number | null {
  if (first === null || last === null) return null
  if (first > 0) return ((last - first) / first) * 100
  if (last > 0) return 100
  return 0
}

/** An anonymous person entry ("Person N") for the participants directory. */
export interface PersonSummary {
  /** 1-based anonymous label index (stable by enrollment order). */
  index: number
  id: string
  attempts: number
  observations: number
  firstScore: number | null
  lastScore: number | null
  bestScore: number | null
  /** Absolute change in percentage points (last - first) * 100. */
  improvementPp: number | null
  /** Relative improvement percentage. */
  improvementPct: number | null
  createdAt: string
  lastSeenAt: string
}

function toPerson(r: ParticipantProgressRow, index: number): PersonSummary {
  const improvementPp =
    r.firstScore !== null && r.lastScore !== null ? (r.lastScore - r.firstScore) * 100 : null
  return {
    index,
    id: r.id,
    attempts: r.attempts,
    observations: r.observations,
    firstScore: r.firstScore,
    lastScore: r.lastScore,
    bestScore: r.bestScore,
    improvementPp,
    improvementPct: relativeImprovementPct(r.firstScore, r.lastScore),
    createdAt: r.createdAt,
    lastSeenAt: r.lastSeenAt,
  }
}

/**
 * Anonymous participant directory: everyone as "Person N", numbered stably by
 * enrollment time (earliest enrolled = Person 1). No PII, no templates.
 */
export async function getPersonDirectory(): Promise<PersonSummary[]> {
  try {
    await ensureFaceSchema()
    const rows = await getParticipantsWithProgress()
    // Stable anonymous numbering by creation time (oldest first).
    rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return rows.map((r, i) => toPerson(r, i + 1))
  } catch {
    return []
  }
}

export interface PersonDetail {
  person: PersonSummary
  attempts: AttemptRow[]
}

/** Directory + the attempts of the person at the given 1-based index. */
export async function getPersonDirectoryWithDetail(
  selectedIndex: number,
): Promise<{ directory: PersonSummary[]; detail: PersonDetail | null }> {
  const directory = await getPersonDirectory()
  if (directory.length === 0) return { directory, detail: null }

  const clamped = Math.min(Math.max(1, selectedIndex), directory.length)
  const person = directory[clamped - 1]
  try {
    const attempts = await getAttemptsByParticipant(person.id)
    return { directory, detail: { person, attempts } }
  } catch {
    return { directory, detail: { person, attempts: [] } }
  }
}
