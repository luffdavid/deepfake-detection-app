/**
 * Shared types for the eye-tracking system.
 *
 * NOTE ON PRIVACY: `FaceCandidate.trackId` is a volatile, per-frame-ish local
 * label used ONLY to keep the selected participant stable over a few seconds.
 * It is NOT a biometric identifier, is never persisted, and must never be used
 * for recognition. Face recognition / embeddings / identity are explicitly out
 * of scope for this phase.
 */

/** High-level lifecycle of the whole eye-tracking service. */
export type SystemStatus =
  | 'idle'
  | 'checking-camera'
  | 'no-camera'
  | 'need-permission'
  | 'requesting-permission'
  | 'permission-denied'
  | 'loading-models'
  | 'ready' // camera + models ready, waiting for a valid person / calibration
  | 'needs-calibration'
  | 'calibrating'
  | 'tracking'
  | 'paused' // valid selection lost — gaze collection suspended
  | 'calibration-invalid' // geometry changed materially, recalibration required
  | 'error'

/** Why gaze collection is (not) currently allowed by the gatekeeper. */
export type SelectionStatus =
  | 'ok' // exactly one valid, central face — safe to collect
  | 'no-face'
  | 'not-central'
  | 'too-small'
  | 'cropped'
  | 'eyes-not-visible'
  | 'low-quality'
  | 'ambiguous' // two+ similarly central faces — refuse to mix people

/** A normalized bounding box in [0..1] image coordinates. */
export interface NormalizedBox {
  x: number
  y: number
  width: number
  height: number
}

/** A normalized 2D point in [0..1] image coordinates. */
export interface NormalizedPoint {
  x: number
  y: number
}

/** A single detected face candidate (local, non-biometric). */
export interface FaceCandidate {
  /** Volatile local tracking id (NOT biometric, never persisted). */
  trackId: string
  box: NormalizedBox
  /** Center of the face box in normalized image coordinates. */
  center: NormalizedPoint
  /** Distance of the face center from the image center (normalized). */
  centerDistance: number
  /** Detection confidence [0..1]. */
  score: number
  /** Whether both eye keypoints are present/visible. */
  eyesVisible: boolean
  /** Face width as a fraction of the image width. */
  relativeWidth: number
  /** Fraction of the box that lies outside the frame (0 = fully inside). */
  cropFraction: number
  /** Per-candidate quality gate result. */
  status: SelectionStatus
}

/** Result of the gatekeeper for a single processed frame. */
export interface SelectionResult {
  status: SelectionStatus
  /** The selected participant, if exactly one valid central face exists. */
  selected: FaceCandidate | null
  /** All detected candidates (local only, for debug / future extension). */
  candidates: FaceCandidate[]
}

/** Which logical part of a slider the gaze fell on. */
export type SliderRegion = 'left' | 'right' | 'thumb' | 'labels' | 'track'

/** Where the gaze fell relative to a video's actually-visible picture. */
export type VideoHitRegion = 'video' | 'letterbox' | 'outside'

/** AOI details for an element hit (from data-track-id). */
export interface AoiHit {
  /** The data-track-id of the hit element, or null if none. */
  targetId: string | null
  /** Relative X within the element [0..1] (null if no hit). */
  relativeX: number | null
  /** Relative Y within the element [0..1] (null if no hit). */
  relativeY: number | null
  /** Whether the gaze is inside the relevant element. */
  inside: boolean
}

/** Extra AOI details when the hit element is a video. */
export interface VideoAoiDetails {
  videoId: string | null
  /** Current playback position of the video in seconds. */
  currentTime: number | null
  /** Relative X/Y within the ACTUAL visible video picture (excludes letterbox). */
  relativeX: number | null
  relativeY: number | null
  region: VideoHitRegion
}

/** Extra AOI details when the hit element is a slider. */
export interface SliderAoiDetails {
  sliderId: string | null
  /** Current slider value (if resolvable from the DOM). */
  value: number | null
  /** Relative X/Y across the slider surface [0..1]. */
  relativeX: number | null
  relativeY: number | null
  region: SliderRegion | null
}

/** A single computed gaze sample (local record). */
export interface GazeSample {
  timestamp: number
  sessionId: string | null
  pageId: string | null
  pageVersion: string | null
  route: string

  /** Gaze position in CSS pixels within the browser window. */
  windowX: number
  windowY: number
  /** Normalized gaze position in [0..1] across the viewport. */
  normalizedX: number
  normalizedY: number

  /** Screen + viewport geometry at sample time. */
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number

  /** Tracking quality [0..1] and selection state. */
  quality: number
  selectionStatus: SelectionStatus
  /** Volatile local tracking id of the selected participant (non-biometric). */
  trackId: string | null

  /** Generic AOI hit (element with data-track-id). */
  aoi: AoiHit
  /** Video-specific details when the hit element is a video (else null). */
  video: VideoAoiDetails | null
  /** Slider-specific details when the hit element is a slider (else null). */
  slider: SliderAoiDetails | null
}

/** Persisted calibration validity record (local only). */
export interface CalibrationRecord {
  calibrated: boolean
  timestamp: number
  geometry: GeometryFingerprint
}

/** Geometry fingerprint used to detect material changes. */
export interface GeometryFingerprint {
  viewportWidth: number
  viewportHeight: number
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  orientation: string
  fullscreen: boolean
  /** Selected face normalized size at calibration time (proxy for distance). */
  faceWidth: number | null
  /** Selected face normalized center at calibration time (proxy for pose). */
  faceCenterX: number | null
  faceCenterY: number | null
}
