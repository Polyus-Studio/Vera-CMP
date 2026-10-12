import type * as CC from 'vanilla-cookieconsent'
import * as CookieConsent from 'vanilla-cookieconsent'
import { buildCookieConsentConfig } from './config-builder'
import { KNOWN_COOKIES } from './constants'
import { denyConsentMode, initConsentMode, updateConsentMode } from './consent-mode'
import { eraseCookies } from './cookies'
import {
  gpcDeniedCategories,
  isGpcActive,
  shouldLockGpcCategories,
} from './gpc'
import { createGpcGuard, type GpcGuard } from './gpc-guard'
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

type ChangeParam = Parameters<NonNullable<CC.CookieConsentConfig['onChange']>>[0]

/** Detaches the GPC guard of the current instance (see resetPrivacyConsent). */
let detachGpcGuard: (() => void) | null = null

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
  const guard = createGpcGuard({
    active: gpcActive,
    deniedCategories: deniedByGpc,
    locked: shouldLockGpcCategories(config.gpc),
    manageScriptTags: config.manageScriptTags === true,
  })

  // Accepted categories minus anything GPC denies (unless explicitly allowed).
  const syncConsent = (): void => {
    const accepted = guard.filter(acceptedCategories())
    if (cmEnabled) updateConsentMode(accepted)
    applyConsent(config, accepted, mode)
    guard.releaseScriptTags(accepted)
  }

  const currentCookie = (): CC.CookieValue => CookieConsent.getCookie()

  // onChange fired while the guard re-persisted consent. On page load (stored
  // consent overridden by GPC) it is reported after onConsent; otherwise the
  // consent action that triggered it is reported in its place.
  let deferredChange: ChangeParam | null = null
  const flushDeferredChange = (): void => {
    const change = deferredChange
    deferredChange = null
    if (change) config.onChange?.({ ...change, cookie: currentCookie() })
  }

  // 1. Consent Mode defaults + advanced eager loading BEFORE run().
  if (cmEnabled) {
    initConsentMode(mode)
    loadEagerTrackers(config, mode)
  }

  // 2. Warn if GA and GTM would both run directly.
  warnOnGaGtmConflict(config)

  // 3. GPC: hold back script tags of denied categories BEFORE run() collects
  //    them, and watch for explicit "Save preferences" clicks.
  detachGpcGuard?.()
  guard.holdScriptTags()
  guard.attach()
  detachGpcGuard = () => guard.detach()

  const ccConfig = buildCookieConsentConfig(
    config,
    { active: gpcActive, deniedCategories: deniedByGpc },
    {
      onFirstConsent: (param) => {
        const blocked = guard.enforce('all')
        // The first consent reports the enforced state only.
        deferredChange = null
        config.onFirstConsent?.(
          blocked.length > 0 ? { cookie: currentCookie() } : param,
        )
      },
      onConsent: (param) => {
        const blocked = guard.enforce([])
        syncConsent()
        config.onConsent?.(
          blocked.length > 0 ? { cookie: currentCookie() } : param,
        )
        flushDeferredChange()
      },
      onChange: (param) => {
        if (guard.enforcing) {
          deferredChange = param
          return
        }
        const blocked = guard.enforce(param.changedCategories)
        deferredChange = null
        syncConsent()
        if (blocked.length === 0) {
          config.onChange?.(param)
          return
        }
        // Report the net change: the revoked categories never took effect.
        const changedCategories = param.changedCategories.filter(
          (category) => !blocked.includes(category as Category),
        )
        const changedServices = Object.fromEntries(
          Object.entries(param.changedServices).filter(
            ([category]) => !blocked.includes(category as Category),
          ),
        )
        const servicesChanged = Object.values(changedServices).some(
          (services) => services.length > 0,
        )
        if (changedCategories.length > 0 || servicesChanged) {
          config.onChange?.({
            cookie: currentCookie(),
            changedCategories,
            changedServices,
          })
        }
      },
      onModalReady: ({ modalName, modal }) => {
        if (modalName === 'preferencesModal') guard.lockToggles(modal)
      },
      onModalShow: ({ modalName }) => {
        if (modalName === 'preferencesModal') guard.lockToggles()
      },
    },
  )

  const ready = CookieConsent.run(ccConfig).then(() => {
    reconcileGpc(guard, syncConsent, flushDeferredChange)
  })

  const controller: PrivacyConsentController = {
    ready,
    openPreferences: () => CookieConsent.showPreferences(),
    reset: (options) => resetPrivacyConsent(options),
    acceptCategory: (categories = 'all') =>
      CookieConsent.acceptCategory(categories, guard.exclusions()),
    getConsent: () => (isBrowser() ? CookieConsent.getUserPreferences() : null),
  }

  setController(controller, config)
  return controller
}

/**
 * GPC overrides previously stored consent: if the persisted consent accepts a
 * GPC-denied category that the visitor did not explicitly opt into, it is
 * re-persisted without it. With vanilla-cookieconsent this already happened
 * in `onConsent` during `run()`, so this is a safety net that is normally a
 * no-op.
 */
function reconcileGpc(
  guard: GpcGuard,
  syncConsent: () => void,
  flushDeferredChange: () => void,
): void {
  if (guard.enforce([]).length === 0) return
  syncConsent()
  flushDeferredChange()
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
  detachGpcGuard?.()
  detachGpcGuard = null

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
