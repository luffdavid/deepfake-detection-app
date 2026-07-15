/**
 * Shared types for the local face-recognition feature.
 *
 * These types describe the *local* pipeline output only. No type here is ever
 * serialized to a backend; biometric data (descriptors) stay in the browser.
 */

/** Simple participant state exposed to the rest of the application. */
export type ParticipantState =
  | "camera_not_ready"
  | "no_face"
  | "outside_center"
  | "ambiguous"
  | "stabilizing"
  | "enrolling"
  | "unknown"
  | "recognized"
  | "tracking_paused"
  | "server_unreachable"

/** Result category of a local descriptor comparison. */
export type RecognitionOutcome = "unknown" | "ambiguous" | "matched"

/** Reason the central-person selector paused / withheld an active participant. */
export type SelectionPauseReason =
  | "no_face"
  | "outside_center"
  | "ambiguous"
  | "too_small_or_cropped"
  | "low_quality"

/** Axis-aligned box in pixel coordinates of the processed frame. */
export interface PixelBox {
  x: number
  y: number
  width: number
  height: number
}

/** Normalized point in 0..1 frame coordinates. */
export interface NormalizedPoint {
  x: number
  y: number
}

/** Head rotation in degrees (from the mesh model), when available. */
export interface HeadRotation {
  roll: number
  yaw: number
  pitch: number
}

/**
 * A single detected face with all locally-computed selection metrics.
 * Contains no personally identifying information; the descriptor is a numeric
 * embedding kept only in memory / IndexedDB.
 */
export interface DetectedFace {
  /** Human's per-frame face id (not stable across frames). */
  id: number
  /** Bounding box in frame pixels. */
  box: PixelBox
  /** Bounding box normalized to 0..1. */
  boxRaw: PixelBox
  /** Face center normalized to 0..1. */
  center: NormalizedPoint
  /** Horizontal distance of the face center from the frame center (normalized). */
  distanceFromCenterX: number
  /** Vertical distance of the face center from the frame center (normalized). */
  distanceFromCenterY: number
  /** Euclidean distance of the face center from the frame center (normalized). */
  distanceFromCenter: number
  /** Face size relative to the frame (max of width/height ratios). */
  sizeRatio: number
  /** Detection confidence (0..1). */
  confidence: number
  /** Mesh/landmark score (0..1). */
  faceScore: number
  /** True when the face box touches / is clipped by a frame edge. */
  isCropped: boolean
  /** True when required landmarks are sufficiently visible. */
  landmarksVisible: boolean
  /** Head rotation, when the mesh model provides it. */
  rotation: HeadRotation | null
  /** Face descriptor (embedding), when the description model produced one. */
  descriptor: number[] | null
  /** Descriptor quality estimate (0..1). */
  descriptorQuality: number
  /** True when the face center lies inside the configured central area. */
  isInCentralArea: boolean
  /** True when the face passes every validity gate. */
  isValid: boolean
  /** Human-readable reasons the face failed validity (debug only). */
  invalidReasons: string[]
}

/** The selected central participant face plus its selection score. */
export interface SelectedFace {
  face: DetectedFace
  /** Selection score (0..1, higher = more central & higher quality). */
  score: number
}

/** Result of a local descriptor comparison against stored templates. */
export interface MatchResult {
  outcome: RecognitionOutcome
  /** Matched participant id, or null when unknown/ambiguous. */
  participantId: string | null
  /** Best similarity score found (0..1), kept for local evaluation. */
  similarity: number
  /** Second-best similarity, used for ambiguity detection. */
  runnerUpSimilarity: number
}

/** A full snapshot of the pipeline, used by the debug overlay & kiosk status. */
export interface FacePipelineSnapshot {
  state: ParticipantState
  /** All detected faces this frame (debug). */
  faces: DetectedFace[]
  /** The currently selected face, if any. */
  selected: SelectedFace | null
  /** How long the current selection has been continuously stable (ms). */
  stabilityMs: number
  /** Why selection is currently paused/withheld (debug). Null when active. */
  pauseReason: SelectionPauseReason | null
  /** Whether descriptor enrollment is currently permitted. */
  enrollmentAllowed: boolean
  /** Enrollment progress 0..1 while enrolling. */
  enrollmentProgress: number
  /** Local match result for the current participant, if computed. */
  match: MatchResult | null
  /** How the current participant became known: matched existing, or newly enrolled. */
  recognitionKind: "matched" | "new" | null
  /** Temporary local track id for the current session's selected participant. */
  trackId: string | null
  /** Recognized/enrolled participant id, if any. */
  participantId: string | null
  /** Frame dimensions in pixels (for overlay scaling). */
  frame: { width: number; height: number }
  /** Last pipeline error, if any (e.g. models/camera/storage unavailable). */
  error: string | null
}
