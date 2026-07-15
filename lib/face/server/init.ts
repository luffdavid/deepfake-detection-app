/**
 * Memoized face-schema initialization so each cold server instance creates the
 * tables at most once.
 */

import { initFaceSchema } from "./participants-db"

let ready: Promise<void> | null = null

export function ensureFaceSchema(): Promise<void> {
  if (!ready) {
    ready = initFaceSchema().catch((err) => {
      ready = null // allow a retry on the next request
      throw err
    })
  }
  return ready
}
