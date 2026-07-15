'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

import { EYE_TRACKING_CONFIG, isDebugEnabled } from '@/lib/eye-tracking/config'
import { LocalFaceDetector } from '@/lib/eye-tracking/face-detector'
import { FaceGatekeeper } from '@/lib/eye-tracking/face-gatekeeper'
import { GazeEngine } from '@/lib/eye-tracking/gaze-engine'
import { GazeBuffer } from '@/lib/eye-tracking/gaze-buffer'
import { Gaze2DFilter } from '@/lib/eye-tracking/filter'
import {
  fitCalibration,
  applyCalibration,
  type CalibrationMapping,
  type CalibrationPair,
} from '@/lib/eye-tracking/calibration-mapping'
import { AoiDwellTracker, type GazeReport } from '@/lib/eye-tracking/dwell'
import { resolveAoi } from '@/lib/eye-tracking/aoi'
import {
  captureGeometry,
  clearCalibration,
  geometryChanged,
  saveCalibration,
} from '@/lib/eye-tracking/geometry'
import type {
  FaceCandidate,
  GazeSample,
  SelectionResult,
  SelectionStatus,
  SystemStatus,
} from '@/lib/eye-tracking/types'
import { PAGE_VERSION, getPageByRoute } from '@/lib/experiment-config'
import { useExperiment } from '@/components/experiment-provider'
import { CalibrationOverlay } from '@/components/eye-tracking/calibration-overlay'
import { GazeDot } from '@/components/eye-tracking/gaze-dot'
import { EyeTrackingDebugOverlay } from '@/components/eye-tracking/eye-tracking-debug-overlay'

const CFG = EYE_TRACKING_CONFIG

/** Routes on which the eye-tracking service is active (never the dashboard). */
const ACTIVE_PREFIXES = ['/calibration', '/experiment', '/complete']
function isActiveRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return ACTIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export interface CalibrationUiState {
  active: boolean
  pointIndex: number
  totalPoints: number
  target: readonly [number, number] | null
  collected: number
  samplesPerPoint: number
}

interface EyeTrackingContextValue {
  status: SystemStatus
  selectionStatus: SelectionStatus
  calibrated: boolean
  needsRecalibration: boolean
  gazeEngineReady: boolean
  debug: boolean
  bufferSize: number
  latestGaze: { x: number; y: number } | null
  candidates: FaceCandidate[]
  calibration: CalibrationUiState
  calibrationPanelOpen: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  requestCamera: () => Promise<void>
  openCalibrationPanel: () => void
  closeCalibrationPanel: () => void
  beginCalibration: () => void
  cancelCalibration: () => void
  recalibrate: () => void
  getGazeReport: () => GazeReport
  downloadGazeData: () => void
}

const EyeTrackingContext = createContext<EyeTrackingContextValue | null>(null)

