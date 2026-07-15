/**
 * Camera manager.
 *
 * Owns exactly ONE browser camera stream for the whole application. Permission
 * is requested a single time and the same MediaStream is reused everywhere
 * (detection pipeline + debug preview). Audio is never requested.
 *
 * PRIVACY: The stream stays in the browser. Frames are only ever drawn to an
 * offscreen canvas for local inference and are never uploaded.
 */

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error"

let stream: MediaStream | null = null
let acquirePromise: Promise<MediaStream> | null = null
let status: CameraStatus = "idle"
let lastError: string | null = null

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}

function streamIsLive(s: MediaStream | null): s is MediaStream {
  return !!s && s.getVideoTracks().some((t) => t.readyState === "live")
}

/**
 * Acquire (or reuse) the single shared camera stream.
 * Throws a tagged Error whose message reflects the failure category.
 */
export async function getCameraStream(): Promise<MediaStream> {
  if (streamIsLive(stream)) return stream
  if (acquirePromise) return acquirePromise

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    status = "error"
    lastError = "Camera API not available in this browser."
    throw new Error(lastError)
  }

  status = "requesting"
  lastError = null

  acquirePromise = navigator.mediaDevices
    .getUserMedia(CONSTRAINTS)
    .then((s) => {
      stream = s
      status = "ready"
      // If the user stops sharing from the browser UI, reflect that in state.
      s.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (stream === s) {
            stream = null
            status = "idle"
          }
        })
      })
      return s
    })
    .catch((err: unknown) => {
      const name = err instanceof DOMException ? err.name : ""
      if (name === "NotAllowedError" || name === "SecurityError") {
        status = "denied"
        lastError = "Camera permission denied."
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        status = "error"
        lastError = "No suitable camera found."
      } else {
        status = "error"
        lastError = err instanceof Error ? err.message : "Camera error."
      }
      throw new Error(lastError)
    })
    .finally(() => {
      acquirePromise = null
    })

  return acquirePromise
}

/** Return the existing shared stream without requesting permission. */
export function getExistingStream(): MediaStream | null {
  return streamIsLive(stream) ? stream : null
}

export function getCameraStatus(): CameraStatus {
  return status
}

export function getCameraError(): string | null {
  return lastError
}

/** Stop and release the shared camera stream (used by teardown / reset). */
export function stopCameraStream(): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
  }
  stream = null
  status = "idle"
}
