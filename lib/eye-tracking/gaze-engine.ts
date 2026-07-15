/**
 * Gaze engine adapter around WebEyeTrack (MIT, RedForestAI / Vanderbilt).
 *
 * Responsibilities:
 *  - lazily load the WebEyeTrack main-thread engine (dynamic import keeps it out
 *    of SSR and the initial bundle; we do NOT use WebEyeTrackProxy because its
 *    webpack `worker-loader` is incompatible with Turbopack)
 *  - inject a SELF-HOSTED MediaPipe FaceLandmarker so no CDN assets are used
 *    (WebEyeTrack hardcodes CDN URLs in its own FaceLandmarkerClient)
 *  - expose a small, stable interface (`load` / `step` / `calibrate`) so the
 *    rest of the system does not depend on WebEyeTrack internals and keeps
 *    working even if the engine fails to load.
 *
 * WebEyeTrack loads its BlazeGaze gaze model itself from `${origin}/web/model.json`
 * (also self-hosted). No webcam frames leave the browser.
 */

import type { GazeResult } from 'webeyetrack'
import { LocalFaceLandmarkerClient } from './local-face-landmarker'

/** One calibration observation: model inputs + the on-screen target. */
export interface CalibrationSample {
  eyePatch: ImageData
  headVector: number[]
  faceOrigin3D: number[]
  /** Target position in WebEyeTrack space: [-0.5..0.5], origin = screen center. */
  targetNorm: [number, number]
}

/** Result of one gaze step. */
export interface GazeStepResult {
  /** Normalized point-of-gaze in [-0.5..0.5], origin = screen center. */
  normX: number
  normY: number
  eyesOpen: boolean
  /** Model inputs, reused for calibration collection. */
  eyePatch: ImageData
  headVector: number[]
  faceOrigin3D: number[]
}

export class GazeEngine {
  private engine: unknown = null
  private loadPromise: Promise<void> | null = null

  ready = false
  error: string | null = null

  async load(): Promise<void> {
    if (this.ready) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = (async () => {
      try {
        // Dynamic import: WebEyeTrack references browser globals (`self`).
        const mod: any = await import('webeyetrack')
        const WebEyeTrack = mod.WebEyeTrack ?? mod.default?.WebEyeTrack
        if (!WebEyeTrack) throw new Error('WebEyeTrack export not found')

        // maxPoints large enough to retain all 9-point calibration samples.
        const engine = new WebEyeTrack(200, 60)

        // Inject the self-hosted FaceLandmarker BEFORE initialize() so the
        // library never touches its hardcoded CDN URLs.
        ;(engine as { faceLandmarkerClient: LocalFaceLandmarkerClient }).faceLandmarkerClient =
          new LocalFaceLandmarkerClient()

        await engine.initialize()
        this.engine = engine
        this.ready = true
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.ready = false
        throw err
      }
    })()

    return this.loadPromise
  }

  /** Run one gaze estimation step on a captured frame. */
  async step(frame: ImageData, timestamp: number): Promise<GazeStepResult | null> {
    if (!this.ready || !this.engine) return null
    const result = (await (this.engine as { step: (f: ImageData, t: number) => Promise<GazeResult> }).step(
      frame,
      timestamp,
    )) as GazeResult
    if (!result || !result.facialLandmarks || result.facialLandmarks.length === 0) {
      return null
    }
    return {
      normX: result.normPog?.[0] ?? 0,
      normY: result.normPog?.[1] ?? 0,
      eyesOpen: result.gazeState === 'open',
      eyePatch: result.eyePatch,
      headVector: result.headVector,
      faceOrigin3D: result.faceOrigin3D,
    }
  }

  /** Personalize the model to the current participant (few-shot calibration). */
  calibrate(samples: CalibrationSample[]): void {
    if (!this.ready || !this.engine || samples.length === 0) return
    const eyePatches = samples.map((s) => s.eyePatch)
    const headVectors = samples.map((s) => s.headVector)
    const faceOrigins3D = samples.map((s) => s.faceOrigin3D)
    const normPogs = samples.map((s) => s.targetNorm as number[])
    ;(this.engine as {
      adapt: (
        e: ImageData[],
        h: number[][],
        f: number[][],
        n: number[][],
      ) => void
    }).adapt(eyePatches, headVectors, faceOrigins3D, normPogs)
  }
}
