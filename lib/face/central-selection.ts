/**
 * Central-person selection with temporal stability, hysteresis and ambiguity
 * handling.
 *
 * Responsibilities (requirements 12-16):
 *  - choose the valid face whose center is closest to the camera-frame center
 *  - keep the current participant while their face remains valid
 *  - require a challenger to stay clearly preferable for a configurable time
 *    before switching (hysteresis) — never switch on a single frame
 *  - smooth bounding-box / center changes between frames
 *  - pause selection when there is no valid/central face, when the choice is
 *    ambiguous, or when the selected face degrades (too small/cropped/low quality)
 *  - treat a genuinely new person as a participant-change, not a data merge
 */

import { FACE_CONFIG } from "./config"
import type {
  DetectedFace,
  NormalizedPoint,
  PixelBox,
  SelectedFace,
  SelectionPauseReason,
} from "./types"

export type { SelectionPauseReason }

export interface SelectionUpdate {
  /** The current participant's (smoothed) face, or null when none is held. */
  selected: SelectedFace | null
  /** How long the current participant has been continuously selected (ms). */
  stabilityMs: number
  /** True when two candidates are similarly central (selection paused). */
  ambiguous: boolean
  /** Non-null when selection is paused; null when actively tracking. */
  pauseReason: SelectionPauseReason | null
}

