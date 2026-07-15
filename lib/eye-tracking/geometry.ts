/**
 * Geometry fingerprinting + calibration persistence.
 *
 * The calibration is only valid for the geometric conditions under which it was
 * captured. When the viewport size, display orientation, fullscreen state,
 * camera framing or the participant's head distance/position change materially,
 * the calibration must be invalidated and re-run.
 *
 * Calibration is stored ONLY locally (localStorage). No calibration data leaves
 * the device.
 */

import { EYE_TRACKING_CONFIG } from './config'
import type { CalibrationRecord, GeometryFingerprint } from './types'

const CFG = EYE_TRACKING_CONFIG.geometry

export function captureGeometry(
  face?: { width: number; centerX: number; centerY: number } | null,
): GeometryFingerprint {
  const orientation =
    (typeof screen !== 'undefined' && screen.orientation?.type) || 'unknown'
  const fullscreen =
    typeof document !== 'undefined' && document.fullscreenElement != null
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: typeof screen !== 'undefined' ? screen.width : window.innerWidth,
    screenHeight: typeof screen !== 'undefined' ? screen.height : window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation,
    fullscreen,
    faceWidth: face?.width ?? null,
    faceCenterX: face?.centerX ?? null,
    faceCenterY: face?.centerY ?? null,
  }
}

function relativeChange(a: number, b: number): number {
  const base = Math.max(1, Math.abs(a))
  return Math.abs(a - b) / base
}

/**
 * Returns true when `current` differs materially from `baseline` so the
 * calibration should be considered invalid.
 */
export function geometryChanged(
  baseline: GeometryFingerprint,
  current: GeometryFingerprint,
): boolean {
  if (relativeChange(baseline.viewportWidth, current.viewportWidth) > CFG.viewportChangeFraction) {
    return true
  }
  if (relativeChange(baseline.viewportHeight, current.viewportHeight) > CFG.viewportChangeFraction) {
    return true
  }
  if (baseline.orientation !== current.orientation) return true
  if (baseline.fullscreen !== current.fullscreen) return true
  if (baseline.devicePixelRatio !== current.devicePixelRatio) return true

  if (baseline.faceWidth != null && current.faceWidth != null) {
    if (relativeChange(baseline.faceWidth, current.faceWidth) > CFG.faceSizeChangeFraction) {
      return true
    }
  }
  if (
    baseline.faceCenterX != null &&
    baseline.faceCenterY != null &&
    current.faceCenterX != null &&
    current.faceCenterY != null
  ) {
    const dist = Math.hypot(
      baseline.faceCenterX - current.faceCenterX,
      baseline.faceCenterY - current.faceCenterY,
    )
    if (dist > CFG.faceCenterChange) return true
  }
  return false
}

export function saveCalibration(record: CalibrationRecord): void {
  try {
    window.localStorage.setItem(
      EYE_TRACKING_CONFIG.calibration.storageKey,
      JSON.stringify(record),
    )
  } catch {
    // Ignore storage failures — calibration then simply won't persist.
  }
}

export function loadCalibration(): CalibrationRecord | null {
  try {
    const raw = window.localStorage.getItem(EYE_TRACKING_CONFIG.calibration.storageKey)
    return raw ? (JSON.parse(raw) as CalibrationRecord) : null
  } catch {
    return null
  }
}

export function clearCalibration(): void {
  try {
    window.localStorage.removeItem(EYE_TRACKING_CONFIG.calibration.storageKey)
  } catch {
    // Ignore.
  }
}
