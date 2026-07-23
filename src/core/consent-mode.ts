import { ensureGtag } from './gtag'
import { isBrowser } from './ssr'
import type { Category, ConsentModeVariant } from './types'

const SIGNALS = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
] as const

type ConsentSignal = (typeof SIGNALS)[number]
type ConsentValue = 'granted' | 'denied'
type ConsentState = Record<ConsentSignal, ConsentValue>

let defaultConfigured = false

function deniedState(): ConsentState {
  return {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    // Security storage is functionally necessary and always granted.
    security_storage: 'granted',
  }
}

function stateFor(accepted: Category[]): ConsentState {
  const granted = (value: boolean): ConsentValue => (value ? 'granted' : 'denied')
  const has = (category: Category) => accepted.includes(category)
  return {
    ad_storage: granted(has('marketing')),
    ad_user_data: granted(has('marketing')),
    ad_personalization: granted(has('marketing')),
    analytics_storage: granted(has('analytics')),
    functionality_storage: granted(has('functional')),
    personalization_storage: granted(has('functional')),
    security_storage: 'granted',
  }
}

/**
 * Push the Consent Mode defaults. MUST run before any Google tag (gtag.js /
 * GTM) loads. In `advanced` mode `wait_for_update` lets tags send cookieless
 * pings until the user decides; in `basic` mode tags are not loaded at all
 * before consent, so no grace period is needed.
 */
export function initConsentMode(mode: ConsentModeVariant): void {
  if (!isBrowser() || defaultConfigured) return
  ensureGtag()

  const payload: Record<string, unknown> = { ...deniedState() }
  if (mode === 'advanced') payload.wait_for_update = 500
  window.gtag!('consent', 'default', payload)
  window.gtag!('set', 'ads_data_redaction', true)
  window.gtag!('set', 'url_passthrough', true)

  defaultConfigured = true
}

/** Update Consent Mode to reflect the accepted categories. */
export function updateConsentMode(accepted: Category[]): void {
  if (!isBrowser()) return
  ensureGtag()
  window.gtag!('consent', 'update', stateFor(accepted))
}

/** Deny every optional signal (used on revoke). */
export function denyConsentMode(): void {
  if (!isBrowser()) return
  ensureGtag()
  window.gtag!('consent', 'update', deniedState())
}

/** Test-only: reset the module's one-shot default guard. */
export function __resetConsentModeState(): void {
  defaultConfigured = false
}
