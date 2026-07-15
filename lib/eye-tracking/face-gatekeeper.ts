/**
 * Participant gatekeeper.
 *
 * Turns the raw multi-face detections into a STABLE, SAFE selection decision:
 *  - selects the face whose center is closest to the camera-image center
 *  - enforces quality gates (size, crop, visible eyes, central region, score)
 *  - applies temporal hysteresis so the selection does not flip when someone
 *    briefly enters the frame
 *  - pauses when there is no valid face, or when a second relevant person makes
 *    the selection unsafe (we never mix gaze from different people)
 *
 * IMPORTANT (privacy): identity is purely positional. Track ids are volatile
 * local labels derived from frame-to-frame position matching — NOT biometrics.
 * This module is intentionally self-contained so persistent face recognition can
 * be layered on later WITHOUT touching the gaze-tracking system.
 */

import { EYE_TRACKING_CONFIG } from './config'
import type { RawFace } from './face-detector'
import type { FaceCandidate, SelectionResult, SelectionStatus } from './types'

const CFG = EYE_TRACKING_CONFIG.selection
const HYS = EYE_TRACKING_CONFIG.hysteresis

interface Track {
  id: string
  cx: number
  cy: number
  lastSeen: number
}

/** Simple positional (non-biometric) tracker to keep ids stable across frames. */
class PositionalTracker {
  private tracks: Track[] = []
  private counter = 0
  private readonly matchThreshold = 0.15
  private readonly maxAgeMs = 1000

  assign(faces: { cx: number; cy: number }[], now: number): string[] {
    const used = new Set<string>()
    const ids = faces.map((face) => {
      let bestId: string | null = null
      let bestDist = this.matchThreshold
      for (const track of this.tracks) {
        if (used.has(track.id)) continue
        const dist = Math.hypot(track.cx - face.cx, track.cy - face.cy)
        if (dist < bestDist) {
          bestDist = dist
          bestId = track.id
        }
      }
      if (bestId == null) {
        bestId = `f${this.counter++}`
        this.tracks.push({ id: bestId, cx: face.cx, cy: face.cy, lastSeen: now })
      } else {
        const track = this.tracks.find((t) => t.id === bestId)!
        track.cx = face.cx
        track.cy = face.cy
        track.lastSeen = now
      }
      used.add(bestId)
      return bestId
    })
    this.tracks = this.tracks.filter((t) => now - t.lastSeen <= this.maxAgeMs)
    return ids
  }

  reset(): void {
    this.tracks = []
  }
}

function evaluateCandidate(raw: RawFace, trackId: string): FaceCandidate {
  const cx = raw.box.x + raw.box.width / 2
  const cy = raw.box.y + raw.box.height / 2
  const centerDistance = Math.hypot(cx - 0.5, cy - 0.5)
  const relativeWidth = raw.box.width

  // Fraction of the box area outside the frame.
  const ix0 = Math.max(0, raw.box.x)
  const iy0 = Math.max(0, raw.box.y)
  const ix1 = Math.min(1, raw.box.x + raw.box.width)
  const iy1 = Math.min(1, raw.box.y + raw.box.height)
  const visibleArea = Math.max(0, ix1 - ix0) * Math.max(0, iy1 - iy0)
  const boxArea = Math.max(1e-6, raw.box.width * raw.box.height)
  const cropFraction = 1 - visibleArea / boxArea

  // blaze_face keypoints: [0] right eye, [1] left eye (image-space).
  const rightEye = raw.keypoints[0]
  const leftEye = raw.keypoints[1]
  const eyeVisible = (kp?: { x: number; y: number }) =>
    !!kp && kp.x > 0.02 && kp.x < 0.98 && kp.y > 0.02 && kp.y < 0.98
  const eyesVisible = eyeVisible(rightEye) && eyeVisible(leftEye)

  let status: SelectionStatus = 'ok'
  if (raw.score < CFG.minDetectionScore) status = 'low-quality'
  else if (relativeWidth < CFG.minFaceWidth) status = 'too-small'
  else if (relativeWidth > CFG.maxFaceWidth) status = 'low-quality'
  else if (cropFraction > CFG.maxCropFraction) status = 'cropped'
  else if (!eyesVisible) status = 'eyes-not-visible'
  else if (centerDistance > CFG.centralRadius) status = 'not-central'

  return {
    trackId,
    box: raw.box,
    center: { x: cx, y: cy },
    centerDistance,
    score: raw.score,
    eyesVisible,
    relativeWidth,
    cropFraction,
    status,
  }
}

