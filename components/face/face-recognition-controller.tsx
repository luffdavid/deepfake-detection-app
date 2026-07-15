"use client"

/**
 * Face-recognition controller.
 *
 * Self-contained mount point that runs the local face-recognition pipeline and
 * renders only the (hidden) debug overlay and the (opt-in) kiosk status. It keeps
 * the frame-rate work isolated from the main experience — the rest of the app
 * reads the current participant via the participant-session store instead.
 *
 * The debug overlay is hidden by default and revealed by DOUBLE-CLICKING an
 * invisible hotspot on the middle-left edge of the screen (kiosk-friendly), so
 * nothing user-visible appears during normal use.
 */

import { useState } from "react"
import { useFaceRecognition } from "@/hooks/use-face-recognition"
import { FaceDebugOverlay } from "@/components/face/debug-overlay"
import { FaceKioskStatus } from "@/components/face/kiosk-status"

export function FaceRecognitionController({
  enabled,
  showKioskStatus = false,
}: {
  /** Start the camera + pipeline (should be tied to a user gesture / flow). */
  enabled: boolean
  /** Show the human-facing kiosk guidance overlay (off by default). */
  showKioskStatus?: boolean
}) {
  const { snapshot, reset } = useFaceRecognition({ enabled })
  // Closed by default; double-click the invisible top-left hotspot to open.
  const [debugVisible, setDebugVisible] = useState(false)

  return (
    <>
      {/* Invisible hotspot in the TOP-LEFT corner. Double-click to toggle the
          debug overlay. Transparent + aria-hidden so it never affects the UI. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        title=""
        onDoubleClick={() => setDebugVisible((v) => !v)}
        className="fixed left-0 top-0 z-[70] h-16 w-16 cursor-default bg-transparent opacity-0"
      />

      {debugVisible && <FaceDebugOverlay snapshot={snapshot} onReset={reset} />}
      <FaceKioskStatus snapshot={snapshot} show={showKioskStatus} />
    </>
  )
}

