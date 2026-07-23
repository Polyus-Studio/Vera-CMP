import type { Category, TrackerKey } from './types'

/** Ordered list of the categories this library manages. */
export const CATEGORIES: readonly Category[] = [
  'necessary',
  'functional',
  'analytics',
  'marketing',
]

/** Default consent cookie name (overridable via `config.cookie.name`). */
export const DEFAULT_COOKIE_NAME = 'vera_cmp_consent'

/** Default consent cookie lifetime, in days. */
export const DEFAULT_COOKIE_EXPIRES_DAYS = 182

/** Category each built-in tracker is gated behind unless overridden. */
export const DEFAULT_TRACKER_CATEGORY: Record<TrackerKey, Category> = {
  googleAnalytics: 'analytics',
  googleTagManager: 'analytics',
  metaPixel: 'marketing',
  clarity: 'analytics',
  hotjar: 'analytics',
}

/**
 * First-party cookies each vendor is known to set. Used both for
 * vanilla-cookieconsent `autoClear` and for explicit erasure on revoke.
 */
export const KNOWN_COOKIES: Record<TrackerKey, (string | RegExp)[]> = {
  googleAnalytics: [/^_ga/, '_gid', /^_gat/, '_gcl_au', /^_gac_/],
  googleTagManager: ['_gcl_au', /^_gac_/, /^_dc_gtm_/],
  metaPixel: ['_fbp', '_fbc'],
  clarity: ['_clck', '_clsk'],
  hotjar: [/^_hj/],
}

/** Global registry key used to dedupe across bundle copies. */
export const REGISTRY_KEY = '__VERA_CMP__' as const

/** Library version stamped onto the registry. */
export const VERSION = '0.1.0'
