/**
 * POST /api/face/attempt
 *
 * Stores an application performance/progress record for an existing participant
 * (no biometric data). Associates the attempt with the random participant id so
 * repeated attempts can be compared server-side.
 */

import { NextResponse, type NextRequest } from "next/server"
import { preflight } from "@/lib/face/server/guard"
import { attemptSchema } from "@/lib/face/server/validation"
import { ensureFaceSchema } from "@/lib/face/server/init"
import { insertAttempt, participantExists } from "@/lib/face/server/participants-db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const blocked = preflight(request)
  if (blocked) return blocked

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = attemptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const { participantId, sessionId, correctCount, totalCount, score, details } = parsed.data

  try {
    await ensureFaceSchema()
    if (!(await participantExists(participantId))) {
      return NextResponse.json({ error: "unknown_participant" }, { status: 404 })
    }
    await insertAttempt({
      participantId,
      sessionId: sessionId ?? null,
      correctCount,
      totalCount,
      score,
      details,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    console.error("[face/attempt] failed")
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
