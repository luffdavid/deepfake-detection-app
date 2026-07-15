/**
 * Shared preflight guard for biometric API routes:
 * payload-size limit -> origin check -> rate limit.
 * Returns an error response, or null when the request may proceed.
 */

import { NextResponse, type NextRequest } from "next/server"
import { getClientIp, isAllowedOrigin, isPayloadTooLarge, rateLimit } from "./security"

export function preflight(request: NextRequest, rlLimit = 40): NextResponse | null {
  if (isPayloadTooLarge(request)) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 })
  }
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 })
  }
  const ip = getClientIp(request)
  if (!rateLimit(`face:${ip}`, rlLimit)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }
  return null
}
