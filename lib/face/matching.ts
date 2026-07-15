/**
 * Pure descriptor-similarity math shared by the server matcher.
 *
 * Matching itself is performed SERVER-SIDE (see lib/face/server/matching.ts).
 * This module only exposes the cosine-similarity primitive, which is imported
 * by the server. It contains no browser APIs and no persistence.
 */

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Cosine similarity of two equal-length vectors, clamped to 0..1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return clamp01(dot / (Math.sqrt(na) * Math.sqrt(nb)))
}
