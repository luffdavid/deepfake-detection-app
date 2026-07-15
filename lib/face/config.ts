/**
 * Central configuration for the local face-recognition feature.
 *
 * Everything that governs detection, central-person selection, temporary
 * tracking, descriptor enrollment, and local matching is defined here so it can
 * be tuned in one place for the kiosk hardware.
 *
 * PRIVACY: All values here only influence *local, in-browser* processing.
 * No configuration enables any network upload of frames, crops, landmarks or
 * descriptors. Model files are served from our own application domain only.
 */

export const FACE_CONFIG = {
  /**
   * Local model paths (served from our own Vercel app under /public).
   * NEVER point these at a CDN or external domain.
   */
  models: {
    /** Base path relative to the site root. Files live in public/models/human. */
    basePath: "/models/human/",
    detector: "blazeface.json",
    mesh: "facemesh.json",
    description: "faceres.json",
  },

  /** TFJS backend. `webgl` needs no external WASM files. */
  backend: "webgl" as const,

  /** Detection frequency and global detection thresholds. */
  detection: {
    /** Minimum delay between processed frames (ms). ~6-7 fps by default. */
    frequencyMs: 150,
    /** Minimum detector confidence (0..1) for a face to be considered at all. */
    minConfidence: 0.6,
    /** Maximum number of faces to detect per frame. */
    maxDetected: 6,
  },

  /** Per-face quality gates. */
  face: {
    /** Minimum face width as a fraction of the camera-frame width. */
    minSizeRatio: 0.12,
    /**
     * How close (as a fraction of frame size) a face box edge may be to the
     * frame edge before it counts as "significantly cropped".
     */
    edgeMarginRatio: 0.006,
    /**
     * Ignore contact with the TOP frame edge when deciding "cropped". The
     * kiosk camera is mounted above the display, so the top of the head/forehead
     * is often just outside the frame even when the participant is centered.
     */
    ignoreTopEdgeCrop: true,
    /** Minimum mesh/landmark score (0..1) for landmarks to count as visible. */
    minLandmarkVisibility: 0.3,
    /** Minimum descriptor quality (0..1) for a descriptor to be usable. */
    minDescriptorQuality: 0.4,
  },

  /**
   * Central participant area, expressed as normalized horizontal boundaries.
   *
   *   |            selected participant            |
   *  left(0.34)                              right(0.66)
   *
   * Only faces whose center X lies between these boundaries may be considered
   * the active participant. The camera is mounted centrally above the display.
   */
  centralArea: {
    left: 0.34,
    right: 0.66,
    /** Optional vertical gate (top/bottom fractions). Full height by default. */
    top: 0.0,
    bottom: 1.0,
  },

  /** Central-person selection, temporal stability and hysteresis. */
  selection: {
    /**
     * Ambiguity threshold: if the two best central candidates have selection
     * scores closer than this, selection is treated as ambiguous and paused.
     */
    ambiguityThreshold: 0.08,
    /** How long a face must stay selected & valid before it is "stable" (ms). */
    stabilityDurationMs: 1200,
    /**
     * A new candidate must remain clearly preferable for this long before we
     * switch away from the current participant (hysteresis, ms).
     */
    switchDurationMs: 1500,
    /** How much a challenger must beat the incumbent's score to count (0..1). */
    switchScoreMargin: 0.05,
    /** Keep the current participant if their face is briefly lost (ms). */
    lostGraceMs: 700,
    /** EMA smoothing factor (0..1) for bounding-box and center changes. */
    smoothing: 0.4,
  },

  /** Local descriptor enrollment (building a stable participant template). */
  enrollment: {
    /** Face must be stable at least this long before enrollment starts (ms). */
    stableDurationMs: 1500,
    /** Face must be at least this large (fraction of frame width) to enroll. */
    minFaceSizeRatio: 0.16,
    /**
     * Approximate frontal limits (degrees) for enrollment samples. These are
     * generous on PITCH because the kiosk camera is mounted ABOVE the screen and
     * looks down, so a participant looking at the screen naturally shows a
     * downward pitch. Recognition/matching does NOT require frontality — only
     * enrollment does.
     */
    maxYawDeg: 26,
    maxPitchDeg: 34,
    maxRollDeg: 26,
    /** Number of high-quality descriptors aggregated into a template. */
    samplesRequired: 5,
    /** Minimum spacing between collected samples (ms). */
    sampleIntervalMs: 200,
    /** Minimum per-sample descriptor quality (0..1). */
    minSampleQuality: 0.6,
  },

  /** Local participant recognition / matching. */
  recognition: {
    /**
     * Cosine-similarity threshold (0..1). At or above this a template is a
     * candidate match. Weak matches below this are never auto-accepted.
     */
    similarityThreshold: 0.62,
    /**
     * Minimum gap between the best and second-best template similarity for a
     * confident (non-ambiguous) match.
     */
    ambiguousMargin: 0.05,
    /** How often the client asks the server to recognize while unknown (ms). */
    requestIntervalMs: 1500,
  },

  /**
   * Version identifiers sent with every descriptor so the server can store and
   * (later) segregate templates by model/descriptor format.
   */
  version: {
    model: "@vladmandic/human@3.3.6/faceres",
    descriptor: "faceres-v1",
  },

  /**
   * Debug mode. The dev overlay is OFF in production by default.
   * In production it can be force-enabled with localStorage FACE_DEBUG=true.
   */
  debug: {
    /** Default value; the runtime check also honours the localStorage flag. */
    enabledByDefaultInDev: true,
  },
} as const

export type FaceConfig = typeof FACE_CONFIG

/**
 * Whether the development debug overlay should be shown.
 * - Development: on by default (can be turned off with FACE_DEBUG=false).
 * - Production: off by default (can be turned on with FACE_DEBUG=true).
 */
export function isFaceDebugEnabled(): boolean {
  if (typeof window === "undefined") return false

  let flag: string | null = null
  try {
    flag = window.localStorage.getItem("FACE_DEBUG")
  } catch {
    flag = null
  }

  if (flag === "true") return true
  if (flag === "false") return false

  return process.env.NODE_ENV !== "production" && FACE_CONFIG.debug.enabledByDefaultInDev
}
