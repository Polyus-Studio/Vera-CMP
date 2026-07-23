import * as CookieConsent from 'vanilla-cookieconsent'
import { buildCookieConsentConfig } from './config-builder'
import { KNOWN_COOKIES } from './constants'
import { denyConsentMode, initConsentMode, updateConsentMode } from './consent-mode'
import { eraseCookies } from './cookies'
import { gpcDeniedCategories, isGpcActive } from './gpc'
import {
  clearController,
  getController,
  getRegistry,
  getSavedConfig,
  isInitialized,
  setController,
} from './singleton'
import { isBrowser } from './ssr'
import {
  applyConsent,
  eraseAllTrackers,
  loadEagerTrackers,
  warnOnGaGtmConflict,
} from './trackers/registry'
import type {
  Category,
  ConsentModeVariant,
  PrivacyConsentConfig,
  PrivacyConsentController,
  ResetOptions,
} from './types'

function consentModeVariant(config: PrivacyConsentConfig): ConsentModeVariant {
  return config.consentMode?.mode ?? 'basic'
}

function consentModeEnabled(config: PrivacyConsentConfig): boolean {
  return config.consentMode?.enabled !== false
}

function acceptedCategories(): Category[] {
  return CookieConsent.getUserPreferences().acceptedCategories as Category[]
}

function noopController(): PrivacyConsentController {
  return {
    ready: Promise.resolve(),
    openPreferences: () => {},
    reset: async () => {},
    acceptCategory: () => {},
    getConsent: () => null,
  }
}

/**
 * Initialize the consent manager. Safe to call during SSR (no-op) and
 * idempotent — a second call returns the existing controller.
 */
export function initPrivacyConsent(
  config: PrivacyConsentConfig,
): PrivacyConsentController {
  if (!isBrowser()) return noopController()

  if (isInitialized()) {
    console.warn(
      '[vera-cmp] initPrivacyConsent() called more than once; returning the existing instance.',
    )
    return getController()!
  }

  const mode = consentModeVariant(config)
  const cmEnabled = consentModeEnabled(config)
  const gpcActive = isGpcActive(config.gpc)
  const deniedByGpc = gpcActive ? gpcDeniedCategories(config.gpc) : []

  // Categories the current consent state accepts, minus anything GPC denies.
  const effectiveAccepted = (): Category[] => {
    const accepted = acceptedCategories()
    return gpcActive
      ? accepted.filter((category) => !deniedByGpc.includes(category))
      : accepted
  }

  const syncConsent = (): void => {
    const accepted = effectiveAccepted()
    if (cmEnabled) updateConsentMode(accepted)
    applyConsent(config, accepted, mode)
  }

  // 1. Consent Mode defaults + advanced eager loading BEFORE run().
  if (cmEnabled) {
    initConsentMode(mode)
    loadEagerTrackers(config, mode)
  }

  // 2. Warn if GA and GTM would both run directly.
  warnOnGaGtmConflict(config)

  const ccConfig = buildCookieConsentConfig(
    config,
    { active: gpcActive, deniedCategories: deniedByGpc },
    {
      onFirstConsent: (param) => config.onFirstConsent?.(param),
      onConsent: (param) => {
        syncConsent()
        config.onConsent?.(param)
      },
      onChange: (param) => {
        syncConsent()
        config.onChange?.(param)
      },
    },
  )

  const ready = CookieConsent.run(ccConfig).then(() => {
    reconcileGpc(gpcActive, deniedByGpc)
  })

  const controller: PrivacyConsentController = {
    ready,
    openPreferences: () => CookieConsent.showPreferences(),
    reset: (options) => resetPrivacyConsent(options),
    acceptCategory: (categories = 'all') =>
      CookieConsent.acceptCategory(categories),
    getConsent: () => (isBrowser() ? CookieConsent.getUserPreferences() : null),
  }

  setController(controller, config)
  return controller
}

/**
 * GPC overrides previously stored consent: if the persisted cookie accepts a
 * GPC-denied category, re-persist consent without it. Tracker teardown and
 * Consent Mode were already handled by `syncConsent` (which filters GPC), so
 * this only makes the stored state and UI reflect the override.
 */
function reconcileGpc(gpcActive: boolean, deniedByGpc: Category[]): void {
  if (!gpcActive || deniedByGpc.length === 0) return
  const accepted = acceptedCategories()
  const conflicting = accepted.filter((category) =>
    deniedByGpc.includes(category),
  )
  if (conflicting.length === 0) return

  const next = accepted.filter((category) => !deniedByGpc.includes(category))
  // Triggers onChange → syncConsent, keeping everything consistent.
  CookieConsent.acceptCategory(next)
}

/** Open the preferences modal. */
export function openPrivacyPreferences(): void {
  if (!isBrowser()) return
  CookieConsent.showPreferences()
}

/**
 * Revoke consent completely: deny Consent Mode, erase known first-party
 * cookies, tear down vanilla-cookieconsent, then reload (default) so any
 * already-loaded trackers are removed, or re-run the saved config.
 */
export async function resetPrivacyConsent(
  options: ResetOptions = {},
): Promise<void> {
  if (!isBrowser()) return

  const reload = options.reload !== false
  const config = getSavedConfig()

  // 1. Consent Mode → denied.
  if (!config || consentModeEnabled(config)) denyConsentMode()

  // 2. Disable trackers + erase their cookies.
  if (config) {
    eraseAllTrackers(config)
  } else {
    eraseCookies(Object.values(KNOWN_COOKIES).flat())
  }

  // 3. Tear down vanilla-cookieconsent and delete its consent cookie.
  CookieConsent.reset(true)

  // 4. Forget our own state.
  clearController()
  const registry = getRegistry()
  registry.loaded.clear()
  registry.scripts.clear()

  // 5. Reload (default) or re-run the saved config.
  if (reload) {
    window.location.reload()
    return
  }
  if (config) initPrivacyConsent(config)
}
