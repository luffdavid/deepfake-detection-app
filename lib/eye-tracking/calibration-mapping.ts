/**
 * Polynomial gaze calibration.
 *
 * WebEyeTrack's built-in personalization applies a single LINEAR (affine)
 * correction to the whole screen. That cannot fit an asymmetric error (e.g. the
 * left half tracking well while the right half is off), which is common because
 * of camera offset and perspective.
 *
 * Instead we fit our OWN 2nd-order polynomial that maps the model's raw gaze
 * output to the true on-screen target, using the samples collected at the 9
 * calibration points. A quadratic surface can bend to match both sides and mild
 * nonlinearities, which a straight affine cannot. Falls back to a 1st-order fit
 * if the data is degenerate.
 *
 * All maths is a small local least-squares solve — no dependencies, no network.
 */

export interface CalibrationPair {
  /** Raw model gaze in WebEyeTrack space [-0.5..0.5] (origin = screen centre). */
  predX: number
  predY: number
  /** True target in normalized viewport space [0..1]. */
  targetX: number
  targetY: number
}

export interface CalibrationMapping {
  ax: number[]
  ay: number[]
  order: 1 | 2
}

function features2(px: number, py: number): number[] {
  return [1, px, py, px * px, py * py, px * py]
}

function features1(px: number, py: number): number[] {
  return [1, px, py]
}

/** Solve M·x = b (n×n) via Gaussian elimination with partial pivoting. */
function solveLinearSystem(M: number[][], b: number[]): number[] | null {
  const n = b.length
  const a = M.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    }
    if (Math.abs(a[pivot][col]) < 1e-9) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    const diag = a[col][col]
    for (let j = col; j <= n; j++) a[col][j] /= diag
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = a[r][col]
      for (let j = col; j <= n; j++) a[r][j] -= factor * a[col][j]
    }
  }
  return a.map((row) => row[n])
}

function fitOrder(
  pairs: CalibrationPair[],
  feat: (px: number, py: number) => number[],
  dim: number,
): { ax: number[]; ay: number[] } | null {
  const M = Array.from({ length: dim }, () => new Array(dim).fill(0))
  const bx = new Array(dim).fill(0)
  const by = new Array(dim).fill(0)
  for (const p of pairs) {
    const f = feat(p.predX, p.predY)
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) M[i][j] += f[i] * f[j]
      bx[i] += f[i] * p.targetX
      by[i] += f[i] * p.targetY
    }
  }
  const ax = solveLinearSystem(M, bx)
  if (!ax) return null
  const ay = solveLinearSystem(M, by)
  if (!ay) return null
  return { ax, ay }
}

/** Fit the best available polynomial mapping from the calibration pairs. */
export function fitCalibration(pairs: CalibrationPair[]): CalibrationMapping | null {
  if (pairs.length >= 6) {
    const fit = fitOrder(pairs, features2, 6)
    if (fit) return { ...fit, order: 2 }
  }
  if (pairs.length >= 3) {
    const fit = fitOrder(pairs, features1, 3)
    if (fit) return { ...fit, order: 1 }
  }
  return null
}

/** Apply the mapping to a raw model gaze point → normalized viewport [0..1]. */
export function applyCalibration(
  mapping: CalibrationMapping,
  predX: number,
  predY: number,
): { x: number; y: number } {
  const f = mapping.order === 2 ? features2(predX, predY) : features1(predX, predY)
  const dot = (coeffs: number[]) => coeffs.reduce((sum, c, i) => sum + c * f[i], 0)
  return { x: dot(mapping.ax), y: dot(mapping.ay) }
}