export function EyeTrackingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const active = isActiveRoute(pathname)
  const { sessionId } = useExperiment()

  // --- React state (UI-facing) ---
  const [status, setStatus] = useState<SystemStatus>('idle')
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus>('no-face')
  const [calibrated, setCalibrated] = useState(false)
  const [needsRecalibration, setNeedsRecalibration] = useState(false)
  const [gazeEngineReady, setGazeEngineReady] = useState(false)
  const [bufferSize, setBufferSize] = useState(0)
  const [latestGaze, setLatestGaze] = useState<{ x: number; y: number } | null>(null)
  const [candidates, setCandidates] = useState<FaceCandidate[]>([])
  const [calibrationPanelOpen, setCalibrationPanelOpen] = useState(false)
  const [calibration, setCalibration] = useState<CalibrationUiState>({
    active: false,
    pointIndex: 0,
    totalPoints: CFG.calibration.points.length,
    target: null,
    collected: 0,
    samplesPerPoint: CFG.calibration.samplesPerPoint,
  })

  const debug = useMemo(() => isDebugEnabled(), [])

  // --- Mutable refs (hot loop state, no re-renders) ---
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<LocalFaceDetector | null>(null)
  const gazeRef = useRef<GazeEngine | null>(null)
  const gatekeeperRef = useRef<FaceGatekeeper | null>(null)
  const bufferRef = useRef<GazeBuffer | null>(null)
  const gazeFilterRef = useRef<Gaze2DFilter | null>(null)
  const dwellRef = useRef<AoiDwellTracker | null>(null)
  const sessionStartedAtRef = useRef<number | null>(null)
  const loopTimerRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const lastSampleAtRef = useRef(0)
  const routeMetaRef = useRef<{ route: string; pageId: string | null; pageVersion: string; videoId: string | null }>({
    route: pathname,
    pageId: null,
    pageVersion: PAGE_VERSION,
    videoId: null,
  })
  const calibratedRef = useRef(false)
  const calibrationMappingRef = useRef<CalibrationMapping | null>(null)
  const geometryBaselineRef = useRef<ReturnType<typeof captureGeometry> | null>(null)
  const driftSinceRef = useRef<number | null>(null)

  // Calibration collection state (refs so the loop can mutate without churn).
  const calibRef = useRef<{
    active: boolean
    pointIndex: number
    perPoint: number
    settleUntil: number
    pairs: CalibrationPair[]
  }>({ active: false, pointIndex: 0, perPoint: 0, settleUntil: 0, pairs: [] })

  // Keep route metadata current for the loop.
  useEffect(() => {
    const page = getPageByRoute(pathname)
    routeMetaRef.current = {
      route: pathname,
      pageId:
        (typeof document !== 'undefined' && document.documentElement.dataset.trackPageId) ||
        page?.pageId ||
        null,
      pageVersion:
        (typeof document !== 'undefined' && document.documentElement.dataset.trackPageVersion) ||
        PAGE_VERSION,
      videoId: page?.videoId ?? null,
    }
  }, [pathname])

  // --- Frame capture ---
  const captureFrame = useCallback((): ImageData | null => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || !video.videoWidth) return null
    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvasRef.current = canvas
    }
    const w = CFG.camera.processingWidth
    const h = CFG.camera.processingHeight
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    try {
      return ctx.getImageData(0, 0, w, h)
    } catch {
      return null
    }
  }, [])

  const buildSample = useCallback(
    (
      windowX: number,
      windowY: number,
      selection: SelectionResult,
    ): GazeSample => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const meta = routeMetaRef.current
      const { aoi, video, slider } = resolveAoi(windowX, windowY, { videoId: meta.videoId })

      return {
        timestamp: Date.now(),
        sessionId,
        pageId: meta.pageId,
        pageVersion: meta.pageVersion,
        route: meta.route,
        windowX,
        windowY,
        normalizedX: windowX / vw,
        normalizedY: windowY / vh,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: vw,
        viewportHeight: vh,
        devicePixelRatio: window.devicePixelRatio || 1,
        quality: selection.selected?.score ?? 0,
        selectionStatus: 'ok',
        trackId: selection.selected?.trackId ?? null,
        aoi,
        video,
        slider,
      }
    },
    [sessionId],
  )

  // --- Geometry drift monitoring ---
  const checkGeometryDrift = useCallback((selected: FaceCandidate | null, now: number) => {
    if (!calibratedRef.current || !geometryBaselineRef.current) return
    const current = captureGeometry(
      selected
        ? { width: selected.relativeWidth, centerX: selected.center.x, centerY: selected.center.y }
        : null,
    )
    if (geometryChanged(geometryBaselineRef.current, current)) {
      if (driftSinceRef.current == null) driftSinceRef.current = now
      else if (now - driftSinceRef.current > CFG.geometry.debounceMs) {
        // Persisted material change -> invalidate calibration.
        calibratedRef.current = false
        setCalibrated(false)
        setNeedsRecalibration(true)
        setStatus('calibration-invalid')
        driftSinceRef.current = null
      }
    } else {
      driftSinceRef.current = null
    }
  }, [])

  const finishCalibration = useCallback(
    (selected: FaceCandidate | null) => {
      // Fit our own 2nd-order polynomial mapping (raw model gaze -> screen). This
      // corrects left/right asymmetry that WebEyeTrack's single affine cannot.
      const mapping = fitCalibration(calibRef.current.pairs)
      if (mapping) {
        calibrationMappingRef.current = mapping
      }
      geometryBaselineRef.current = captureGeometry(
        selected
          ? { width: selected.relativeWidth, centerX: selected.center.x, centerY: selected.center.y }
          : null,
      )
      saveCalibration({
        calibrated: true,
        timestamp: Date.now(),
        geometry: geometryBaselineRef.current,
      })
      calibRef.current = {
        active: false,
        pointIndex: 0,
        perPoint: 0,
        settleUntil: 0,
        pairs: [],
      }
      calibratedRef.current = calibrationMappingRef.current != null
      setCalibrated(calibratedRef.current)
      setNeedsRecalibration(false)
      setCalibration((prev) => ({ ...prev, active: false, target: null, collected: 0 }))
      setStatus(calibratedRef.current ? 'tracking' : 'needs-calibration')
    },
    [],
  )

  // --- Main processing loop ---
  const processFrame = useCallback(async () => {
    const detector = detectorRef.current
    const gatekeeper = gatekeeperRef.current
    const buffer = bufferRef.current
    if (!detector || !gatekeeper || !buffer) return

    const frame = captureFrame()
    if (!frame) return

    const now = performance.now()
    const faces = detector.detect(frame)
    const selection = gatekeeper.update(faces, now)

    setSelectionStatus((prev) => (prev === selection.status ? prev : selection.status))
    if (debug) setCandidates(selection.candidates)

    checkGeometryDrift(selection.selected, now)

    if (selection.status !== 'ok' || !selection.selected) return

    // Only run gaze inference when exactly one valid central participant exists.
    const engine = gazeRef.current
    if (!engine || !engine.ready) return

    // Skip the heavy gaze model unless we are calibrating or actively tracking.
    // This avoids needless GPU work (and memory growth) while idle on the intro.
    if (!calibRef.current.active && !calibratedRef.current) return

    let gaze
    try {
      gaze = await engine.step(frame, now)
    } catch {
      return
    }
    if (!gaze || !gaze.eyesOpen) return

    // Map the raw model gaze to the screen using our polynomial calibration,
    // then smooth (One-Euro) to remove jitter. Working in normalized [0..1]
    // viewport space keeps everything resolution independent.
    if (!gazeFilterRef.current) {
      gazeFilterRef.current = new Gaze2DFilter(
        CFG.smoothing.minCutoff,
        CFG.smoothing.beta,
        CFG.smoothing.dCutoff,
      )
    }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const mapped = calibrationMappingRef.current
      ? applyCalibration(calibrationMappingRef.current, gaze.normX, gaze.normY)
      : { x: gaze.normX + 0.5, y: gaze.normY + 0.5 }
    const smoothed = gazeFilterRef.current.filter(mapped.x, mapped.y, now)
    const dotX = Math.min(vw, Math.max(0, smoothed.x * vw))
    const dotY = Math.min(vh, Math.max(0, smoothed.y * vh))
    setLatestGaze({ x: dotX, y: dotY })

    // Calibration collection mode.
    if (calibRef.current.active) {
      if (now < calibRef.current.settleUntil) return
      const target = CFG.calibration.points[calibRef.current.pointIndex]
      // Store (raw model gaze -> true target) pairs for the polynomial fit.
      calibRef.current.pairs.push({
        predX: gaze.normX,
        predY: gaze.normY,
        targetX: target[0],
        targetY: target[1],
      })
      calibRef.current.perPoint += 1
      setCalibration((prev) => ({ ...prev, collected: calibRef.current.perPoint }))

      if (calibRef.current.perPoint >= CFG.calibration.samplesPerPoint) {
        const nextIndex = calibRef.current.pointIndex + 1
        if (nextIndex >= CFG.calibration.points.length) {
          finishCalibration(selection.selected)
        } else {
          calibRef.current.pointIndex = nextIndex
          calibRef.current.perPoint = 0
          calibRef.current.settleUntil = now + CFG.calibration.settleMs
          setCalibration((prev) => ({
            ...prev,
            pointIndex: nextIndex,
            target: CFG.calibration.points[nextIndex],
            collected: 0,
          }))
        }
      }
      return
    }

    // Tracking mode: emit a bounded-rate sample.
    if (!calibratedRef.current) return
    const periodMs = 1000 / CFG.sampling.targetHz
    if (now - lastSampleAtRef.current < periodMs) return
    lastSampleAtRef.current = now

    const sample = buildSample(dotX, dotY, selection)
    buffer.push(sample)
    setBufferSize(buffer.size)
    dwellRef.current?.record(sample)
  }, [captureFrame, checkGeometryDrift, buildSample, finishCalibration, debug])

  const startLoop = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    const periodMs = 1000 / CFG.sampling.maxLoopHz
    const tick = async () => {
      if (!runningRef.current) return
      const start = performance.now()
      try {
        await processFrame()
      } catch {
        // Never let a single bad frame kill the loop.
      }
      const elapsed = performance.now() - start
      const delay = Math.max(0, periodMs - elapsed)
      loopTimerRef.current = window.setTimeout(tick, delay)
    }
    void tick()
  }, [processFrame])

  const stopLoop = useCallback(() => {
    runningRef.current = false
    if (loopTimerRef.current != null) {
      window.clearTimeout(loopTimerRef.current)
      loopTimerRef.current = null
    }
  }, [])

  // --- Camera + model startup ---
  const startCameraAndModels = useCallback(async () => {
    try {
      setStatus('requesting-permission')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CFG.camera.width },
          height: { ideal: CFG.camera.height },
          facingMode: CFG.camera.facingMode,
        },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }

      setStatus('loading-models')
      if (!detectorRef.current) detectorRef.current = new LocalFaceDetector()
      if (!gatekeeperRef.current) gatekeeperRef.current = new FaceGatekeeper()
      if (!bufferRef.current) bufferRef.current = new GazeBuffer()
      if (!dwellRef.current) dwellRef.current = new AoiDwellTracker(CFG.dwell.maxGapMs)
      if (!gazeRef.current) gazeRef.current = new GazeEngine()

      await detectorRef.current.initialize()
      // Gaze engine is best-effort: the gatekeeper still works without it.
      try {
        await gazeRef.current.load()
        setGazeEngineReady(true)
      } catch {
        setGazeEngineReady(false)
      }

      // NOTE: WebEyeTrack's calibration (the affine correction) lives ONLY in
      // the in-memory engine instance and cannot be restored from storage. It is
      // reused across client-side route changes (this provider/engine persist),
      // but a full page reload requires re-calibration. We therefore never treat
      // a persisted record as "already calibrated" — doing so would emit raw,
      // uncalibrated gaze that is wildly off.
      clearCalibration()
      setStatus('needs-calibration')
      startLoop()
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('permission-denied')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('no-camera')
      } else {
        setStatus('error')
      }
    }
  }, [startLoop])

  const checkCameraAndMaybeStart = useCallback(async () => {
    setStatus('checking-camera')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('no-camera')
      return
    }
    // If the kiosk browser already granted permission permanently, start silently.
    try {
      const perm = await navigator.permissions?.query({
        name: 'camera' as PermissionName,
      })
      if (perm?.state === 'granted') {
        await startCameraAndModels()
        return
      }
      if (perm?.state === 'denied') {
        setStatus('permission-denied')
        return
      }
    } catch {
      // Permissions API not available (e.g. Firefox) — fall through to the gate.
    }
    setStatus('need-permission')
  }, [startCameraAndModels])

  const requestCamera = useCallback(async () => {
    await startCameraAndModels()
  }, [startCameraAndModels])

  // --- Hidden staff calibration panel ---
  const openCalibrationPanel = useCallback(() => setCalibrationPanelOpen(true), [])
  const closeCalibrationPanel = useCallback(() => setCalibrationPanelOpen(false), [])

  // --- Calibration control ---
  const beginCalibration = useCallback(() => {
    calibRef.current = {
      active: true,
      pointIndex: 0,
      perPoint: 0,
      settleUntil: performance.now() + CFG.calibration.settleMs,
      pairs: [],
    }
    setCalibration({
      active: true,
      pointIndex: 0,
      totalPoints: CFG.calibration.points.length,
      target: CFG.calibration.points[0],
      collected: 0,
      samplesPerPoint: CFG.calibration.samplesPerPoint,
    })
    setStatus('calibrating')
  }, [])

  const cancelCalibration = useCallback(() => {
    calibRef.current = { active: false, pointIndex: 0, perPoint: 0, settleUntil: 0, pairs: [] }
    setCalibration((prev) => ({ ...prev, active: false, target: null, collected: 0 }))
    setStatus(calibratedRef.current ? 'tracking' : 'needs-calibration')
  }, [])

  const recalibrate = useCallback(() => {
    calibratedRef.current = false
    clearCalibration()
    setCalibrated(false)
    setNeedsRecalibration(true)
    setStatus('needs-calibration')
  }, [])

  // --- Gaze data (dwell per AOI + session timing) ---
  const getGazeReport = useCallback((): GazeReport => {
    const startedAt = sessionStartedAtRef.current
    return {
      sessionId,
      sessionStartedAt: startedAt,
      sessionDurationMs: startedAt ? Date.now() - startedAt : 0,
      sampleCount: bufferRef.current?.size ?? 0,
      aois: dwellRef.current?.getAll() ?? [],
    }
  }, [sessionId])

  const downloadGazeData = useCallback(() => {
    try {
      const report = getGazeReport()
      const payload = { report, samples: bufferRef.current?.getAll() ?? [] }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gaze-${report.sessionId ?? 'session'}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Ignore download failures.
    }
  }, [getGazeReport])

  // A new experiment session (Start Experience / Start again) resets the gaze
  // data and starts the session timer. Calibration is intentionally NOT reset.
  useEffect(() => {
    if (!sessionId) return
    bufferRef.current?.clear()
    dwellRef.current?.reset()
    gazeFilterRef.current?.reset()
    sessionStartedAtRef.current = Date.now()
    setBufferSize(0)
  }, [sessionId])

  // Persist the live report locally (no network) so it survives navigation and
  // can be inspected/exported. Only the aggregated report is stored, not frames.
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      try {
        const report = getGazeReport()
        if (report.sampleCount > 0) {
          window.sessionStorage.setItem(CFG.dwell.storageKey, JSON.stringify(report))
        }
      } catch {
        // Ignore storage failures.
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [active, getGazeReport])

  // Expose a small testing API on window (local only) for quick inspection.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__eyeTracking = {
      report: () => getGazeReport(),
      samples: () => bufferRef.current?.getAll() ?? [],
      download: downloadGazeData,
    }
    return () => {
      delete w.__eyeTracking
    }
  }, [getGazeReport, downloadGazeData])

  // --- Hidden staff shortcut: press "x" to toggle the calibration panel ---
  // (ignored while typing in an input, so it never clashes with the comment box).
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing =
        !!el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing) return
      if (event.key === 'x' || event.key === 'X') {
        event.preventDefault()
        setCalibrationPanelOpen((open) => !open)
      } else if (event.key === 'Escape') {
        setCalibrationPanelOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  // --- Lifecycle: start on active routes, tear down otherwise ---
  useEffect(() => {
    if (!active) return
    void checkCameraAndMaybeStart()
    return () => {
      stopLoop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Full teardown on unmount.
  useEffect(() => {
    return () => {
      stopLoop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      detectorRef.current?.close()
    }
  }, [stopLoop])

  const value: EyeTrackingContextValue = {
    status,
    selectionStatus,
    calibrated,
    needsRecalibration,
    gazeEngineReady,
    debug,
    bufferSize,
    latestGaze,
    candidates,
    calibration,
    calibrationPanelOpen,
    videoRef,
    requestCamera,
    openCalibrationPanel,
    closeCalibrationPanel,
    beginCalibration,
    cancelCalibration,
    recalibrate,
    getGazeReport,
    downloadGazeData,
  }

  return (
    <EyeTrackingContext.Provider value={value}>
      {children}

      {/* Shared, hidden camera feed processed locally by both components. */}
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        className={
          debug
            ? 'fixed bottom-2 left-2 z-[60] h-40 w-52 -scale-x-100 rounded-lg border border-white/20 opacity-80'
            : 'pointer-events-none fixed h-px w-px opacity-0'
        }
        style={debug ? undefined : { left: -9999, top: -9999 }}
      />

      {/* Red testing dot showing the current gaze position. */}
      <GazeDot />

      {/* Hidden staff-only calibration panel (opened with the "x" key). */}
      {active && <CalibrationOverlay />}

      {debug && <EyeTrackingDebugOverlay />}
    </EyeTrackingContext.Provider>
  )
}

export function useEyeTracking(): EyeTrackingContextValue {
  const ctx = useContext(EyeTrackingContext)
  if (!ctx) {
    throw new Error('useEyeTracking must be used within an EyeTrackingProvider')
  }
  return ctx
}
