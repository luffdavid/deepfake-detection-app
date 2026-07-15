"use client"

/**
 * Development-only debug overlay (requirements 29 & 30).
 *
 * Shows the camera preview, all detected face boxes, the central-area boundary
 * lines, the selected face, selection score, detection confidence, selected-face
 * stability duration, recognition state, best matching participant id, similarity
 * score and whether descriptor enrollment is currently allowed.
 *
 * Disabled by default in production (see isFaceDebugEnabled()).
 */

import { useEffect, useRef } from "react"
import { FACE_CONFIG } from "@/lib/face/config"
import { getExistingStream } from "@/lib/face/camera-manager"
import type { FacePipelineSnapshot } from "@/lib/face/types"

const PREVIEW_WIDTH = 320

export function FaceDebugOverlay({
  snapshot,
  onReset,
}: {
  snapshot: FacePipelineSnapshot
  onReset?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Attach the shared camera stream to the preview element.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const stream = getExistingStream()
    if (stream && video.srcObject !== stream) {
      video.srcObject = stream
      void video.play().catch(() => {})
    }
  }, [snapshot.frame.width, snapshot.frame.height])

  // Draw boxes + boundaries each snapshot update.
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const w = video.clientWidth || PREVIEW_WIDTH
    const aspect = snapshot.frame.height > 0 ? snapshot.frame.height / snapshot.frame.width : 0.75
    const h = w * aspect
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)

    // Central-area vertical boundaries.
    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)"
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    for (const bx of [FACE_CONFIG.centralArea.left, FACE_CONFIG.centralArea.right]) {
      ctx.beginPath()
      ctx.moveTo(bx * w, 0)
      ctx.lineTo(bx * w, h)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // All detected faces.
    for (const f of snapshot.faces) {
      ctx.strokeStyle = f.isValid ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.8)"
      ctx.lineWidth = 2
      ctx.strokeRect(f.boxRaw.x * w, f.boxRaw.y * h, f.boxRaw.width * w, f.boxRaw.height * h)
    }

    // Selected face highlighted.
    if (snapshot.selected) {
      const b = snapshot.selected.face.boxRaw
      ctx.strokeStyle = "rgba(250,204,21,1)"
      ctx.lineWidth = 3
      ctx.strokeRect(b.x * w, b.y * h, b.width * w, b.height * h)
    }
  }, [snapshot])

  const sel = snapshot.selected
  const match = snapshot.match

  // When no face is selected but faces are present, explain why the most
  // central detected face was rejected (answers "faces: 1 but no_face").
  const nearest = (() => {
    if (snapshot.faces.length === 0) return null
    let best = snapshot.faces[0]
    for (const f of snapshot.faces) {
      if (f.distanceFromCenter < best.distanceFromCenter) best = f
    }
    return best
  })()
  const nearestInvalid = !snapshot.selected && nearest ? nearest.invalidReasons.join(", ") : ""
  // Metrics of the selected face, or fall back to the most central detected one.
  const f = sel?.face ?? nearest

  return (
    <div className="fixed left-2 top-2 z-[60] w-[320px] rounded-lg border border-cyan-500/40 bg-black/85 p-2 font-mono text-[11px] leading-tight text-cyan-100 shadow-xl backdrop-blur">
      <div className="relative mb-2 overflow-hidden rounded">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} muted playsInline className="block w-full" />
        <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0" />
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <dt className="text-cyan-400">state</dt>
        <dd className="text-right font-semibold text-white">{snapshot.state}</dd>

        <dt className="text-cyan-400">faces</dt>
        <dd className="text-right">{snapshot.faces.length}</dd>

        <dt className="text-cyan-400">pause</dt>
        <dd className="text-right">{snapshot.pauseReason ?? "—"}</dd>

        <dt className="text-cyan-400">why invalid</dt>
        <dd className="truncate text-right" title={nearestInvalid}>
          {nearestInvalid || "—"}
        </dd>

        <dt className="text-cyan-400">sel score</dt>
        <dd className="text-right">{sel ? sel.score.toFixed(3) : "—"}</dd>

        <dt className="text-cyan-400">confidence</dt>
        <dd className="text-right">{f ? f.confidence.toFixed(3) : "—"}</dd>

        <dt className="text-cyan-400">mesh</dt>
        <dd className="text-right">{f ? f.faceScore.toFixed(3) : "—"}</dd>

        <dt className="text-cyan-400">size</dt>
        <dd className="text-right">{f ? f.sizeRatio.toFixed(3) : "—"}</dd>

        <dt className="text-cyan-400">desc q</dt>
        <dd className="text-right">{f ? f.descriptorQuality.toFixed(3) : "—"}</dd>

        <dt className="text-cyan-400">in center</dt>
        <dd className="text-right">{f ? (f.isInCentralArea ? "yes" : "no") : "—"}</dd>

        <dt className="text-cyan-400">stability</dt>
        <dd className="text-right">{Math.round(snapshot.stabilityMs)} ms</dd>

        <dt className="text-cyan-400">recognition</dt>
        <dd className="text-right">{match ? match.outcome : "—"}</dd>

        <dt className="text-cyan-400">best match</dt>
        <dd className="truncate text-right" title={match?.participantId ?? snapshot.participantId ?? ""}>
          {(match?.participantId ?? snapshot.participantId ?? "—").slice(0, 8)}
        </dd>

        <dt className="text-cyan-400">similarity</dt>
        <dd className="text-right">{match ? match.similarity.toFixed(3) : "—"}</dd>

        <dt className="text-cyan-400">enroll ok</dt>
        <dd className="text-right">
          {snapshot.enrollmentAllowed ? "yes" : "no"} ({Math.round(snapshot.enrollmentProgress * 100)}%)
        </dd>

        <dt className="text-cyan-400">track id</dt>
        <dd className="truncate text-right" title={snapshot.trackId ?? ""}>
          {snapshot.trackId ? snapshot.trackId.slice(4, 12) : "—"}
        </dd>
      </dl>
      {snapshot.error && <p className="mt-1 text-red-400">{snapshot.error}</p>}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 w-full rounded border border-red-500/50 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/20"
        >
          Clear in-memory state
        </button>
      )}
    </div>
  )
}
