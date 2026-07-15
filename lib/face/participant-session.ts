/**
 * Tiny module-level store for the *current* recognized participant.
 *
 * This decouples the frame-rate face pipeline from the rest of the app: the
 * face controller updates this store, and the application reads it only when it
 * needs to associate performance data with a participant. Nothing here triggers
 * React re-renders of the main experience, and nothing is persisted in the
 * browser — the participant id lives only in volatile memory.
 */

import { recordAttemptRemote, type AttemptInput } from "./remote"
import type { ParticipantState } from "./types"

let currentParticipantId: string | null = null
let currentState: ParticipantState = "camera_not_ready"

type Listener = () => void
const listeners = new Set<Listener>()

export function setCurrentParticipant(id: string | null, state: ParticipantState): void {
  const changed = id !== currentParticipantId || state !== currentState
  currentParticipantId = id
  currentState = state
  if (changed) listeners.forEach((l) => l())
}

export function getCurrentParticipantId(): string | null {
  return currentParticipantId
}

export function getCurrentParticipantState(): ParticipantState {
  return currentState
}

export function subscribeParticipant(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Associate a completed attempt with the currently recognized participant.
 * Sends the result to our server (no browser storage). No-op when no
 * participant is recognized or when the server is unreachable.
 */
export async function recordAttemptForCurrentParticipant(params: {
  sessionId: string | null
  correctCount: number
  totalCount: number
  details: AttemptInput[]
}) {
  const id = currentParticipantId
  if (!id) return null
  try {
    await recordAttemptRemote({
      participantId: id,
      sessionId: params.sessionId,
      correctCount: params.correctCount,
      totalCount: params.totalCount,
      score: params.totalCount > 0 ? params.correctCount / params.totalCount : 0,
      details: params.details,
    })
    return true
  } catch {
    // No local fallback / retry queue by design; never break the app flow.
    return null
  }
}
