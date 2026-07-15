"use server"

/**
 * Server actions for participant-data administration.
 *
 * All actions require the ADMIN_API_TOKEN server secret, provided by the
 * operator and compared in constant time. The token is never exposed to the
 * client. Destructive actions additionally require a typed confirmation.
 */

import { checkAdminToken } from "@/lib/face/server/security"
import { ensureFaceSchema } from "@/lib/face/server/init"
import {
  deleteAllFaceData,
  deleteParticipant,
  getFaceDataCounts,
  type FaceDataCounts,
} from "@/lib/face/server/participants-db"

export interface AdminResult {
  ok: boolean
  error?: string
  counts?: FaceDataCounts
  deleted?: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Return current row counts across all face tables (verification tool). */
export async function verifyStatusAction(token: string): Promise<AdminResult> {
  if (!checkAdminToken(token)) return { ok: false, error: "unauthorized" }
  try {
    await ensureFaceSchema()
    const counts = await getFaceDataCounts()
    return { ok: true, counts }
  } catch {
    return { ok: false, error: "server_error" }
  }
}

/** Delete a single participant and everything that cascades from it. */
export async function deleteParticipantAction(
  token: string,
  participantId: string,
): Promise<AdminResult> {
  if (!checkAdminToken(token)) return { ok: false, error: "unauthorized" }
  if (!UUID_RE.test(participantId)) return { ok: false, error: "invalid_participant_id" }
  try {
    await ensureFaceSchema()
    const deleted = await deleteParticipant(participantId)
    const counts = await getFaceDataCounts()
    return { ok: true, counts, deleted }
  } catch {
    return { ok: false, error: "server_error" }
  }
}

/**
 * Full-project deletion: remove ALL participant records + cascading data.
 * Requires the confirmation phrase to exactly equal "DELETE ALL".
 */
export async function deleteAllAction(token: string, confirmation: string): Promise<AdminResult> {
  if (!checkAdminToken(token)) return { ok: false, error: "unauthorized" }
  if (confirmation !== "DELETE ALL") return { ok: false, error: "invalid_confirmation" }
  try {
    await ensureFaceSchema()
    await deleteAllFaceData()
    const counts = await getFaceDataCounts()
    return { ok: true, counts }
  } catch {
    return { ok: false, error: "server_error" }
  }
}
