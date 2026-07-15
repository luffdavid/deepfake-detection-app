/**
 * Self-hosted MediaPipe FaceDetector wrapper (gatekeeper input).
 *
 * Loads the wasm runtime and the blaze_face model from OUR OWN domain
 * (`/models/mediapipe/...`) — never from a CDN. Detects ALL visible faces on a
 * frame and returns normalized boxes + eye keypoints. It performs NO
 * recognition, embeddings, identity, age, gender or emotion analysis.
 */

import type { FaceDetector, Detection } from '@mediapipe/tasks-vision'
import { EYE_TRACKING_CONFIG } from './config'

export interface RawFace {
  /** Normalized [0..1] box in image coordinates. */
  box: { x: number; y: number; width: number; height: number }
  score: number
  /** Normalized [0..1] keypoints (blaze_face: right eye, left eye, nose, ...). */
  keypoints: { x: number; y: number }[]
}

export class LocalFaceDetector {
  private detector: FaceDetector | null = null

  get ready(): boolean {
    return this.detector !== null
  }

  async initialize(): Promise<void> {
    if (this.detector) return
    // Dynamic import keeps MediaPipe (which touches browser globals) out of SSR.
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(
      EYE_TRACKING_CONFIG.assets.mediapipeWasmPath,
    )
    this.detector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: EYE_TRACKING_CONFIG.assets.faceDetectorModelPath,
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: EYE_TRACKING_CONFIG.selection.minDetectionScore,
    })
  }

  /** Detect all faces on a frame. Coordinates are normalized to [0..1]. */
  detect(frame: ImageData): RawFace[] {
    if (!this.detector) return []
    const width = frame.width
    const height = frame.height
    if (!width || !height) return []

    const result = this.detector.detect(frame)
    return (result.detections ?? []).map((detection: Detection) => {
      const bb = detection.boundingBox
      const box = bb
        ? {
            x: bb.originX / width,
            y: bb.originY / height,
            width: bb.width / width,
            height: bb.height / height,
          }
        : { x: 0, y: 0, width: 0, height: 0 }
      const score = detection.categories?.[0]?.score ?? 0
      const keypoints = (detection.keypoints ?? []).map((kp) => ({ x: kp.x, y: kp.y }))
      return { box, score, keypoints }
    })
  }

  close(): void {
    this.detector?.close()
    this.detector = null
  }
}
