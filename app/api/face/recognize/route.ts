/**
 * POST /api/face/recognize
 *
 * Accepts a locally-computed descriptor, matches it server-side against the
 * encrypted templates, and returns only the outcome + similarity. The stored
 * template database is NEVER returned to the browser.
 *
 * Never logs the descriptor or any biometric payload.
 */

import { NextResponse, type NextRequest } from "next/server"
import { preflight } from "@/lib/face/server/guard"
import { recognizeSchema } from "@/lib/face/server/validation"
import { encryptionAvailable } from "@/lib/face/server/crypto"
import { ensureFaceSchema } from "@/lib/face/server/init"
import {
  insertRecognitionEvent,
  listEncryptedTemplates,
  touchParticipant,
} from "@/lib/face/server/participants-db"
import { matchAgainstTemplates } from "@/lib/face/server/matching"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const blocked = preflight(request)
  if (blocked) return blocked

  if (!encryptionAvailable()) {
    return NextResponse.json({ error: "encryption_unavailable" }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = recognizeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const { descriptor, modelVersion } = parsed.data

  try {
    await ensureFaceSchema()
    const rows = await listEncryptedTemplates()
    const result = matchAgainstTemplates(descriptor, rows)

    if (result.outcome === "matched" && result.participantId) {
      await touchParticipant(result.participantId)
      await insertRecognitionEvent({
        participantId: result.participantId,
        outcome: result.outcome,
        similarity: result.similarity,
        modelVersion,
      })
    }

    // Only outcome + scores leave the server; never the templates.
    return NextResponse.json(
      {
        outcome: result.outcome,
        participantId: result.participantId,
        similarity: result.similarity,
        runnerUpSimilarity: result.runnerUpSimilarity,
      },
      { status: 200 },
    )
  } catch {
    console.error("[face/recognize] failed")
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
