/**
 * POST /api/face/enroll
 *
 * Accepts a locally-computed face descriptor + quality metadata, encrypts the
 * descriptor with AES-256-GCM, and stores it as a new participant template in
 * PostgreSQL. Returns only the new random participant id.
 *
 * Never logs the descriptor or any biometric payload.
 */

import { NextResponse, type NextRequest } from "next/server"
import { preflight } from "@/lib/face/server/guard"
import { enrollSchema } from "@/lib/face/server/validation"
import { encryptionAvailable, encryptTemplate } from "@/lib/face/server/crypto"
import { ensureFaceSchema } from "@/lib/face/server/init"
import { insertParticipant } from "@/lib/face/server/participants-db"

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

  const parsed = enrollSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const { descriptor, modelVersion, descriptorVersion, enrollmentQuality, enrollmentConfidence } =
    parsed.data

  try {
    await ensureFaceSchema()
    const enc = encryptTemplate(descriptor)
    const id = await insertParticipant(enc, {
      modelVersion,
      descriptorVersion,
      descriptorDim: descriptor.length,
      enrollmentQuality,
      enrollmentConfidence: enrollmentConfidence ?? null,
    })
    return NextResponse.json({ participantId: id }, { status: 201 })
  } catch {
    // Never include the payload/descriptor in logs.
    console.error("[face/enroll] failed")
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
