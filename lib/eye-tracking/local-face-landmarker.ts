/**
 * Self-hosted MediaPipe FaceLandmarker client used INTERNALLY by WebEyeTrack.
 *
 * This mirrors the interface of WebEyeTrack's own `FaceLandmarkerClient`
 * (`initialize()` + `processFrame()`), but loads the wasm runtime and the
 * FaceLandmarker model from OUR OWN domain instead of the CDN URLs hardcoded in
 * the library. We inject an instance of this class into the WebEyeTrack engine
 * so no MediaPipe assets are ever fetched from an external CDN.
 */

import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { EYE_TRACKING_CONFIG } from './config'

export class LocalFaceLandmarkerClient {
  private faceLandmarker: FaceLandmarker | null = null

  async initialize(): Promise<void> {
    if (this.faceLandmarker) return
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(
      EYE_TRACKING_CONFIG.assets.mediapipeWasmPath,
    )
    this.faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: EYE_TRACKING_CONFIG.assets.faceLandmarkerModelPath,
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: 'IMAGE',
      numFaces: 1,
    })
  }

  async processFrame(frame: ImageData): Promise<FaceLandmarkerResult | null> {
    if (!this.faceLandmarker) return null
    return this.faceLandmarker.detect(frame)
  }

  close(): void {
    this.faceLandmarker?.close()
    this.faceLandmarker = null
  }
}
