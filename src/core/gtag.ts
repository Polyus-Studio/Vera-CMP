import { isBrowser } from './ssr'

/**
 * Ensure a single shared `dataLayer` + `gtag` shim exists. Both Google Consent
 * Mode and the GA/GTM loaders funnel through this so there is exactly one
 * `gtag` function and one `dataLayer` on the page.
 */
export function ensureGtag(): void {
  if (!isBrowser()) return
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
  }
}

/** Call `gtag(...)`, initializing the shim if necessary. */
export function gtag(...args: unknown[]): void {
  if (!isBrowser()) return
  ensureGtag()
  window.gtag!(...args)
}
