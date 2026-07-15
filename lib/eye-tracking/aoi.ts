/**
 * AOI (Area Of Interest) resolution.
 *
 * Maps a gaze point (in CSS window pixels) to the relevant on-screen element
 * using the existing `data-track-id` markers. Everything is computed from the
 * ACTUAL position/size of elements at measurement time (getBoundingClientRect),
 * so it stays correct under fullscreen, arbitrary resolutions and responsive
 * scaling — no fixed pixel positions are assumed.
 */

import { TRACK_IDS } from '@/lib/track-ids'
import type {
  AoiHit,
  SliderAoiDetails,
  SliderRegion,
  VideoAoiDetails,
  VideoHitRegion,
} from './types'

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

/**
 * Find the most specific (smallest-area) element carrying a `data-track-id`
 * that contains the point. Using rect hit-testing (instead of elementsFromPoint)
 * means non-interactive marker overlays (e.g. slider sub-areas that are
 * pointer-events:none) are still resolved correctly.
 */
export function findAoiElement(
  x: number,
  y: number,
): { element: HTMLElement; rect: DOMRect; targetId: string } | null {
  if (typeof document === 'undefined') return null
  const elements = document.querySelectorAll<HTMLElement>('[data-track-id]')
  let best: { element: HTMLElement; rect: DOMRect; targetId: string } | null = null
  let bestArea = Number.POSITIVE_INFINITY

  elements.forEach((element) => {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    if (!pointInRect(x, y, rect)) return
    const area = rect.width * rect.height
    if (area < bestArea) {
      bestArea = area
      best = { element, rect, targetId: element.dataset.trackId ?? '' }
    }
  })

  return best
}

/** Generic AOI hit (targetId + relative position + inside flag). */
export function resolveElementAoi(x: number, y: number): AoiHit {
  const hit = findAoiElement(x, y)
  if (!hit) {
    return { targetId: null, relativeX: null, relativeY: null, inside: false }
  }
  return {
    targetId: hit.targetId,
    relativeX: (x - hit.rect.left) / hit.rect.width,
    relativeY: (y - hit.rect.top) / hit.rect.height,
    inside: true,
  }
}

/**
 * Compute the rectangle of the ACTUALLY VISIBLE video picture inside a <video>
 * element, honouring `object-fit`. For `contain` this excludes the black
 * letterbox bars; for `cover` the picture overflows the element (cropped).
 */
function computeDisplayedPictureRect(video: HTMLVideoElement, rect: DOMRect) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, fit: 'fill' as const }
  }
  const fit = getComputedStyle(video).objectFit || 'contain'
  const scaleContain = Math.min(rect.width / vw, rect.height / vh)
  const scaleCover = Math.max(rect.width / vw, rect.height / vh)

  let scale: number
  if (fit === 'cover') scale = scaleCover
  else if (fit === 'contain' || fit === 'scale-down') scale = scaleContain
  else if (fit === 'none') scale = 1
  else scale = scaleContain // treat 'fill' picture area as the whole element below

  if (fit === 'fill') {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, fit }
  }

  const width = vw * scale
  const height = vh * scale
  // object-position defaults to center.
  const left = rect.left + (rect.width - width) / 2
  const top = rect.top + (rect.height - height) / 2
  return { left, top, width, height, fit }
}

/**
 * Video AOI details for a gaze point. Returns null if no visible <video> is
 * near the point. `videoId` is supplied by the caller (it knows the current
 * scenario); this function only handles geometry.
 */
export function resolveVideoAoi(x: number, y: number): Omit<VideoAoiDetails, 'videoId'> | null {
  if (typeof document === 'undefined') return null
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'))
  for (const video of videos) {
    const rect = video.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    // Only consider a video the gaze is actually over (element bounds).
    if (!pointInRect(x, y, rect)) continue

    const pic = computeDisplayedPictureRect(video, rect)
    const withinPictureX = x >= pic.left && x <= pic.left + pic.width
    const withinPictureY = y >= pic.top && y <= pic.top + pic.height
    const onPicture = withinPictureX && withinPictureY

    let region: VideoHitRegion
    if (onPicture) region = 'video'
    else region = 'letterbox' // inside the element but on a contain black bar

    const relativeX = pic.width > 0 ? (x - pic.left) / pic.width : null
    const relativeY = pic.height > 0 ? (y - pic.top) / pic.height : null

    return {
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : null,
      relativeX: relativeX === null ? null : Math.min(1, Math.max(0, relativeX)),
      relativeY: relativeY === null ? null : Math.min(1, Math.max(0, relativeY)),
      region,
    }
  }
  return null
}

/**
 * Slider AOI details. Splits the rating slider into logical regions
 * (thumb / left / right / labels) rather than only reporting the raw element.
 */
export function resolveSliderAoi(x: number, y: number): SliderAoiDetails | null {
  if (typeof document === 'undefined') return null

  const container = document.querySelector<HTMLElement>(
    `[data-track-id="${TRACK_IDS.ratingSlider}"]`,
  )
  const labels = document.querySelector<HTMLElement>(
    `[data-track-id="${TRACK_IDS.ratingSliderLabels}"]`,
  )

  const containerRect = container?.getBoundingClientRect() ?? null
  const labelsRect = labels?.getBoundingClientRect() ?? null

  const overContainer = containerRect ? pointInRect(x, y, containerRect) : false
  const overLabels = labelsRect ? pointInRect(x, y, labelsRect) : false
  if (!overContainer && !overLabels) return null

  // Current value: read the Radix thumb's aria-valuenow (0..100).
  const thumbEl =
    container?.querySelector<HTMLElement>('[data-slot="slider-thumb"]') ?? null
  const ariaValue = thumbEl?.getAttribute('aria-valuenow')
  const value = ariaValue != null ? Number(ariaValue) : null

  let region: SliderRegion | null = null
  let relativeX: number | null = null
  let relativeY: number | null = null

  if (overLabels && !overContainer && labelsRect) {
    region = 'labels'
    relativeX = (x - labelsRect.left) / labelsRect.width
    relativeY = (y - labelsRect.top) / labelsRect.height
  } else if (overContainer && containerRect) {
    relativeX = (x - containerRect.left) / containerRect.width
    relativeY = (y - containerRect.top) / containerRect.height

    // Is the gaze on the current handle?
    const thumbRect = thumbEl?.getBoundingClientRect() ?? null
    const thumbPadPx = 12 // small tolerance around the handle
    const onThumb =
      thumbRect != null &&
      x >= thumbRect.left - thumbPadPx &&
      x <= thumbRect.right + thumbPadPx &&
      y >= thumbRect.top - thumbPadPx &&
      y <= thumbRect.bottom + thumbPadPx

    if (onThumb) region = 'thumb'
    else region = relativeX < 0.5 ? 'left' : 'right'
  }

  return {
    sliderId: TRACK_IDS.ratingSlider,
    value,
    relativeX: relativeX === null ? null : Math.min(1, Math.max(0, relativeX)),
    relativeY: relativeY === null ? null : Math.min(1, Math.max(0, relativeY)),
    region,
  }
}

/** Full AOI resolution for a gaze point. */
export function resolveAoi(
  x: number,
  y: number,
  context?: { videoId?: string | null },
): { aoi: AoiHit; video: VideoAoiDetails | null; slider: SliderAoiDetails | null } {
  const aoi = resolveElementAoi(x, y)

  const videoGeom = resolveVideoAoi(x, y)
  const video: VideoAoiDetails | null = videoGeom
    ? { videoId: context?.videoId ?? null, ...videoGeom }
    : null

  const slider = resolveSliderAoi(x, y)

  return { aoi, video, slider }
}
