/**
 * Central configuration for the browser-based eye-tracking system.
 *
 * PRIVACY / NETWORK POLICY
 * ------------------------
 * All models and assets below are served from OUR OWN domain (the `public/`
 * folder). Nothing is loaded from an external CDN. Webcam frames, face boxes,
 * landmarks and temporary tracking ids never leave the browser. In this phase
 * computed gaze samples are only kept in a local, bounded in-memory buffer — no
 * network requests are made with tracking data.
 *
 * This file is the single source of truth for tuning the pipeline; nothing here
 * should be duplicated across components.
 */

export const EYE_TRACKING_CONFIG = {
  /**
   * Locally hosted model + wasm asset paths (relative to our own origin).
   * See scripts/vendor-eyetracking-assets.ps1 for how these were vendored.
   */
  assets: {
    /** MediaPipe tasks-vision wasm loader directory. */
    mediapipeWasmPath: '/models/mediapipe/wasm',
    /** MediaPipe FaceLandmarker model used internally by WebEyeTrack. */
    faceLandmarkerModelPath: '/models/mediapipe/face_landmarker.task',
    /** MediaPipe FaceDetector model used by the gatekeeper. */
    faceDetectorModelPath: '/models/mediapipe/blaze_face_short_range.tflite',
    /**
     * WebEyeTrack BlazeGaze model. WebEyeTrack loads this itself from
     * `${origin}/web/model.json`, so the folder name is fixed to `/web`.
     */
    blazeGazeModelDir: '/web',
  },

  /** Webcam capture constraints. Camera is centered above a large kiosk display. */
  camera: {
    width: 640,
    height: 480,
    facingMode: 'user' as const,
    /** Downscaled frame size fed to the models (keeps inference fast). */
    processingWidth: 640,
    processingHeight: 480,
  },

  /**
   * Sampling: do NOT emit a record for every frame. Target a steady rate of
   * valid gaze points. 10–15 Hz is a good compromise between temporal
   * resolution and storage. Centrally configurable here.
   */
  sampling: {
    targetHz: 10,
    /** Upper bound for the processing loop so we never busy-spin. */
    maxLoopHz: 12,
  },

  /**
   * Central-person selection + quality gates (all in normalized [0..1] image
   * coordinates so they are resolution independent — no fixed pixels).
   */
  selection: {
    /** A face counts as "central" if its center is within this radius of the
     *  image center (fraction of the min image dimension). */
    centralRadius: 0.28,
    /** Minimum face box size as a fraction of the image width. Rejects people
     *  standing far away in the background. */
    minFaceWidth: 0.12,
    /** Maximum face box size (sanity guard against detector artefacts). */
    maxFaceWidth: 0.95,
    /** How far a face box may extend outside the frame before it is considered
     *  significantly cropped (fraction of the box size). */
    maxCropFraction: 0.15,
    /** Minimum MediaPipe detection confidence. */
    minDetectionScore: 0.5,
    /** Two faces are "similarly central" (ambiguous) when the difference in
     *  their center-distance is below this margin. */
    ambiguityMargin: 0.06,
  },

  /**
   * Temporal stability (hysteresis) so the selected participant does not switch
   * the instant another person briefly enters the frame.
   */
  hysteresis: {
    /** A different, clearly-more-central face must win continuously for this
     *  long before we switch the selected participant. */
    switchDelayMs: 800,
    /** The challenger must be at least this much more central than the current
     *  selection (fraction of min image dimension) to start the switch timer. */
    switchAdvantage: 0.05,
    /** Grace period: if the selected face momentarily disappears we keep the
     *  selection for this long before dropping to "no-face". */
    lossGraceMs: 400,
  },

  /**
   * Geometry watchers. When the physical/on-screen geometry changes materially,
   * the existing calibration is no longer valid.
   */
  geometry: {
    /** Relative change in viewport width/height that invalidates calibration. */
    viewportChangeFraction: 0.02,
    /** Change in the selected face's normalized size that implies the person
     *  moved substantially closer/further (invalidates calibration). */
    faceSizeChangeFraction: 0.25,
    /** Change in the selected face's normalized center position that implies a
     *  large head/camera reposition (invalidates calibration). */
    faceCenterChange: 0.12,
    /** How long a geometry deviation must persist before we invalidate (avoids
     *  reacting to transient jitter). */
    debounceMs: 600,
  },

  /** Local bounded buffer for gaze samples (no network sending in this phase). */
  buffer: {
    maxSamples: 5000,
  },

  /**
   * Gaze smoothing (One-Euro filter) applied to the on-screen point. Lower
   * `minCutoff` = steadier dot when the eyes are still, but slightly more lag;
   * higher `beta` = follows fast eye movements more closely.
   */
  smoothing: {
    minCutoff: 0.8,
    beta: 0.02,
    dCutoff: 1.0,
  },

  /** AOI dwell aggregation. */
  dwell: {
    /** Max gap (ms) between consecutive samples still counted as one continuous look. */
    maxGapMs: 400,
    /** localStorage/sessionStorage key for the live gaze report. */
    storageKey: 'trustcheck_gaze_report',
  },

  /** Calibration configuration (9-point multi-point calibration). */
  calibration: {
    /** Normalized [0..1] target positions across the whole relevant screen area. */
    points: [
      [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
      [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
      [0.1, 0.9], [0.5, 0.9], [0.9, 0.9],
    ] as ReadonlyArray<readonly [number, number]>,
    /** Valid gaze samples collected per target before advancing. */
    samplesPerPoint: 12,
    /** Milliseconds to let the eyes settle on a new target before sampling. */
    settleMs: 900,
    /** localStorage key for the calibration validity/geometry record. */
    storageKey: 'trustcheck_calibration',
  },

  /**
   * Debug overlay. MUST be off by default in the production kiosk view.
   * Enabled only via `?etdebug=1` in the URL or localStorage `ET_DEBUG=true`.
   */
  debug: {
    urlParam: 'etdebug',
    storageKey: 'ET_DEBUG',
  },

  /** Testing aids. */
  testing: {
    /**
     * Show a gaze indicator (a translucent circle marking the ~area you look
     * at). Useful while validating the tracker. Set to false for the real study
     * so participants are not biased by following it.
     */
    showGazeDot: true,
    /** Diameter in px of the gaze-area circle (it is an area, not a point). */
    gazeAreaDiameter: 72,
  },
} as const

export type EyeTrackingConfig = typeof EYE_TRACKING_CONFIG

/** Resolve whether the local debug overlay should be active (client-only). */
export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get(EYE_TRACKING_CONFIG.debug.urlParam) === '1') return true
    return window.localStorage.getItem(EYE_TRACKING_CONFIG.debug.storageKey) === 'true'
  } catch {
    return false
  }
}
