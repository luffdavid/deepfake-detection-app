'use client'

import { EYE_TRACKING_CONFIG } from '@/lib/eye-tracking/config'
import { useEyeTracking } from '@/components/eye-tracking/eye-tracking-provider'

/**
 * A translucent red circle marking the ~area the tracker thinks you are looking
 * at (gaze is an area of uncertainty, not a precise point). Testing aid only —
 * follows the live gaze during tracking and calibration. Toggle/size via
 * `EYE_TRACKING_CONFIG.testing.showGazeDot` / `.gazeAreaDiameter`.
 */
export function GazeDot() {
  const { latestGaze, status, calibration } = useEyeTracking()

  if (!EYE_TRACKING_CONFIG.testing.showGazeDot) return null
  if (!latestGaze) return null
  if (status !== 'tracking' && !calibration.active) return null

  const size = EYE_TRACKING_CONFIG.testing.gazeAreaDiameter

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500/80 bg-red-500/20 shadow-[0_0_16px_rgba(239,68,68,0.55)]"
      style={{ left: latestGaze.x, top: latestGaze.y, width: size, height: size }}
    >
      {/* small centre marker for reference */}
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
    </div>
  )
}
