/**
 * Local descriptor enrollment (requirements 18 & 19).
 *
 * A descriptor is only generated when the participant is stable, sufficiently
 * large, approximately frontal, good quality, not cropped, and unambiguously
 * the single central participant. Rather than replacing the descriptor every
 * frame, several high-quality descriptors are collected over a short enrollment
 * window and aggregated (quality-weighted mean + L2 normalization) into one
 * stable participant template.
 */

import { FACE_CONFIG } from "./config"
import type { SelectedFace } from "./types"
import type { SelectionPauseReason } from "./central-selection"

interface Sample {
  descriptor: number[]
  quality: number
  confidence: number
}

export interface AggregatedTemplate {
  descriptor: number[]
  count: number
  meanDescriptorQuality: number
  meanConfidence: number
}

/** Whether descriptor enrollment is currently permitted for the selected face. */
export function enrollmentAllowed(
  selected: SelectedFace | null,
  stabilityMs: number,
  ambiguous: boolean,
  pauseReason: SelectionPauseReason | null,
): boolean {
  if (!selected || ambiguous || pauseReason) return false

  const f = selected.face
  const e = FACE_CONFIG.enrollment

  if (stabilityMs < e.stableDurationMs) return false
  if (f.sizeRatio < e.minFaceSizeRatio) return false
  if (f.isCropped) return false
  if (!f.descriptor) return false
  if (f.descriptorQuality < e.minSampleQuality) return false

  if (f.rotation) {
    if (Math.abs(f.rotation.yaw) > e.maxYawDeg) return false
    if (Math.abs(f.rotation.pitch) > e.maxPitchDeg) return false
    if (Math.abs(f.rotation.roll) > e.maxRollDeg) return false
  }

  return true
}

export class DescriptorEnroller {
  private samples: Sample[] = []
  private lastSampleAt = 0

  reset(): void {
    this.samples = []
    this.lastSampleAt = 0
  }

  get sampleCount(): number {
    return this.samples.length
  }

  progress(): number {
    return Math.min(1, this.samples.length / FACE_CONFIG.enrollment.samplesRequired)
  }

  isComplete(): boolean {
    return this.samples.length >= FACE_CONFIG.enrollment.samplesRequired
  }

  /**
   * Add one enrollment sample if enough time has passed since the last one.
   * Caller must ensure enrollment is currently allowed for this face.
   * @returns true if a sample was recorded this call.
   */
  addSampleIfDue(selected: SelectedFace, now: number): boolean {
    const f = selected.face
    if (!f.descriptor) return false
    if (now - this.lastSampleAt < FACE_CONFIG.enrollment.sampleIntervalMs) return false

    this.samples.push({
      descriptor: f.descriptor.slice(),
      quality: f.descriptorQuality,
      confidence: f.confidence,
    })
    this.lastSampleAt = now
    return true
  }

  /** Quality-weighted mean of collected descriptors, L2-normalized. */
  aggregate(): AggregatedTemplate | null {
    if (this.samples.length === 0) return null

    const dim = this.samples[0].descriptor.length
    const acc = new Array<number>(dim).fill(0)
    let weightSum = 0
    let qualitySum = 0
    let confidenceSum = 0

    for (const s of this.samples) {
      const w = Math.max(0.001, s.quality)
      for (let i = 0; i < dim; i++) acc[i] += s.descriptor[i] * w
      weightSum += w
      qualitySum += s.quality
      confidenceSum += s.confidence
    }

    // Weighted mean.
    for (let i = 0; i < dim; i++) acc[i] /= weightSum

    // L2 normalization for a stable, comparable template.
    let norm = 0
    for (let i = 0; i < dim; i++) norm += acc[i] * acc[i]
    norm = Math.sqrt(norm)
    if (norm > 0) {
      for (let i = 0; i < dim; i++) acc[i] /= norm
    }

    return {
      descriptor: acc,
      count: this.samples.length,
      meanDescriptorQuality: qualitySum / this.samples.length,
      meanConfidence: confidenceSum / this.samples.length,
    }
  }
}
