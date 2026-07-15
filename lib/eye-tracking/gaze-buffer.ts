/**
 * Bounded, local-only buffer for computed gaze samples.
 *
 * In this phase NO data is sent anywhere. Samples are kept in a fixed-size ring
 * buffer in memory; the oldest are dropped when the capacity is exceeded. This
 * guarantees the collection cannot grow without bound during a kiosk session.
 */

import { EYE_TRACKING_CONFIG } from './config'
import type { GazeSample } from './types'

export class GazeBuffer {
  private readonly capacity: number
  private samples: GazeSample[] = []
  private droppedCount = 0

  constructor(capacity: number = EYE_TRACKING_CONFIG.buffer.maxSamples) {
    this.capacity = Math.max(1, capacity)
  }

  push(sample: GazeSample): void {
    this.samples.push(sample)
    if (this.samples.length > this.capacity) {
      const overflow = this.samples.length - this.capacity
      this.samples.splice(0, overflow)
      this.droppedCount += overflow
    }
  }

  getAll(): readonly GazeSample[] {
    return this.samples
  }

  getLast(): GazeSample | null {
    return this.samples.length ? this.samples[this.samples.length - 1] : null
  }

  get size(): number {
    return this.samples.length
  }

  get dropped(): number {
    return this.droppedCount
  }

  clear(): void {
    this.samples = []
    this.droppedCount = 0
  }
}
