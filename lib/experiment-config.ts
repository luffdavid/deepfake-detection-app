/**
 * Central experiment configuration — single source of truth for the page and
 * tracking structure. Keeping this in one place (instead of spread across many
 * components) makes it easy to reason about routes, page versions and the
 * tracking areas (AOIs) that exist on each route.
 *
 * This file performs NO tracking and sends NO data. It only describes the
 * structure that a future eye-tracking layer will consume.
 */

import { scenarios, type Scenario } from './scenarios'
import { TRACK_IDS, type TrackId } from './track-ids'

/**
 * Bump this when the layout / content of the pages changes in a way that would
 * invalidate previously recorded AOIs. Recorded gaze data can then be matched to
 * the exact page version it was collected on.
 */
export const PAGE_VERSION = '1.0.0'

export const INTRO_ROUTE = '/'
export const CALIBRATION_ROUTE = '/calibration'
export const EXPERIMENT_BASE_ROUTE = '/experiment'
export const COMPLETE_ROUTE = '/complete'

export type PageKind = 'intro' | 'calibration' | 'experiment' | 'summary'

export interface ExperimentPage {
  /** Stable identifier for the page (used for AOIs / recorded data). */
  pageId: string
  /** Version of this page's layout/content. */
  pageVersion: string
  /** Stable, human-readable URL for the page. */
  route: string
  /** High-level type of the page. */
  kind: PageKind
  /** Associated scenario id (experiment pages only). */
  scenarioId?: string
  /** Associated video id derived from the scenario source (experiment pages only). */
  videoId?: string
  /** Tracking areas (track-ids) expected to exist on this route. */
  trackIds: TrackId[]
  /** Optional next route in the linear experiment flow. */
  nextRoute?: string
}

/**
 * Stable route slug per scenario. Decoupled from the internal scenario id so the
 * URL stays clean and readable (e.g. `/experiment/trading-scam`).
 */
export const SCENARIO_ROUTE_SLUGS: Record<string, string> = {
  'hantavirus-video1': 'hantavirus',
  'trading-video2': 'trading-scam',
  'donationappeal-video3': 'donation-appeal',
  'product-recall-video4': 'product-recall',
  'tagesschau-video5': 'tagesschau',
}

export function getScenarioSlug(scenarioId: string): string {
  return SCENARIO_ROUTE_SLUGS[scenarioId] ?? scenarioId
}

export function getScenarioRoute(scenarioId: string): string {
  return `${EXPERIMENT_BASE_ROUTE}/${getScenarioSlug(scenarioId)}`
}

export function getScenarioBySlug(slug: string): Scenario | undefined {
  const scenarioId =
    Object.keys(SCENARIO_ROUTE_SLUGS).find((id) => SCENARIO_ROUTE_SLUGS[id] === slug) ?? slug
  return scenarios.find((scenario) => scenario.id === scenarioId)
}

/** Derive a stable video id from the scenario video source file name. */
function getVideoId(scenario: Scenario): string | undefined {
  if (!scenario.videoSrc) return undefined
  const fileName = scenario.videoSrc.split('/').pop() ?? scenario.videoSrc
  return fileName.replace(/\.[a-z0-9]+$/i, '')
}

// --- Track-id groups per page kind ---------------------------------------

const INTRO_TRACK_IDS: TrackId[] = [
  TRACK_IDS.introTitle,
  TRACK_IDS.introSubtitle,
  TRACK_IDS.introLoadingBar,
  TRACK_IDS.introStartButton,
  TRACK_IDS.introInfoBadge,
]

const CALIBRATION_TRACK_IDS: TrackId[] = [
  TRACK_IDS.calibrationTitle,
  TRACK_IDS.calibrationInstructions,
  TRACK_IDS.calibrationTarget,
  TRACK_IDS.calibrationStartButton,
]

/**
 * All track-ids that can appear on an experiment route. A single scenario route
 * covers two phases (video + rating, then feedback); both are listed here so the
 * tracking layer knows the full set of AOIs that may become visible.
 */
