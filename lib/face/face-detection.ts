/**
 * Face detection service.
 *
 * Runs a single Human inference on a frame and converts each raw face result
 * into a {@link DetectedFace} enriched with all locally-computed selection
 * metrics (center, distances, size, cropping, landmark visibility, descriptor
 * quality, central-area membership and overall validity).
 */

import type { Human, Input } from "@vladmandic/human"
import { FACE_CONFIG } from "./config"
import type { DetectedFace, HeadRotation } from "./types"

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/** Is the descriptor a usable, finite, non-zero embedding? */
function descriptorNorm(descriptor: number[] | undefined | null): number {
  if (!descriptor || descriptor.length === 0) return 0
  let sum = 0
  for (const v of descriptor) {
    if (!Number.isFinite(v)) return 0
    sum += v * v
  }
  return Math.sqrt(sum)
}

/**
 * "Frontal-ness" score in 0..1 from head rotation. 1 = perfectly frontal.
 * Used both for descriptor-quality estimation and enrollment gating.
 */
export function frontalScore(rotation: HeadRotation | null): number {
  if (!rotation) return 0.5 // unknown -> neutral
  const { yaw, pitch, roll } = rotation
  const yawPart = clamp01(1 - Math.abs(yaw) / 45)
  const pitchPart = clamp01(1 - Math.abs(pitch) / 45)
  const rollPart = clamp01(1 - Math.abs(roll) / 45)
  return clamp01(0.5 * yawPart + 0.3 * pitchPart + 0.2 * rollPart)
}

function computeFaceMetrics(
  // Loosely typed to stay resilient to Human's exact FaceResult shape.
  face: {
    id: number
    boxScore: number
    faceScore: number
    box: [number, number, number, number]
    boxRaw: [number, number, number, number]
    mesh?: unknown[]
    annotations?: Record<string, unknown[]>
    embedding?: number[]
    rotation?: { angle?: { roll: number; yaw: number; pitch: number } } | null
  },
  frameWidth: number,
  frameHeight: number,
): DetectedFace {
  const [bx, by, bw, bh] = face.box
  const [rx, ry, rw, rh] = face.boxRaw

  const center = { x: rx + rw / 2, y: ry + rh / 2 }
  const distanceFromCenterX = Math.abs(center.x - 0.5)
  const distanceFromCenterY = Math.abs(center.y - 0.5)
  const distanceFromCenter = Math.hypot(distanceFromCenterX, distanceFromCenterY)

  // Face size relative to the frame (fraction of frame width).
  const sizeRatio = rw

  const confidence = clamp01(face.boxScore ?? 0)
  const faceScore = clamp01(face.faceScore ?? 0)

  // Cropping: does the box touch/clip a frame edge? The top edge is optionally
  // ignored because an overhead kiosk camera commonly clips the forehead.
  const m = FACE_CONFIG.face.edgeMarginRatio
  const leftCropped = rx <= m
  const rightCropped = rx + rw >= 1 - m
  const bottomCropped = ry + rh >= 1 - m
  const topCropped = ry <= m
  const isCropped =
    leftCropped || rightCropped || bottomCropped || (!FACE_CONFIG.face.ignoreTopEdgeCrop && topCropped)

  // Landmark visibility: a valid mesh with an acceptable mesh score. We do not
  // require specific annotation keys (they vary by Human build). A reported
  // faceScore of 0 is treated as "not provided" and does not disqualify.
  const hasMesh = Array.isArray(face.mesh) && face.mesh.length > 10
  const landmarksVisible =
    hasMesh && (faceScore === 0 || faceScore >= FACE_CONFIG.face.minLandmarkVisibility)

  // Head rotation (Human reports angles in radians).
  const rot = face.rotation?.angle
  const rotation: HeadRotation | null = rot
    ? { roll: radToDeg(rot.roll), yaw: radToDeg(rot.yaw), pitch: radToDeg(rot.pitch) }
    : null

  // Descriptor + quality estimate.
  const descriptor = descriptorNorm(face.embedding) > 0 ? (face.embedding as number[]) : null
  const descriptorQuality = descriptor
    ? clamp01(0.4 * confidence + 0.35 * faceScore + 0.25 * frontalScore(rotation))
    : 0

  // Central-area membership.
  const ca = FACE_CONFIG.centralArea
  const isInCentralArea =
    center.x >= ca.left && center.x <= ca.right && center.y >= ca.top && center.y <= ca.bottom

  // Validity gates.
  const invalidReasons: string[] = []
  if (!isInCentralArea) invalidReasons.push("outside_center")
  if (confidence < FACE_CONFIG.detection.minConfidence) invalidReasons.push("low_confidence")
  if (sizeRatio < FACE_CONFIG.face.minSizeRatio) invalidReasons.push("too_small")
  if (isCropped) invalidReasons.push("cropped")
  if (!landmarksVisible) invalidReasons.push("landmarks_hidden")
  if (descriptorQuality < FACE_CONFIG.face.minDescriptorQuality) invalidReasons.push("low_descriptor_quality")

  return {
    id: face.id,
    box: { x: bx, y: by, width: bw, height: bh },
    boxRaw: { x: rx, y: ry, width: rw, height: rh },
    center,
    distanceFromCenterX,
    distanceFromCenterY,
    distanceFromCenter,
    sizeRatio,
    confidence,
    faceScore,
    isCropped,
    landmarksVisible,
    rotation,
    descriptor,
    descriptorQuality,
    isInCentralArea,
    isValid: invalidReasons.length === 0,
    invalidReasons,
    // Frame dimensions are irrelevant here but callers scale via box vs boxRaw.
  }
}

/** Run one detection pass and return enriched faces. */
export async function detectFaces(
  human: Human,
  input: Input,
  frameWidth: number,
  frameHeight: number,
): Promise<DetectedFace[]> {
  const result = await human.detect(input)
  const faces = (result?.face ?? []) as Parameters<typeof computeFaceMetrics>[0][]
  return faces.map((f) => computeFaceMetrics(f, frameWidth, frameHeight))
}
