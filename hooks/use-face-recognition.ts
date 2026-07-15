"use client"

/**
 * Orchestration hook for the face-recognition pipeline.
 *
 * Detection + descriptor computation run in the browser. Matching, enrollment
 * and storage happen SERVER-SIDE. Nothing participant-related is persisted in
 * the browser: descriptors live only in volatile memory for the moment needed
 * to send them, and are dropped afterwards. There is no offline retry queue —
 * if the server is unreachable the pipeline pauses and reports the error.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { Human } from "@vladmandic/human"
import { FACE_CONFIG } from "@/lib/face/config"
import { getCameraStream, getCameraError } from "@/lib/face/camera-manager"
import { getHuman } from "@/lib/face/human-loader"
import { detectFaces } from "@/lib/face/face-detection"
import { CentralPersonSelector } from "@/lib/face/central-selection"
import { TemporaryTracker } from "@/lib/face/tracking"
import { DescriptorEnroller, enrollmentAllowed } from "@/lib/face/enrollment"
import { enrollDescriptor, recognizeDescriptor } from "@/lib/face/remote"
import { setCurrentParticipant } from "@/lib/face/participant-session"
import type { FacePipelineSnapshot, MatchResult, ParticipantState } from "@/lib/face/types"

const INITIAL_SNAPSHOT: FacePipelineSnapshot = {
  state: "camera_not_ready",
  faces: [],
  selected: null,
  stabilityMs: 0,
  pauseReason: null,
  enrollmentAllowed: false,
  enrollmentProgress: 0,
  match: null,
  recognitionKind: null,
  trackId: null,
  participantId: null,
  frame: { width: 0, height: 0 },
  error: null,
}

export interface UseFaceRecognitionResult {
  snapshot: FacePipelineSnapshot
  /** Reset volatile in-memory pipeline state (no persistent browser data exists). */
  reset: () => void
}