const EXPERIMENT_TRACK_IDS: TrackId[] = [
  // Video + rating phase
  TRACK_IDS.scenarioHeading,
  TRACK_IDS.scenarioVideo,
  TRACK_IDS.scenarioProfile,
  TRACK_IDS.scenarioFollowButton,
  TRACK_IDS.scenarioLikeButton,
  TRACK_IDS.scenarioCommentButton,
  TRACK_IDS.scenarioSaveButton,
  TRACK_IDS.scenarioShareButton,
  TRACK_IDS.scenarioCaption,
  TRACK_IDS.scenarioSearchBar,
  TRACK_IDS.scenarioHint,
  TRACK_IDS.scenarioCommentInput,
  TRACK_IDS.scenarioReplayButton,
  TRACK_IDS.scenarioProgress,
  TRACK_IDS.ratingSlider,
  TRACK_IDS.ratingSliderThumb,
  TRACK_IDS.ratingSliderTrackLeft,
  TRACK_IDS.ratingSliderTrackRight,
  TRACK_IDS.ratingSliderLabels,
  TRACK_IDS.ratingSubmitButton,
  // Feedback phase
  TRACK_IDS.feedbackResult,
  TRACK_IDS.feedbackWhy,
  TRACK_IDS.feedbackCues,
  TRACK_IDS.feedbackRecommended,
  TRACK_IDS.feedbackChecklistButton,
  TRACK_IDS.feedbackNextButton,
]

const SUMMARY_TRACK_IDS: TrackId[] = [
  TRACK_IDS.summaryScore,
  TRACK_IDS.summaryReviewList,
  TRACK_IDS.summaryChecklistButton,
  TRACK_IDS.summaryRestartButton,
]

// --- Page list -----------------------------------------------------------

const firstScenarioRoute = scenarios[0] ? getScenarioRoute(scenarios[0].id) : COMPLETE_ROUTE

const experimentScenarioPages: ExperimentPage[] = scenarios.map((scenario, index) => {
  const nextScenario = scenarios[index + 1]
  return {
    pageId: `experiment-${getScenarioSlug(scenario.id)}`,
    pageVersion: PAGE_VERSION,
    route: getScenarioRoute(scenario.id),
    kind: 'experiment',
    scenarioId: scenario.id,
    videoId: getVideoId(scenario),
    trackIds: EXPERIMENT_TRACK_IDS,
    nextRoute: nextScenario ? getScenarioRoute(nextScenario.id) : COMPLETE_ROUTE,
  }
})

/**
 * Ordered list of every page in the experiment flow. This is the central
 * configuration referenced in point 3: pageId, pageVersion, route, scenario/
 * video id, expected tracking areas and the optional next route.
 */
export const EXPERIMENT_PAGES: ExperimentPage[] = [
  {
    pageId: 'intro',
    pageVersion: PAGE_VERSION,
    route: INTRO_ROUTE,
    kind: 'intro',
    trackIds: INTRO_TRACK_IDS,
    // Calibration is a hidden staff-only step, so the participant flow goes
    // straight from the intro into the first video.
    nextRoute: firstScenarioRoute,
  },
  ...experimentScenarioPages,
  {
    pageId: 'complete',
    pageVersion: PAGE_VERSION,
    route: COMPLETE_ROUTE,
    kind: 'summary',
    trackIds: SUMMARY_TRACK_IDS,
    nextRoute: INTRO_ROUTE,
  },
]

const EXPERIMENT_PAGES_BY_ROUTE: Record<string, ExperimentPage> = Object.fromEntries(
  EXPERIMENT_PAGES.map((page) => [page.route, page]),
)

const EXPERIMENT_PAGES_BY_ID: Record<string, ExperimentPage> = Object.fromEntries(
  EXPERIMENT_PAGES.map((page) => [page.pageId, page]),
)

export function getPageByRoute(route: string): ExperimentPage | undefined {
  return EXPERIMENT_PAGES_BY_ROUTE[route]
}

export function getPageById(pageId: string): ExperimentPage | undefined {
  return EXPERIMENT_PAGES_BY_ID[pageId]
}

export function getExperimentPageBySlug(slug: string): ExperimentPage | undefined {
  return getPageByRoute(`${EXPERIMENT_BASE_ROUTE}/${slug}`)
}

/** Ordered list of all scenario experiment routes. */
export function getExperimentRoutes(): string[] {
  return experimentScenarioPages.map((page) => page.route)
}

/**
 * Central tracking configuration per route (point 6). For every route it lists
 * which track-id areas exist, so a future eye-tracking layer can automatically
 * derive the Areas of Interest (AOIs) for that route.
 */
export interface RouteTrackingConfig {
  route: string
  pageId: string
  pageVersion: string
  aoiTrackIds: TrackId[]
}

export const TRACKING_CONFIG: Record<string, RouteTrackingConfig> = Object.fromEntries(
  EXPERIMENT_PAGES.map((page) => [
    page.route,
    {
      route: page.route,
      pageId: page.pageId,
      pageVersion: page.pageVersion,
      aoiTrackIds: page.trackIds,
    },
  ]),
)

/** Resolve the AOI track-ids configured for a given route (empty if unknown). */
export function getAoiTrackIds(route: string): TrackId[] {
  return TRACKING_CONFIG[route]?.aoiTrackIds ?? []
}
