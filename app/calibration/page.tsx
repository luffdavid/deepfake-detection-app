import { redirect } from 'next/navigation'

/**
 * Calibration is no longer a participant-facing route. It is a hidden,
 * staff-only overlay panel (see components/eye-tracking/calibration-overlay.tsx)
 * opened with a keyboard shortcut. Any direct visit is sent back to the start.
 */
export default function CalibrationPage() {
  redirect('/')
}