/** Max normalized center distance to consider a face the same participant. */
const MATCH_DIST = 0.2
const DIAG = Math.SQRT1_2 // distance from center to a corner in 0..1 space

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function dist(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Selection score in 0..1 (higher = better). Dominated by centrality. */
export function selectionScore(face: DetectedFace): number {
  const centrality = 1 - clamp01(face.distanceFromCenter / DIAG)
  const quality = 0.5 * face.confidence + 0.3 * face.faceScore + 0.2 * face.descriptorQuality
  return clamp01(0.8 * centrality + 0.2 * quality)
}

interface InternalSelection {
  center: NormalizedPoint
  box: PixelBox // normalized 0..1
  since: number
  lastValidAt: number
  faceRef: DetectedFace
  score: number
}

interface Challenger {
  center: NormalizedPoint
  since: number
}

export class CentralPersonSelector {
  private sel: InternalSelection | null = null
  private challenger: Challenger | null = null

  reset(): void {
    this.sel = null
    this.challenger = null
  }

  private ema(prev: number, next: number): number {
    const a = FACE_CONFIG.selection.smoothing
    return prev + a * (next - prev)
  }

  private smoothPoint(prev: NormalizedPoint, next: NormalizedPoint): NormalizedPoint {
    return { x: this.ema(prev.x, next.x), y: this.ema(prev.y, next.y) }
  }

  private smoothBox(prev: PixelBox, next: PixelBox): PixelBox {
    return {
      x: this.ema(prev.x, next.x),
      y: this.ema(prev.y, next.y),
      width: this.ema(prev.width, next.width),
      height: this.ema(prev.height, next.height),
    }
  }

  private newSelection(face: DetectedFace, score: number, now: number): InternalSelection {
    return {
      center: { ...face.center },
      box: { ...face.boxRaw },
      since: now,
      lastValidAt: now,
      faceRef: face,
      score,
    }
  }

  private updateSelection(face: DetectedFace, score: number, now: number): void {
    if (!this.sel) return
    this.sel.center = this.smoothPoint(this.sel.center, face.center)
    this.sel.box = this.smoothBox(this.sel.box, face.boxRaw)
    this.sel.lastValidAt = now
    this.sel.faceRef = face
    this.sel.score = score
  }

  /** Build the outward-facing smoothed SelectedFace from internal state. */
  private toSelectedFace(): SelectedFace | null {
    if (!this.sel) return null
    const ref = this.sel.faceRef
    // Recover frame size from the reference face (box px / boxRaw) to rebuild
    // a smoothed pixel box for the overlay.
    const frameW = ref.boxRaw.width > 0 ? ref.box.width / ref.boxRaw.width : 0
    const frameH = ref.boxRaw.height > 0 ? ref.box.height / ref.boxRaw.height : 0
    const b = this.sel.box
    const smoothedFace: DetectedFace = {
      ...ref,
      center: { ...this.sel.center },
      boxRaw: { ...b },
      box: { x: b.x * frameW, y: b.y * frameH, width: b.width * frameW, height: b.height * frameH },
    }
    return { face: smoothedFace, score: this.sel.score }
  }

  private nearestValid(
    scored: Array<{ face: DetectedFace; score: number }>,
    center: NormalizedPoint,
  ): { face: DetectedFace; score: number } | null {
    let best: { face: DetectedFace; score: number } | null = null
    let bestD = Infinity
    for (const s of scored) {
      const d = dist(s.face.center, center)
      if (d < bestD && d <= MATCH_DIST) {
        bestD = d
        best = s
      }
    }
    return best
  }

  private reasonFromFaces(faces: DetectedFace[], center: NormalizedPoint): SelectionPauseReason {
    if (faces.length === 0) return "no_face"
    // Look at the face nearest the last known participant position.
    let near: DetectedFace | null = null
    let nearD = Infinity
    for (const f of faces) {
      const d = dist(f.center, center)
      if (d < nearD) {
        nearD = d
        near = f
      }
    }
    if (!near) return "no_face"
    if (!near.isInCentralArea) return "outside_center"
    if (near.invalidReasons.includes("too_small") || near.invalidReasons.includes("cropped")) {
      return "too_small_or_cropped"
    }
    return "low_quality"
  }

  update(faces: DetectedFace[], now: number): SelectionUpdate {
    const cfg = FACE_CONFIG.selection
    const valid = faces.filter((f) => f.isValid)
    const scored = valid
      .map((face) => ({ face, score: selectionScore(face) }))
      .sort((a, b) => b.score - a.score)

    const best = scored[0] ?? null
    const second = scored[1] ?? null
    const ambiguous = !!(
      best &&
      second &&
      Math.abs(best.score - second.score) < FACE_CONFIG.selection.ambiguityThreshold &&
      Math.abs(best.face.distanceFromCenter - second.face.distanceFromCenter) <
        FACE_CONFIG.selection.ambiguityThreshold
    )

    // --- No valid candidate this frame ---
    if (!best) {
      const reason = this.reasonFromFaces(faces, this.sel?.center ?? { x: 0.5, y: 0.5 })
      if (this.sel && now - this.sel.lastValidAt < cfg.lostGraceMs) {
        // Brief loss: keep participant, but pause.
        this.challenger = null
        return {
          selected: this.toSelectedFace(),
          stabilityMs: now - this.sel.since,
          ambiguous: false,
          pauseReason: reason,
        }
      }
      this.reset()
      return { selected: null, stabilityMs: 0, ambiguous: false, pauseReason: reason }
    }

    // --- Ambiguous: two similarly central candidates -> pause, never switch ---
    if (ambiguous) {
      this.challenger = null
      if (this.sel && now - this.sel.lastValidAt < cfg.lostGraceMs) {
        return {
          selected: this.toSelectedFace(),
          stabilityMs: now - this.sel.since,
          ambiguous: true,
          pauseReason: "ambiguous",
        }
      }
      return { selected: null, stabilityMs: 0, ambiguous: true, pauseReason: "ambiguous" }
    }

    // --- No current participant: adopt the best valid candidate ---
    if (!this.sel) {
      this.sel = this.newSelection(best.face, best.score, now)
      this.challenger = null
      return { selected: this.toSelectedFace(), stabilityMs: 0, ambiguous: false, pauseReason: null }
    }

    // --- We have an incumbent: try to re-locate it this frame ---
    const incumbent = this.nearestValid(scored, this.sel.center)
    if (incumbent) {
      this.updateSelection(incumbent.face, incumbent.score, now)

      // Is the global best a *different* face that is clearly preferable?
      const challengerFace = best.face !== incumbent.face ? best : null
      if (challengerFace && challengerFace.score > incumbent.score + cfg.switchScoreMargin) {
        if (!this.challenger || dist(this.challenger.center, challengerFace.face.center) > MATCH_DIST) {
          this.challenger = { center: { ...challengerFace.face.center }, since: now }
        } else {
          this.challenger.center = { ...challengerFace.face.center }
        }
        if (now - this.challenger.since >= cfg.switchDurationMs) {
          // Sustained, clearly-preferable challenger -> participant change.
          this.sel = this.newSelection(challengerFace.face, challengerFace.score, now)
          this.challenger = null
        }
      } else {
        this.challenger = null
      }

      return {
        selected: this.toSelectedFace(),
        stabilityMs: now - this.sel.since,
        ambiguous: false,
        pauseReason: null,
      }
    }

    // --- Incumbent not found among valid faces this frame ---
    if (now - this.sel.lastValidAt < cfg.lostGraceMs) {
      // Brief loss: keep participant, paused.
      return {
        selected: this.toSelectedFace(),
        stabilityMs: now - this.sel.since,
        ambiguous: false,
        pauseReason: this.reasonFromFaces(faces, this.sel.center),
      }
    }

    // Lost too long: the previous participant is gone -> adopt best (new person).
    this.sel = this.newSelection(best.face, best.score, now)
    this.challenger = null
    return { selected: this.toSelectedFace(), stabilityMs: 0, ambiguous: false, pauseReason: null }
  }
}
