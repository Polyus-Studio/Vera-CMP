import { __resetConsentModeState } from '../../src/core/consent-mode'

/** Restore a clean browser-ish environment between tests. */
export function resetEnv(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.__VERA_CMP__
  delete w.gtag
  delete w.fbq
  delete w._fbq
  delete w.clarity
  delete w.hj
  delete w._hjSettings
  w.dataLayer = []

  document.head.innerHTML = ''
  document.body.innerHTML = ''

  __resetConsentModeState()
  ;(globalThis as unknown as { __CC_STATE__?: unknown }).__CC_STATE__ = {
    accepted: [],
  }
}

/** Read the raw dataLayer pushes as plain arrays. */
export function dataLayerEntries(): unknown[][] {
  const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []
  return layer.map((entry) => Array.from(entry as ArrayLike<unknown>))
}
