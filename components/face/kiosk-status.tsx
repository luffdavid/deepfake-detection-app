"use client"

/**
 * Optional non-debug kiosk status (requirement 31).
 *
 * Shows short, human-facing guidance for the participant/operator ("move into
 * the center", "hold still", "participant recognized", ...). It is OFF by
 * default (opt-in via the `show` prop) so it never alters the existing visual
 * design unless the operator enables it.
 */

import { useEffect, useState } from "react"
import type { FacePipelineSnapshot } from "@/lib/face/types"

function messageFor(snapshot: FacePipelineSnapshot): string | null {
  switch (snapshot.state) {
    case "outside_center":
      return "Please move into the center"
    case "ambiguous":
      return "Only one person should stand in the center"
    case "stabilizing":
    case "enrolling":
      return "Hold still…"
    case "unknown":
      return "Please look at the camera and move a little closer"
    case "recognized":
      return snapshot.recognitionKind === "new" ? "Welcome — new participant" : "Participant recognized"
    case "server_unreachable":
      return "Connection error — please notify the operator"
    default:
      return null
  }
}

export function FaceKioskStatus({
  snapshot,
  show = false,
}: {
  snapshot: FacePipelineSnapshot
  show?: boolean
}) {
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null)

  const message = messageFor(snapshot)

  // Keep "recognized" confirmations briefly, otherwise reflect the live message.
  useEffect(() => {
    setVisibleMessage(message)
    if (snapshot.state === "recognized") {
      const t = setTimeout(() => setVisibleMessage(null), 2500)
      return () => clearTimeout(t)
    }
  }, [message, snapshot.state])

  if (!show || !visibleMessage) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[55] -translate-x-1/2">
      <div className="rounded-full border border-white/15 bg-black/70 px-5 py-2 text-sm font-medium text-white shadow-lg backdrop-blur">
        {visibleMessage}
      </div>
    </div>
  )
}
