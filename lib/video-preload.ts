const VIDEO_PRELOAD_SESSION_KEY = 'trustcheck_videos_preloaded'

let preloadDone = false
let preloadPromise: Promise<boolean> | null = null

function markDone() {
  preloadDone = true
  try {
    window.sessionStorage.setItem(VIDEO_PRELOAD_SESSION_KEY, '1')
  } catch {
    // Ignore storage failures.
  }
}

export function hasPreloadedVideos(): boolean {
  if (preloadDone) return true
  if (typeof window === 'undefined') return false

  try {
    const fromStorage = window.sessionStorage.getItem(VIDEO_PRELOAD_SESSION_KEY) === '1'
    if (fromStorage) {
      preloadDone = true
      return true
    }
  } catch {
    // Ignore storage failures.
  }

  return false
}

function preloadSingleVideo(src: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const preloadVideo = document.createElement('video')
    preloadVideo.muted = true
    preloadVideo.playsInline = true
    preloadVideo.preload = 'auto'

    const cleanup = () => {
      preloadVideo.removeEventListener('loadeddata', onSuccess)
      preloadVideo.removeEventListener('error', onError)
      preloadVideo.removeAttribute('src')
      preloadVideo.load()
    }

    const timeout = window.setTimeout(() => {
      cleanup()
      resolve(false)
    }, 30000)

    const onSuccess = () => {
      clearTimeout(timeout)
      cleanup()
      resolve(true)
    }

    const onError = () => {
      clearTimeout(timeout)
      cleanup()
      resolve(false)
    }

    preloadVideo.addEventListener('loadeddata', onSuccess, { once: true })
    preloadVideo.addEventListener('error', onError, { once: true })
    preloadVideo.src = src
    preloadVideo.load()
  })
}

export async function preloadVideosOnce(
  sources: string[],
  onProgress?: (progressPercent: number) => void,
): Promise<boolean> {
  const uniqueSources = Array.from(new Set(sources.filter(Boolean)))

  if (uniqueSources.length === 0) {
    preloadDone = true
    return true
  }

  if (hasPreloadedVideos()) {
    onProgress?.(100)
    return true
  }

  if (preloadPromise) {
    return preloadPromise
  }

  preloadPromise = (async () => {
    let loadedCount = 0

    const tasks = uniqueSources.map(async (src) => {
      const ok = await preloadSingleVideo(src)
      loadedCount += 1
      onProgress?.((loadedCount / uniqueSources.length) * 100)
      return ok
    })

    const results = await Promise.all(tasks)
    const allSuccessful = results.every(Boolean)

    // Mark as done even if some preloads fail so restart doesn't repeatedly
    // block the intro UI. Playback will still work with on-demand loading.
    markDone()
    onProgress?.(100)

    return allSuccessful
  })()

  try {
    return await preloadPromise
  } finally {
    preloadPromise = null
  }
}