export function useFaceRecognition(options: { enabled: boolean }): UseFaceRecognitionResult {
  const { enabled } = options

  const [snapshot, setSnapshot] = useState<FacePipelineSnapshot>(INITIAL_SNAPSHOT)

  // Long-lived pipeline services (per hook instance).
  const humanRef = useRef<Human | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const selectorRef = useRef(new CentralPersonSelector())
  const trackerRef = useRef(new TemporaryTracker())
  const enrollerRef = useRef(new DescriptorEnroller())

  // Volatile participant state (memory only — never persisted).
  const participantIdRef = useRef<string | null>(null)
  const recognitionKindRef = useRef<"matched" | "new" | null>(null)
  const matchRef = useRef<MatchResult | null>(null)
  const lastRecognitionAtRef = useRef(0)
  const enrollingRef = useRef(false)
  const recognizeInFlightRef = useRef(false)
  const enrollInFlightRef = useRef(false)
  const serverErrorRef = useRef(false)

  const errorRef = useRef<string | null>(null)
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  const clearParticipantState = useCallback(() => {
    participantIdRef.current = null
    recognitionKindRef.current = null
    matchRef.current = null
    enrollerRef.current.reset()
    enrollingRef.current = false
    serverErrorRef.current = false
  }, [])

  const processFrame = useCallback(async () => {
    const human = humanRef.current
    const video = videoRef.current
    if (!human || !video) return

    const fw = video.videoWidth
    const fh = video.videoHeight
    if (video.readyState < 2 || !fw || !fh) return

    const faces = await detectFaces(human, video, fw, fh)
    const now = performance.now()

    const sel = selectorRef.current.update(faces, now)
    const trackId = trackerRef.current.update(sel.selected, sel.stabilityMs)

    const stable = sel.stabilityMs >= FACE_CONFIG.selection.stabilityDurationMs
    const allowEnroll = enrollmentAllowed(sel.selected, sel.stabilityMs, sel.ambiguous, sel.pauseReason)

    let state: ParticipantState

    if (!sel.selected) {
      clearParticipantState()
      if (sel.pauseReason === "outside_center") state = "outside_center"
      else if (sel.pauseReason === "ambiguous" || sel.ambiguous) state = "ambiguous"
      else state = "no_face"
    } else if (sel.pauseReason) {
      state = "tracking_paused"
    } else if (!stable) {
      state = "stabilizing"
    } else {
      const face = sel.selected.face

      // --- Recognition (server-side, throttled, non-overlapping) ---
      if (
        face.descriptor &&
        !participantIdRef.current &&
        !recognizeInFlightRef.current &&
        now - lastRecognitionAtRef.current > FACE_CONFIG.recognition.requestIntervalMs
      ) {
        lastRecognitionAtRef.current = now
        recognizeInFlightRef.current = true
        // Copy the descriptor for transmission; the frame's copy is dropped after.
        const descriptor = face.descriptor.slice()
        recognizeDescriptor(descriptor)
          .then((res) => {
            matchRef.current = res
            serverErrorRef.current = false
            if (res.outcome === "matched" && res.participantId) {
              participantIdRef.current = res.participantId
              recognitionKindRef.current = "matched"
              enrollerRef.current.reset()
              enrollingRef.current = false
            }
          })
          .catch(() => {
            serverErrorRef.current = true
          })
          .finally(() => {
            recognizeInFlightRef.current = false
          })
      }

      // --- Enrollment (only after the server confirmed "unknown") ---
      if (
        !participantIdRef.current &&
        !serverErrorRef.current &&
        matchRef.current?.outcome === "unknown" &&
        allowEnroll &&
        !enrollInFlightRef.current
      ) {
        enrollingRef.current = true
        enrollerRef.current.addSampleIfDue(sel.selected, now)
        if (enrollerRef.current.isComplete()) {
          const agg = enrollerRef.current.aggregate()
          enrollerRef.current.reset()
          if (agg) {
            enrollInFlightRef.current = true
            enrollDescriptor(agg.descriptor, agg.meanDescriptorQuality, agg.meanConfidence)
              .then((res) => {
                participantIdRef.current = res.participantId
                recognitionKindRef.current = "new"
                enrollingRef.current = false
                serverErrorRef.current = false
              })
              .catch(() => {
                serverErrorRef.current = true
                enrollingRef.current = false
              })
              .finally(() => {
                enrollInFlightRef.current = false
              })
          }
        }
      }

      // --- Derive state ---
      if (serverErrorRef.current) state = "server_unreachable"
      else if (participantIdRef.current) state = "recognized"
      else if (matchRef.current?.outcome === "ambiguous") state = "ambiguous"
      else if (enrollingRef.current) state = "enrolling"
      else if (matchRef.current?.outcome === "unknown") state = "unknown"
      else state = "stabilizing"
    }

    const nextSnapshot: FacePipelineSnapshot = {
      state,
      faces,
      selected: sel.selected,
      stabilityMs: sel.stabilityMs,
      pauseReason: sel.pauseReason,
      enrollmentAllowed: allowEnroll,
      enrollmentProgress: enrollerRef.current.progress(),
      match: matchRef.current,
      recognitionKind: recognitionKindRef.current,
      trackId,
      participantId: participantIdRef.current,
      frame: { width: fw, height: fh },
      error: serverErrorRef.current ? "Server unreachable" : errorRef.current,
    }

    setSnapshot(nextSnapshot)
    setCurrentParticipant(participantIdRef.current, state)
  }, [clearParticipantState])

  const runLoop = useCallback(async () => {
    if (cancelledRef.current) return
    const t0 = performance.now()
    try {
      await processFrame()
    } catch {
      /* per-frame errors are non-fatal */
    }
    const elapsed = performance.now() - t0
    const delay = Math.max(0, FACE_CONFIG.detection.frequencyMs - elapsed)
    if (!cancelledRef.current) {
      loopTimerRef.current = setTimeout(runLoop, delay)
    }
  }, [processFrame])

  useEffect(() => {
    if (!enabled) return
    cancelledRef.current = false
    let localVideo: HTMLVideoElement | null = null

    ;(async () => {
      try {
        const [stream, human] = await Promise.all([getCameraStream(), getHuman()])
        if (cancelledRef.current) return

        const video = document.createElement("video")
        video.muted = true
        video.playsInline = true
        video.srcObject = stream
        await video.play().catch(() => {})
        videoRef.current = video
        localVideo = video
        humanRef.current = human
        errorRef.current = null
        runLoop()
      } catch (err) {
        errorRef.current =
          getCameraError() ?? (err instanceof Error ? err.message : "Face pipeline error.")
        setSnapshot((s) => ({ ...s, state: "camera_not_ready", error: errorRef.current }))
        setCurrentParticipant(null, "camera_not_ready")
      }
    })()

    return () => {
      cancelledRef.current = true
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current)
      loopTimerRef.current = null
      if (localVideo) {
        localVideo.pause()
        localVideo.srcObject = null
      }
      videoRef.current = null
      // The shared camera stream is intentionally NOT stopped here so it can be
      // reused; use reset() for a full in-memory teardown.
    }
  }, [enabled, runLoop])

  const reset = useCallback(() => {
    selectorRef.current.reset()
    trackerRef.current.reset()
    clearParticipantState()
    setCurrentParticipant(null, "camera_not_ready")
    setSnapshot({ ...INITIAL_SNAPSHOT })
  }, [clearParticipantState])

  return { snapshot, reset }
}
