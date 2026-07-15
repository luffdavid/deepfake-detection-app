'use client'

import { useEffect } from 'react'

/**
 * Publishes the active page identity onto the root <html> element via data-
 * attributes so a future eye-tracking layer can read the current page/AOI
 * context from the DOM. This performs NO tracking and sends NO data — it only
 * exposes metadata locally.
 *
 * @param pageId       Stable page identifier from the central config.
 * @param pageVersion  Version of the page's layout/content.
 * @param phase        Optional sub-phase (e.g. 'video' | 'feedback').
 */
export function usePageTracking(pageId: string, pageVersion: string, phase?: string) {
  useEffect(() => {
    const el = document.documentElement
    el.dataset.trackPageId = pageId
    el.dataset.trackPageVersion = pageVersion
    if (phase) {
      el.dataset.trackPagePhase = phase
    } else {
      delete el.dataset.trackPagePhase
    }

    return () => {
      delete el.dataset.trackPageId
      delete el.dataset.trackPageVersion
      delete el.dataset.trackPagePhase
    }
  }, [pageId, pageVersion, phase])
}
