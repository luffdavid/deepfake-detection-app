/**
 * Server-only descriptor matching.
 *
 * Decrypts stored templates in memory, computes cosine similarity against the
 * incoming descriptor, and classifies the result. Templates are never returned
 * to the caller — only the outcome + score.
 */

import { FACE_CONFIG } from "@/lib/face/config"
import { cosineSimilarity } from "@/lib/face/matching"
import type { MatchResult } from "@/lib/face/types"
import { decryptTemplate } from "./crypto"
import type { EncryptedRow } from "./participants-db"

export function matchAgainstTemplates(descriptor: number[], rows: EncryptedRow[]): MatchResult {
  const { similarityThreshold, ambiguousMargin } = FACE_CONFIG.recognition

  if (rows.length === 0) {
    return { outcome: "unknown", participantId: null, similarity: 0, runnerUpSimilarity: 0 }
  }

  const scored = rows
    .map((r) => {
      let sim = 0
      try {
        sim = cosineSimilarity(descriptor, decryptTemplate(r))
      } catch {
        sim = 0 // corrupt/undecryptable row is ignored, never fatal
      }
      return { id: r.id, sim }
    })
    .sort((a, b) => b.sim - a.sim)

  const best = scored[0]
  const runnerUp = scored[1] ?? { id: null as string | null, sim: 0 }

  if (best.sim < similarityThreshold) {
    return { outcome: "unknown", participantId: null, similarity: best.sim, runnerUpSimilarity: runnerUp.sim }
  }
  if (runnerUp.sim >= similarityThreshold && best.sim - runnerUp.sim < ambiguousMargin) {
    return { outcome: "ambiguous", participantId: null, similarity: best.sim, runnerUpSimilarity: runnerUp.sim }
  }
  return { outcome: "matched", participantId: best.id, similarity: best.sim, runnerUpSimilarity: runnerUp.sim }
}
