import { DEFAULT_TRACKER_CATEGORY, KNOWN_COOKIES } from '../constants'
import { eraseCookies } from '../cookies'
import { getRegistry } from '../singleton'
import { isBrowser } from '../ssr'
import type {
  Category,
  ConsentModeVariant,
  HotjarSettings,
  PrivacyConsentConfig,
  TrackerKey,
  TrackerSettings,
} from '../types'
import { loadGoogleAnalytics } from './google-analytics'
import { loadGoogleTagManager } from './google-tag-manager'
import { loadHotjar } from './hotjar'
import { loadMetaPixel } from './meta-pixel'
import { loadMicrosoftClarity } from './microsoft-clarity'

/** Trackers governed by Google Consent Mode (may load eagerly in advanced mode). */
const GOOGLE_TRACKERS: readonly TrackerKey[] = ['googleTagManager', 'googleAnalytics']

const ALL_KEYS: readonly TrackerKey[] = [
  'googleTagManager',
  'googleAnalytics',
  'metaPixel',
  'clarity',
  'hotjar',
]

interface ResolvedTracker {
  key: TrackerKey
  settings: TrackerSettings
  id?: string
  category: Category
  enabled: boolean
}

function resolveTracker(
  key: TrackerKey,
  settings: TrackerSettings | undefined,
): ResolvedTracker | null {
  if (!settings) return null
  const hasImplementation = Boolean(settings.id || settings.loader)
  return {
    key,
    settings,
    id: settings.id,
    category: settings.category ?? DEFAULT_TRACKER_CATEGORY[key],
    enabled: settings.enabled !== false && hasImplementation,
  }
}

export function resolveTrackers(config: PrivacyConsentConfig): ResolvedTracker[] {
  const trackers = config.trackers ?? {}
  return ALL_KEYS.map((key) => resolveTracker(key, trackers[key])).filter(
    (tracker): tracker is ResolvedTracker => tracker !== null,
  )
}

function runBuiltInLoader(resolved: ResolvedTracker): void {
  const { key, id, settings } = resolved
  if (!id) return
  switch (key) {
    case 'googleAnalytics':
      return loadGoogleAnalytics(id)
    case 'googleTagManager':
      return loadGoogleTagManager(id)
    case 'metaPixel':
      return loadMetaPixel(id)
    case 'clarity':
      return loadMicrosoftClarity(id)
    case 'hotjar':
      return loadHotjar(id, (settings as HotjarSettings).version)
  }
}

function loadTrackerOnce(
  resolved: ResolvedTracker,
  consentMode: ConsentModeVariant,
): void {
  if (!isBrowser() || !resolved.enabled) return
  const registry = getRegistry()
  if (registry.loaded.has(resolved.key)) return
  registry.loaded.add(resolved.key)

  if (resolved.settings.loader) {
    void resolved.settings.loader({
      id: resolved.id,
      category: resolved.category,
      consentMode,
    })
    return
  }
  runBuiltInLoader(resolved)
}

function eraseTracker(key: TrackerKey, config: PrivacyConsentConfig): void {
  eraseCookies(KNOWN_COOKIES[key], config.cookie?.domain)
  getRegistry().loaded.delete(key)
}

/**
 * Warn when direct GA and GTM are both enabled (GA is usually deployed through
 * GTM, so running both double-counts hits). Silenced by `allowDirectGaWithGtm`.
 */
export function warnOnGaGtmConflict(config: PrivacyConsentConfig): void {
  if (config.allowDirectGaWithGtm) return
  const resolved = resolveTrackers(config)
  const ga = resolved.find((t) => t.key === 'googleAnalytics' && t.enabled)
  const gtm = resolved.find((t) => t.key === 'googleTagManager' && t.enabled)
  if (ga && gtm) {
    console.warn(
      '[vera-cmp] Both direct Google Analytics and Google Tag Manager are enabled. ' +
        'GA is usually deployed through GTM; running both double-counts hits. ' +
        'Set `allowDirectGaWithGtm: true` if this is intentional.',
    )
  }
}

/**
 * Advanced Consent Mode only: load Google trackers immediately so they can send
 * cookieless pings while all signals are denied. In basic mode nothing is
 * contacted before the relevant category is accepted.
 */
export function loadEagerTrackers(
  config: PrivacyConsentConfig,
  consentMode: ConsentModeVariant,
): void {
  if (consentMode !== 'advanced') return
  for (const resolved of resolveTrackers(config)) {
    if (GOOGLE_TRACKERS.includes(resolved.key)) {
      loadTrackerOnce(resolved, consentMode)
    }
  }
}

/** Load trackers for accepted categories; erase cookies for the rest. */
export function applyConsent(
  config: PrivacyConsentConfig,
  accepted: Category[],
  consentMode: ConsentModeVariant,
): void {
  if (!isBrowser()) return
  for (const resolved of resolveTrackers(config)) {
    if (!resolved.enabled) continue
    if (accepted.includes(resolved.category)) {
      loadTrackerOnce(resolved, consentMode)
    } else {
      eraseTracker(resolved.key, config)
    }
  }
}

/** Erase cookies for every known tracker (used on full revoke). */
export function eraseAllTrackers(config: PrivacyConsentConfig): void {
  for (const key of ALL_KEYS) eraseTracker(key, config)
}
