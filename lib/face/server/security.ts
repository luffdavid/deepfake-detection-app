/**
 * Server-only API security helpers: origin checks, in-memory rate limiting,
 * client IP extraction, payload guards, and constant-time admin-token checks.
 *
 * Note: the in-memory rate limiter is per server instance (best-effort on
 * serverless). For hard guarantees use a shared store; documented as such.
 */

import { timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"

/** Max accepted JSON body size for biometric endpoints (bytes). */
export const MAX_BODY_BYTES = 100_000

function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/** Same-origin enforcement (plus optional FACE_API_ALLOWED_ORIGINS hosts). */
export function isAllowedOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host")
  if (!host) return false

  const allowed = new Set<string>([host])
  const extra = process.env.FACE_API_ALLOWED_ORIGINS
  if (extra) {
    for (const o of extra.split(",")) {
      const h = hostOf(o.trim())
      if (h) allowed.add(h)
    }
  }

  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  // State-changing requests must carry an Origin or Referer we trust.
  if (origin) return allowed.has(hostOf(origin) ?? "")
  if (referer) return allowed.has(hostOf(referer) ?? "")
  return false
}

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

const buckets = new Map<string, { count: number; reset: number }>()

/** Simple fixed-window rate limiter. Returns true when the request is allowed. */
export function rateLimit(key: string, limit = 40, windowMs = 10_000): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count += 1
  return true
}

/** Reject bodies larger than the limit based on the Content-Length header. */
export function isPayloadTooLarge(request: NextRequest, max = MAX_BODY_BYTES): boolean {
  const len = Number(request.headers.get("content-length") ?? "0")
  return Number.isFinite(len) && len > max
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Validate an admin token against ADMIN_API_TOKEN (server secret). */
export function checkAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected || !token) return false
  return safeEqual(token, expected)
}
