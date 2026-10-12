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
  yandexMetrica: 'analytics',
}

/**
 * First-party cookies each vendor is known to set. Used both for
 * vanilla-cookieconsent `autoClear` and for explicit erasure on revoke
 * (`resetPrivacyConsent()` erases every vendor listed here, configured or not).
 */
export const KNOWN_COOKIES: Record<TrackerKey, (string | RegExp)[]> = {
  googleAnalytics: [/^_ga/, '_gid', /^_gat/, '_gcl_au', /^_gac_/],
  googleTagManager: ['_gcl_au', /^_gac_/, /^_dc_gtm_/],
  metaPixel: ['_fbp', '_fbc'],
  clarity: ['_clck', '_clsk'],
  hotjar: [/^_hj/],
  // _ym_uid, _ym_d, _ym_isad, _ym_visorc plus every other `_ym*` cookie
  // (e.g. _ym_hostIndex, _ym_metrika_enabled).
  yandexMetrica: ['_ym_uid', '_ym_d', '_ym_isad', '_ym_visorc', /^_ym/],
}

/**
 * Key inside the consent cookie's `data` that records the GPC-denied
 * categories the visitor explicitly switched on (`gpc.lockDeniedCategories:
 * false` only).
 */
export const GPC_OPT_IN_DATA_KEY = 'veraCmpGpcOptIn'

/** Global registry key used to dedupe across bundle copies. */
export const REGISTRY_KEY = '__VERA_CMP__' as const

/** Library version stamped onto the registry. Must match package.json. */
export const VERSION = '0.1.3'