export class FaceGatekeeper {
  private tracker = new PositionalTracker()
  private selectedTrackId: string | null = null
  private lastSeenSelectedAt = 0
  private acquiringTrackId: string | null = null
  private acquiringSince = 0

  update(faces: RawFace[], now: number = performance.now()): SelectionResult {
    const centers = faces.map((f) => ({
      cx: f.box.x + f.box.width / 2,
      cy: f.box.y + f.box.height / 2,
    }))
    const ids = this.tracker.assign(centers, now)
    const candidates = faces.map((raw, i) => evaluateCandidate(raw, ids[i]))

    const validCentral = candidates
      .filter((c) => c.status === 'ok')
      .sort((a, b) => a.centerDistance - b.centerDistance)

    // Two or more valid central faces -> unsafe, never mix people -> pause.
    if (validCentral.length >= 2) {
      this.acquiringTrackId = null
      // Keep selectedTrackId memory briefly so a transient second face that
      // leaves lets us resume the same person without re-acquiring.
      return { status: 'ambiguous', selected: null, candidates }
    }

    // Exactly one valid central face.
    if (validCentral.length === 1) {
      const cand = validCentral[0]

      // Incumbent still selected and present -> keep (stable).
      if (this.selectedTrackId === cand.trackId) {
        this.lastSeenSelectedAt = now
        this.acquiringTrackId = null
        return { status: 'ok', selected: cand, candidates }
      }

      // Incumbent present but temporarily not this candidate: honour loss grace.
      if (
        this.selectedTrackId != null &&
        now - this.lastSeenSelectedAt < HYS.lossGraceMs
      ) {
        return { status: 'paused', selected: null, candidates }
      }

      // Acquire this candidate with hysteresis (must persist before we trust it).
      if (this.acquiringTrackId === cand.trackId) {
        if (now - this.acquiringSince >= HYS.switchDelayMs) {
          this.selectedTrackId = cand.trackId
          this.lastSeenSelectedAt = now
          this.acquiringTrackId = null
          return { status: 'ok', selected: cand, candidates }
        }
        return { status: 'paused', selected: null, candidates }
      }

      this.acquiringTrackId = cand.trackId
      this.acquiringSince = now
      return { status: 'paused', selected: null, candidates }
    }

    // No valid central face.
    this.acquiringTrackId = null
    if (this.selectedTrackId != null && now - this.lastSeenSelectedAt < HYS.lossGraceMs) {
      // Brief drop of the selected face -> hold (paused) during grace period.
      return { status: 'paused', selected: null, candidates }
    }
    this.selectedTrackId = null

    // Report the most informative pause reason.
    let status: SelectionStatus = 'no-face'
    if (candidates.length > 0) {
      const mostCentral = [...candidates].sort(
        (a, b) => a.centerDistance - b.centerDistance,
      )[0]
      status = mostCentral.status === 'ok' ? 'not-central' : mostCentral.status
    }
    return { status, selected: null, candidates }
  }

  /** The currently selected participant's volatile local track id (or null). */
  get currentTrackId(): string | null {
    return this.selectedTrackId
  }

  reset(): void {
    this.tracker.reset()
    this.selectedTrackId = null
    this.acquiringTrackId = null
    this.lastSeenSelectedAt = 0
  }
}
