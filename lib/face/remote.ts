/**
 * Client-side remote calls to our own backend.
 *
 * This replaces all browser persistence. NOTHING participant-related is stored
 * in the browser: descriptors, quality metadata and attempts are sent to our
 * server over HTTPS and forgotten. There is intentionally NO offline retry
 * queue — if the server is unreachable the caller pauses and surfaces an error.
 */

import { FACE_CONFIG } from "./config"
import type { MatchResult } from "./types"

export interface AttemptInput {
  scenarioId: string
  userTrust: string
  isCorrect: boolean
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`request_failed_${res.status}`)
  }
  return (await res.json()) as T
}

/** Ask the server to recognize a descriptor. Never receives templates back. */
export async function recognizeDescriptor(descriptor: number[]): Promise<MatchResult> {
  return postJson<MatchResult>("/api/face/recognize", {
    descriptor,
    modelVersion: FACE_CONFIG.version.model,
    descriptorVersion: FACE_CONFIG.version.descriptor,
  })
}

/** Enroll an aggregated descriptor server-side; returns the new participant id. */
export async function enrollDescriptor(
  descriptor: number[],
  enrollmentQuality: number,
  enrollmentConfidence: number | null,
): Promise<{ participantId: string }> {
  return postJson<{ participantId: string }>("/api/face/enroll", {
    descriptor,
    modelVersion: FACE_CONFIG.version.model,
    descriptorVersion: FACE_CONFIG.version.descriptor,
    enrollmentQuality,
    enrollmentConfidence,
  })
}

/** Persist an attempt (progress) for a participant server-side. */
export async function recordAttemptRemote(payload: {
  participantId: string
  sessionId: string | null
  correctCount: number
  totalCount: number
  score: number
  details: AttemptInput[]
}): Promise<void> {
  await postJson("/api/face/attempt", payload)
}
