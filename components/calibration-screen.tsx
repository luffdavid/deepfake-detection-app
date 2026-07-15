'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TRACK_IDS } from '@/lib/track-ids'
import { useEyeTracking } from '@/components/eye-tracking/eye-tracking-provider'
import { ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface CalibrationScreenProps {
  onContinue: () => void
}

/** True camera/model states in which the camera is confirmed running. */
const CAMERA_READY_STATES = [
  'ready',
  'needs-calibration',
  'calibrating',
  'tracking',
  'calibration-invalid',
] as const

/**
 * Real multi-point (9-point) calibration.
 *
 * Calibration is only allowed once ALL preconditions are met:
 *  - the app is fully loaded
 *  - the browser is in fullscreen / kiosk mode
 *  - the camera is running
 *  - the tracking model is loaded
 *  - a valid, central participant is detected
 */
export function CalibrationScreen({ onContinue }: CalibrationScreenProps) {
  const {
    status,
    selectionStatus,
    gazeEngineReady,
    calibrated,
    calibration,
    beginCalibration,
  } = useEyeTracking()

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement != null)
    update()
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  const cameraReady = (CAMERA_READY_STATES as readonly string[]).includes(status)
  const personDetected = selectionStatus === 'ok'
  const preconditionsMet = cameraReady && gazeEngineReady && personDetected

  // Advance automatically once calibration has completed.
  useEffect(() => {
    if (calibrated && status === 'tracking' && !calibration.active) {
      const timeout = setTimeout(onContinue, 900)
      return () => clearTimeout(timeout)
    }
  }, [calibrated, status, calibration.active, onContinue])

  const handleStart = useCallback(async () => {
    // Enter the final fullscreen / kiosk mode before calibrating.
    try {
      if (document.fullscreenElement == null) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen may be blocked; calibration can still proceed.
    }
    beginCalibration()
  }, [beginCalibration])

  // --- Active calibration: show the moving target ---
  if (calibration.active && calibration.target) {
    const [tx, ty] = calibration.target
    const collecting = personDetected
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        <div
          data-track-id={TRACK_IDS.calibrationTarget}
          className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${tx * 100}%`, top: `${ty * 100}%` }}
        >
          <span className="absolute inset-0 rounded-full border-2 border-accent/50 bg-accent/10" />
          <span
            className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ${
              collecting ? 'animate-ping' : ''
            }`}
          />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 text-center">
          <p className="text-lg text-muted-foreground">
            Point {calibration.pointIndex + 1} of {calibration.totalPoints} — keep looking at the dot
          </p>
          {!collecting && (
            <p className="text-sm text-amber-400">
              Please center your face in view of the camera…
            </p>
          )}
        </div>
      </div>
    )
  }

  // --- Completed ---
  if (calibrated && status === 'tracking') {
    return (
      <CalibrationShell>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="mb-6 h-16 w-16 text-emerald-400" />
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">Calibration complete</h1>
          <p className="text-lg text-muted-foreground">Starting the experience…</p>
        </div>
      </CalibrationShell>
    )
  }

  // --- Preparing / preconditions ---
  return (
    <CalibrationShell>
      <div className="flex max-w-2xl flex-col items-center text-center">
        <h1
          data-track-id={TRACK_IDS.calibrationTitle}
          className="mb-4 text-5xl font-bold tracking-tight md:text-6xl"
        >
          Calibration
        </h1>
        <p
          data-track-id={TRACK_IDS.calibrationInstructions}
          className="mb-10 max-w-xl text-xl leading-relaxed text-muted-foreground"
        >
          We will show a series of dots across the screen. Simply look at each dot until
          it advances. This adapts the eye tracker to you.
        </p>

        <div className="mb-10 w-full max-w-md space-y-3 text-left">
          <PreconditionRow ok label="Application loaded" />
          <PreconditionRow ok={isFullscreen} label="Fullscreen / kiosk mode" pending={!isFullscreen ? 'starts with calibration' : undefined} />
          <PreconditionRow ok={cameraReady} label="Camera running" />
          <PreconditionRow ok={gazeEngineReady} label="Tracking model loaded" />
          <PreconditionRow ok={personDetected} label="Participant detected" />
        </div>

        {!gazeEngineReady && cameraReady && (
          <p className="mb-6 max-w-md text-sm text-amber-400">
            The gaze model could not be loaded. You can continue, but eye-tracking will be
            unavailable.
          </p>
        )}

        <div className="flex flex-col items-center gap-4">
          <Button
            data-track-id={TRACK_IDS.calibrationStartButton}
            onClick={handleStart}
            disabled={!preconditionsMet}
            size="lg"
            className="rounded-3xl px-14 py-9 text-2xl transition-transform duration-300 enabled:hover:scale-105 disabled:opacity-50"
          >
            Start calibration
            <ArrowRight className="ml-4 h-8 w-8" />
          </Button>

          {!gazeEngineReady && (
            <button
              onClick={onContinue}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Continue without eye-tracking
            </button>
          )}
        </div>
      </div>
    </CalibrationShell>
  )
}

function CalibrationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20" />
      <div className="relative z-10 animate-fade-in">{children}</div>
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
          LMU Munich • Usable Security Research
        </p>
      </div>
    </div>
  )
}

function PreconditionRow({
  ok,
  label,
  pending,
}: {
  ok: boolean
  label: string
  pending?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      ) : pending ? (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
      ) : (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
      )}
      <span className={`text-base ${ok ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
        {!ok && pending ? <span className="text-muted-foreground/60"> — {pending}</span> : null}
      </span>
    </div>
  )
}
