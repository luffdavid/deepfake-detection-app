'use client'

import { useEyeTracking } from '@/components/eye-tracking/eye-tracking-provider'
import { resolveElementAoi } from '@/lib/eye-tracking/aoi'

/**
 * Local debug overlay for development. It is only rendered when debug mode is
 * explicitly enabled (`?etdebug=1` or localStorage `ET_DEBUG=true`) and is OFF by
 * default in the production kiosk view. It visualizes local data only; nothing is
 * transmitted.
 */
export function EyeTrackingDebugOverlay() {
  const {
    status,
    selectionStatus,
    gazeEngineReady,
    calibrated,
    needsRecalibration,
    bufferSize,
    latestGaze,
    candidates,
    calibration,
  } = useEyeTracking()

  const targetId = latestGaze ? resolveElementAoi(latestGaze.x, latestGaze.y).targetId : null

  return (
    <div className="pointer-events-none fixed inset-0 z-[65]">
      {/* Current gaze point */}
      {latestGaze && (
        <div
          className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-400/30"
          style={{ left: latestGaze.x, top: latestGaze.y }}
        />
      )}

      {/* HUD */}
      <div className="absolute left-2 top-2 rounded-lg border border-white/15 bg-black/70 px-3 py-2 font-mono text-xs leading-relaxed text-white/90">
        <div>status: {status}</div>
        <div>selection: {selectionStatus}</div>
        <div>gazeEngine: {gazeEngineReady ? 'ready' : 'off'}</div>
        <div>calibrated: {String(calibrated)}{needsRecalibration ? ' (recalibrate)' : ''}</div>
        <div>faces: {candidates.length}</div>
        <div>targetId: {targetId ?? '—'}</div>
        <div>buffer: {bufferSize}</div>
        {calibration.active && (
          <div>
            calib: pt {calibration.pointIndex + 1}/{calibration.totalPoints} · {calibration.collected}/
            {calibration.samplesPerPoint}
          </div>
        )}
      </div>

      {/* Detected face boxes over the (mirrored) camera thumbnail */}
      <div className="absolute bottom-2 left-2 h-40 w-52">
        {candidates.map((face) => {
          const displayLeft = 1 - (face.box.x + face.box.width) // mirror
          const color = face.status === 'ok' ? 'border-emerald-400' : 'border-red-400'
          return (
            <div
              key={face.trackId}
              className={`absolute border ${color}`}
              style={{
                left: `${displayLeft * 100}%`,
                top: `${face.box.y * 100}%`,
                width: `${face.box.width * 100}%`,
                height: `${face.box.height * 100}%`,
              }}
            >
              <span className="absolute -top-4 left-0 whitespace-nowrap bg-black/70 px-1 text-[10px] text-white">
                {face.trackId} · {face.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
