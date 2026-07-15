/**
 * One-Euro filter for smoothing the gaze point.
 *
 * Webcam gaze estimation is noisy: the raw point jitters by many pixels even
 * when the eyes are still. A One-Euro filter removes that jitter at low gaze
 * speed while staying responsive during fast eye movements (far better than a
 * plain moving average, which either lags or barely smooths).
 *
 * Reference: Casiez et al., "1€ Filter" (CHI 2012).
 */

class LowPassFilter {
  private hatPrev: number | null = null

  filter(value: number, alpha: number): number {
    const hat = this.hatPrev == null ? value : alpha * value + (1 - alpha) * this.hatPrev
    this.hatPrev = hat
    return hat
  }

  reset(): void {
    this.hatPrev = null
  }
}

export class OneEuroFilter {
  private xFilter = new LowPassFilter()
  private dxFilter = new LowPassFilter()
  private prevValue: number | null = null
  private prevTimeMs: number | null = null

  constructor(
    private minCutoff = 1.0,
    private beta = 0.02,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dtSeconds: number): number {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dtSeconds)
  }

  filter(value: number, timeMs: number): number {
    if (this.prevTimeMs == null) {
      this.prevTimeMs = timeMs
      this.prevValue = value
      return this.xFilter.filter(value, 1)
    }

    let dt = (timeMs - this.prevTimeMs) / 1000
    if (dt <= 0) dt = 1 / 30
    this.prevTimeMs = timeMs

    const dValue = (value - (this.prevValue ?? value)) / dt
    this.prevValue = value

    const edValue = this.dxFilter.filter(dValue, this.alpha(this.dCutoff, dt))
    const cutoff = this.minCutoff + this.beta * Math.abs(edValue)
    return this.xFilter.filter(value, this.alpha(cutoff, dt))
  }

  reset(): void {
    this.xFilter.reset()
    this.dxFilter.reset()
    this.prevValue = null
    this.prevTimeMs = null
  }
}

/** Smooths a 2D gaze point (x and y filtered independently, shared timestamps). */
export class Gaze2DFilter {
  private fx: OneEuroFilter
  private fy: OneEuroFilter

  constructor(minCutoff = 1.0, beta = 0.02, dCutoff = 1.0) {
    this.fx = new OneEuroFilter(minCutoff, beta, dCutoff)
    this.fy = new OneEuroFilter(minCutoff, beta, dCutoff)
  }

  filter(x: number, y: number, timeMs: number): { x: number; y: number } {
    return { x: this.fx.filter(x, timeMs), y: this.fy.filter(y, timeMs) }
  }

  reset(): void {
    this.fx.reset()
    this.fy.reset()
  }
}
