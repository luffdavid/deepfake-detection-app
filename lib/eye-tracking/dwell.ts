/**
 * Aggregates gaze samples into dwell time per Area Of Interest (AOI).
 *
 * For every `data-track-id` region it accumulates:
 *  - total time looked at it (ms),
 *  - number of separate visits (a visit = a continuous look, ended by looking
 *    away and back),
 *  - first and last time it was looked at.
 *
 * Time is accumulated from the gap between consecutive samples that land on the
 * same AOI, capped so that tracking pauses do not inflate the totals.
 */

import type { GazeSample } from './types'

/** Coarse category so results can be grouped as button / video / text / slider. */
export type AoiCategory = 'video' | 'button' | 'slider' | 'text' | 'other'

export function getAoiCategory(targetId: string | null): AoiCategory {
  if (!targetId) return 'other'
  if (targetId.includes('video')) return 'video'
  if (targetId.includes('slider')) return 'slider'
  if (targetId.includes('button')) return 'button'
  if (
    /(title|subtitle|heading|caption|hint|instructions|labels|result|why|cues|recommended|review|info|search)/.test(
      targetId,
    )
  ) {
    return 'text'
  }
  return 'other'
}

export interface AoiDwell {
  targetId: string
  category: AoiCategory
  pageId: string | null
  route: string
  /** Total time looked at this AOI, in milliseconds. */
  totalMs: number
  /** Number of separate visits (looks). */
  visits: number
  /** First / last time (epoch ms) the AOI was looked at. */
  firstAt: number
  lastAt: number
}

export class AoiDwellTracker {
  private byKey = new Map<string, AoiDwell>()
  private lastTs: number | null = null
  private lastKey: string | null = null

  constructor(private readonly maxGapMs = 400) {}

  private keyFor(sample: GazeSample): string | null {
    return sample.aoi.targetId ? `${sample.route}::${sample.aoi.targetId}` : null
  }

  record(sample: GazeSample): void {
    const key = this.keyFor(sample)
    const ts = sample.timestamp

    if (key != null) {
      let entry = this.byKey.get(key)
      const isNewVisit = key !== this.lastKey
      if (!entry) {
        entry = {
          targetId: sample.aoi.targetId as string,
          category: getAoiCategory(sample.aoi.targetId),
          pageId: sample.pageId,
          route: sample.route,
          totalMs: 0,
          visits: 0,
          firstAt: ts,
          lastAt: ts,
        }
        this.byKey.set(key, entry)
      }
      if (isNewVisit) {
        entry.visits += 1
      } else if (this.lastTs != null) {
        // Continuous look on the same AOI: add the (capped) elapsed time.
        const dt = Math.min(ts - this.lastTs, this.maxGapMs)
        if (dt > 0) entry.totalMs += dt
      }
      entry.lastAt = ts
    }

    this.lastTs = ts
    this.lastKey = key
  }

  getAll(): AoiDwell[] {
    return [...this.byKey.values()].sort((a, b) => b.totalMs - a.totalMs)
  }

  reset(): void {
    this.byKey.clear()
    this.lastTs = null
    this.lastKey = null
  }
}

export interface GazeReport {
  sessionId: string | null
  /** Epoch ms when the current experiment session (Start Experience) began. */
  sessionStartedAt: number | null
  /** Milliseconds elapsed since the session started. */
  sessionDurationMs: number
  /** Number of raw gaze samples collected. */
  sampleCount: number
  /** Dwell aggregation per AOI, sorted by total time descending. */
  aois: AoiDwell[]
}
