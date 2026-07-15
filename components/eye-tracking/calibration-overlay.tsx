'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TRACK_IDS } from '@/lib/track-ids'
import { useEyeTracking } from '@/components/eye-tracking/eye-tracking-provider'
import {
  Camera,
  CheckCircle2,
  Download,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react'

/** Camera/model states in which the camera is confirmed running. */
const CAMERA_READY_STATES = [
  'ready',
  'needs-calibration',
  'calibrating',
  'tracking',
  'calibration-invalid',
]

/**
 * Hidden, STAFF-ONLY calibration control. It is not part of the participant
 * flow: a researcher opens it once with the "x" key, runs a single 9-point
 * calibration, then returns to the start screen for the participant. It never
 * changes the participant-facing UI.
 */
export function CalibrationOverlay() {
  const {
    status,
    selectionStatus,
    gazeEngineReady,
    calibrated,
    calibration,
    calibrationPanelOpen,
    requestCamera,
    beginCalibration,
    cancelCalibration,
    closeCalibrationPanel,
    getGazeReport,
    downloadGazeData,
  } = useEyeTracking()
  const router = useRouter()

  const cameraReady = CAMERA_READY_STATES.includes(status)
  const personDetected = selectionStatus === 'ok'
  const canStart = cameraReady && gazeEngineReady && personDetected

  const backToStart = useCallback(() => {
    closeCalibrationPanel()
    router.push('/')
  }, [closeCalibrationPanel, router])

  const startCalibration = useCallback(async () => {
    // Calibrate in the final fullscreen geometry so the calibrated coordinate
    // space matches what the participant will actually look at.
    try {
      if (document.fullscreenElement == null) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked; calibration can still proceed.
    }
    beginCalibration()
  }, [beginCalibration])

  // --- Active calibration: full-screen moving target ---
  if (calibration.active && calibration.target) {
    const [tx, ty] = calibration.target
    return (
      <div className="fixed inset-0 z-[75] bg-background">
        <div
          data-track-id={TRACK_IDS.calibrationTarget}
          className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${tx * 100}%`, top: `${ty * 100}%` }}
        >
          <span className="absolute inset-0 rounded-full border-2 border-accent/50 bg-accent/10" />
          <span
            className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ${
              personDetected ? 'animate-ping' : ''
            }`}
          />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </div>

        <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            [staff] Calibration point {calibration.pointIndex + 1} / {calibration.totalPoints}
          </p>
          {!personDetected && (
            <p className="text-xs text-amber-400">Center a single face in the camera…</p>
          )}
          <button
            onClick={cancelCalibration}
            className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!calibrationPanelOpen) return null

  // --- Staff side panel ---
  return (
    <div className="fixed right-0 top-0 z-[75] flex h-full w-[360px] max-w-[92vw] flex-col border-l border-border/60 bg-card/95 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Eye-tracking · staff</h2>
        </div>
        <button
          onClick={closeCalibrationPanel}
          aria-label="Close"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        One-time calibration for this display. Hidden from participants. Press{' '}
        <kbd className="rounded bg-secondary px-1.5 py-0.5 text-xs">X</kbd> or{' '}
        <kbd className="rounded bg-secondary px-1.5 py-0.5 text-xs">Esc</kbd> to close.
      </p>

      <div className="mb-5 space-y-2">
        <PreconditionRow ok={cameraReady} label="Camera running" />
        <PreconditionRow ok={gazeEngineReady} label="Tracking model loaded" />
        <PreconditionRow ok={personDetected} label="Participant detected" />
        <PreconditionRow ok={calibrated} label="Calibrated" />
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          All processing is local. No webcam images leave this device.
        </p>
      </div>

      {(() => {
        const report = getGazeReport()
        const seconds = Math.round(report.sessionDurationMs / 1000)
        const top = report.aois.slice(0, 4)
        return (
          <div className="mb-5 rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gaze data
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {seconds}s · {report.sampleCount} pts
              </span>
            </div>
            {top.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">No look data yet.</p>
            ) : (
              <ul className="space-y-1">
                {top.map((a) => (
                  <li
                    key={`${a.route}-${a.targetId}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate text-foreground/80">{a.targetId}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {(a.totalMs / 1000).toFixed(1)}s · {a.visits}x
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button
              onClick={downloadGazeData}
              variant="outline"
              size="sm"
              className="mt-3 w-full"
            >
              <Download className="mr-2 h-4 w-4" /> Download gaze data (JSON)
            </Button>
          </div>
        )
      })()}

      <div className="mt-auto space-y-3">
        {!cameraReady && (
          <Button onClick={() => void requestCamera()} size="lg" className="w-full">
            <Camera className="mr-2 h-5 w-5" />
            Enable camera
          </Button>
        )}

        {cameraReady && !calibrated && (
          <Button
            onClick={startCalibration}
            disabled={!canStart}
            size="lg"
            className="w-full disabled:opacity-50"
          >
            Start calibration
          </Button>
        )}

        {cameraReady && calibrated && (
          <>
            <Button onClick={backToStart} size="lg" className="w-full">
              Back to start screen
            </Button>
            <button
              onClick={startCalibration}
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Re-run calibration
            </button>
          </>
        )}

        {cameraReady && !gazeEngineReady && (
          <p className="text-xs text-amber-400">
            Gaze model unavailable — calibration cannot run.
          </p>
        )}
      </div>
    </div>
  )
}

function PreconditionRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground/70" />
      )}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
