/**
 * Stable technical IDs for tracking-relevant UI areas.
 *
 * These IDs are attached to the DOM via the `data-track-id` attribute and are
 * used later to derive Areas of Interest (AOIs) for eye-tracking. They must stay
 * STABLE over time — renaming a value here is a breaking change for any recorded
 * gaze data. Only relevant, meaningful areas get an ID (not every HTML element).
 *
 * NOTE: This file only defines identifiers. No tracking is performed here and no
 * data is sent anywhere. AOIs are resolved at runtime from element positions, so
 * these IDs never encode fixed pixel coordinates (kiosk / responsive safe).
 */

export const TRACK_IDS = {
  // --- Intro / start page (/) ---
  introTitle: 'intro-title',
  introSubtitle: 'intro-subtitle',
  introLoadingBar: 'intro-loading-bar',
  introStartButton: 'intro-start-button',
  introInfoBadge: 'intro-info-badge',

  // --- Calibration page (/calibration) ---
  calibrationTitle: 'calibration-title',
  calibrationInstructions: 'calibration-instructions',
  calibrationTarget: 'calibration-target',
  calibrationStartButton: 'calibration-start-button',

  // --- Experiment page: video + rating (/experiment/[scenario]) ---
  scenarioHeading: 'scenario-heading',
  scenarioVideo: 'scenario-video',
  scenarioProfile: 'scenario-profile',
  scenarioFollowButton: 'scenario-follow-button',
  scenarioLikeButton: 'scenario-like-button',
  scenarioCommentButton: 'scenario-comment-button',
  scenarioSaveButton: 'scenario-save-button',
  scenarioShareButton: 'scenario-share-button',
  scenarioCaption: 'scenario-caption',
  scenarioSearchBar: 'scenario-search-bar',
  scenarioHint: 'scenario-hint',
  scenarioCommentInput: 'scenario-comment-input',
  scenarioReplayButton: 'scenario-replay-button',
  scenarioProgress: 'scenario-progress',

  // --- Rating slider (composite / logically separated areas) ---
  ratingSlider: 'rating-slider',
  ratingSliderThumb: 'rating-slider-thumb',
  ratingSliderTrackLeft: 'rating-slider-track-left',
  ratingSliderTrackRight: 'rating-slider-track-right',
  ratingSliderLabels: 'rating-slider-labels',
  ratingSubmitButton: 'rating-submit-button',

  // --- Feedback page (shown within /experiment/[scenario]) ---
  feedbackResult: 'feedback-result',
  feedbackWhy: 'feedback-why',
  feedbackCues: 'feedback-cues',
  feedbackRecommended: 'feedback-recommended',
  feedbackChecklistButton: 'feedback-checklist-button',
  feedbackNextButton: 'feedback-next-button',

  // --- Summary / complete page (/complete) ---
  summaryScore: 'summary-score',
  summaryReviewList: 'summary-review-list',
  summaryChecklistButton: 'summary-checklist-button',
  summaryRestartButton: 'summary-restart-button',
} as const

export type TrackId = (typeof TRACK_IDS)[keyof typeof TRACK_IDS]

/**
 * The rating slider is a complex control. Instead of tracking only the raw HTML
 * element, it is split into logically separated areas so that a future AOI
 * definition can distinguish e.g. "user looked at the left (trustworthy) half"
 * from "user looked at the current handle".
 */
export const RATING_SLIDER_AREAS = {
  /** The whole slider region. */
  container: TRACK_IDS.ratingSlider,
  /** The current draggable handle (position follows the value, in %). */
  thumb: TRACK_IDS.ratingSliderThumb,
  /** Left half of the scale ("very trustworthy" side). */
  leftHalf: TRACK_IDS.ratingSliderTrackLeft,
  /** Right half of the scale ("not trustworthy" side). */
  rightHalf: TRACK_IDS.ratingSliderTrackRight,
  /** The textual scale labels below the slider. */
  labels: TRACK_IDS.ratingSliderLabels,
} as const
