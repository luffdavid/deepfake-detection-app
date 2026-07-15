/**
 * Temporary local tracking (requirement 17).
 *
 * Maintains a temporary, session-scoped track identifier for the currently
 * selected participant. The id lives only in memory for the current browser
 * session and is regenerated whenever the participant is lost or replaced.
 *
 * This is NOT the persistent participant id (that comes from recognition /
 * enrollment). It only labels a continuous run of frames for the same selected
 * face so tracking survives brief turn-aways but resets on a real change.
 */

import type { SelectedFace } from "./types"

/** Stability drop (ms) that indicates the selector started a new selection. */
const SWITCH_RESET_EPS = 300

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `trk_${crypto.randomUUID()}`
  }
  return `trk_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export class TemporaryTracker {
  private trackId: string | null = null
  private lastStabilityMs = 0

  reset(): void {
    this.trackId = null
    this.lastStabilityMs = 0
  }

  get current(): string | null {
    return this.trackId
  }

  /**
   * Advance the tracker for a frame.
   * @returns the current track id (or null when no participant is held).
   */
  update(selected: SelectedFace | null, stabilityMs: number): string | null {
    if (!selected) {
      this.trackId = null
      this.lastStabilityMs = 0
      return null
    }

    const isNewRun = this.trackId === null || stabilityMs + SWITCH_RESET_EPS < this.lastStabilityMs
    if (isNewRun) {
      this.trackId = newId()
    }
    this.lastStabilityMs = stabilityMs
    return this.trackId
  }
}
