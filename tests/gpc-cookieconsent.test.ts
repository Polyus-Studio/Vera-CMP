// @vitest-environment jsdom
//
// GPC behaviour against the REAL vanilla-cookieconsent (no module mock): the
// consent modal, the preferences modal, the consent cookie and
// `manageScriptTags` script activation all run for real inside jsdom.
import * as CookieConsent from 'vanilla-cookieconsent'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAllCookieNames } from '../src/core/cookies'
import { initPrivacyConsent } from '../src/core/index'
import type {
  CookieValue,
  PrivacyConsentConfig,
  PrivacyConsentController,
} from '../src/core/types'
import { dataLayerEntries, resetEnv } from './setup/reset-env'

const COOKIE_NAME = 'vera_cmp_consent'

function setGpc(value: boolean | undefined): void {
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    value,
    configurable: true,
  })
}

function clearAllCookies(): void {
  for (const name of getAllCookieNames()) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}

function readConsentCookie(): CookieValue | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  )
  return match ? (JSON.parse(decodeURIComponent(match[1]!)) as CookieValue) : null
}

function writeConsentCookie(value: Partial<CookieValue>): void {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))}; path=/`
}

function legacyConsent(categories: string[], data: unknown = null): Partial<CookieValue> {
  const now = new Date().toISOString()
  return {
    categories,
    revision: 0,
    data,
    consentId: '11111111-2222-4333-8444-555555555555',
    consentTimestamp: now,
    lastConsentTimestamp: now,
    languageCode: 'en',
    services: { necessary: [], functional: [], analytics: [], marketing: [] },
    expirationTime: Date.now() + 86_400_000,
  }
}

/**
 * Blocked `<script type="text/plain" data-category>` tags, one per category.
 * jsdom runs activated scripts in its own window context, so each script
 * reports through the shared document (a `<meta>` marker) instead of a global.
 */
function addScriptTags(): void {
  const tag = (category: string) =>
    `<script type="text/plain" data-category="${category}">` +
    `document.head.appendChild(Object.assign(document.createElement('meta'), ` +
    `{ name: 'vera-test-ran', content: ${JSON.stringify(category)} }))` +
    `</script>`
  document.body.insertAdjacentHTML(
    'beforeend',
    tag('functional') + tag('analytics') + tag('marketing'),
  )
}

/** Categories whose script tags have executed, in execution order. */
function ran(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="vera-test-ran"]'),
    (meta) => meta.content,
  )
}

function accepted(): string[] {
  return CookieConsent.getUserPreferences().acceptedCategories.slice().sort()
}

function el<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector)
  if (!node) throw new Error(`Element not found: ${selector}`)
  return node
}

function click(selector: string): void {
  el<HTMLElement>(selector).click()
}

function lastConsentUpdate(): Record<string, string> | undefined {
  const updates = dataLayerEntries().filter(
    (entry) => entry[0] === 'consent' && entry[1] === 'update',
  )
  return updates[updates.length - 1]?.[2] as Record<string, string> | undefined
}

function loadedTrackers(): string[] {
  return [...(window.__VERA_CMP__?.loaded ?? [])].sort()
}

const CM = '#cc-main .cm'
const PM = '#cc-main .pm'
const marketingToggle = `${PM} input.section__toggle[value="marketing"]`

function config(overrides: Partial<PrivacyConsentConfig> = {}): PrivacyConsentConfig {
  return {
    siteName: 'Acme',
    links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
    manageScriptTags: true,
    trackers: {
      googleAnalytics: { id: 'G-TEST' },
      metaPixel: { id: '1234567890' },
    },
    ...overrides,
  }
}

async function start(
  overrides: Partial<PrivacyConsentConfig> = {},
): Promise<PrivacyConsentController> {
  const controller = initPrivacyConsent(config(overrides))
  await controller.ready
  return controller
}

/** Simulate a page reload: keep cookies, rebuild the DOM and the plugin. */
async function reload(
  overrides: Partial<PrivacyConsentConfig> = {},
): Promise<PrivacyConsentController> {
  CookieConsent.reset(false)
  resetEnv()
  addScriptTags()
  return start(overrides)
}

describe('GPC with the real vanilla-cookieconsent', () => {
  beforeEach(() => {
    CookieConsent.reset(true)
    resetEnv()
    clearAllCookies()
      setGpc(true)
    addScriptTags()
  })

  afterEach(() => {
    CookieConsent.reset(true)
    setGpc(undefined)
  })

  describe('lockDeniedCategories: true (default)', () => {
    it('"Reject all" accepts only the necessary category', async () => {
      await start()
      click(`${CM} [data-role="necessary"]`)

      expect(accepted()).toEqual(['necessary'])
      expect(readConsentCookie()?.categories).toEqual(['necessary'])
      expect(ran()).toEqual([])
      expect(lastConsentUpdate()?.ad_storage).toBe('denied')
      expect(loadedTrackers()).toEqual([])
    })

    it('closing the banner accepts only the necessary category', async () => {
      await start()
      click(`${CM} .cm__btn--close`)

      expect(accepted()).toEqual(['necessary'])
      expect(ran()).toEqual([])
    })

    it('"Accept all" never accepts the GPC-denied category', async () => {
      const onFirstConsent = vi.fn()
      const onConsent = vi.fn()
      const onChange = vi.fn()
      await start({ onFirstConsent, onConsent, onChange })

      click(`${CM} [data-role="all"]`)

      expect(accepted()).toEqual(['analytics', 'functional', 'necessary'])
      expect(CookieConsent.acceptedCategory('marketing')).toBe(false)
      expect(readConsentCookie()?.categories).not.toContain('marketing')

      // Script tags: allowed categories run, the denied one never does.
      expect(ran().sort()).toEqual(['analytics', 'functional'])

      // Built-in loaders and Consent Mode.
      expect(loadedTrackers()).toEqual(['googleAnalytics'])
      expect(window.fbq).toBeUndefined()
      expect(lastConsentUpdate()).toMatchObject({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })

      // Consumer hooks only ever see the enforced state.
      expect(onFirstConsent).toHaveBeenCalledTimes(1)
      expect(onFirstConsent.mock.calls[0]![0].cookie.categories).not.toContain('marketing')
      expect(onConsent).toHaveBeenCalledTimes(1)
      expect(onConsent.mock.calls[0]![0].cookie.categories).not.toContain('marketing')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('"Accept all" in the preferences modal never accepts the denied category', async () => {
      const controller = await start()
      controller.openPreferences()
      click(`${PM} [data-role="all"]`)

      expect(accepted()).toEqual(['analytics', 'functional', 'necessary'])
      expect(ran()).not.toContain('marketing')
    })

    it('programmatic acceptCategory() calls cannot accept the denied category', async () => {
      const controller = await start()

      controller.acceptCategory('all')
      expect(accepted()).toEqual(['analytics', 'functional', 'necessary'])

      controller.acceptCategory(['marketing'])
      expect(accepted()).toEqual(['necessary'])

      CookieConsent.acceptCategory(['necessary', 'marketing'])
      expect(accepted()).toEqual(['necessary'])

      expect(readConsentCookie()?.categories).not.toContain('marketing')
      expect(ran()).not.toContain('marketing')
      expect(window.fbq).toBeUndefined()
    })

    it('overrides stored legacy consent that includes marketing', async () => {
      writeConsentCookie(legacyConsent(['necessary', 'analytics', 'marketing']))
      document.cookie = '_fbp=fb.1.123; path=/'
      const onConsent = vi.fn()
      const onChange = vi.fn()

      await start({ onConsent, onChange })

      expect(accepted()).toEqual(['analytics', 'necessary'])
      expect(readConsentCookie()?.categories).toEqual(['necessary', 'analytics'])
      expect(ran()).toEqual(['analytics'])
      expect(window.fbq).toBeUndefined()
      expect(getAllCookieNames()).not.toContain('_fbp')
      expect(lastConsentUpdate()?.ad_storage).toBe('denied')

      expect(onConsent).toHaveBeenCalledTimes(1)
      expect(onConsent.mock.calls[0]![0].cookie.categories).not.toContain('marketing')
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange.mock.calls[0]![0].changedCategories).toEqual(['marketing'])

      // The override is persisted: the next page load starts clean.
      await reload({ onConsent, onChange })
      expect(accepted()).toEqual(['analytics', 'necessary'])
      expect(ran()).toEqual(['analytics'])
    })

    it('shows the denied toggle off and disabled, and keeps the GPC notice', async () => {
      const controller = await start()
      controller.openPreferences()

      const toggle = el<HTMLInputElement>(marketingToggle)
      expect(toggle.disabled).toBe(true)
      expect(toggle.checked).toBe(false)
      expect(el<HTMLInputElement>(`${PM} input.section__toggle[value="analytics"]`).disabled).toBe(false)
      expect(el(PM).textContent).toContain('Global Privacy Control')

      // A real click on the disabled toggle does nothing.
      toggle.click()
      expect(toggle.checked).toBe(false)

      // Even a forced DOM change followed by "Save" cannot enable it.
      toggle.disabled = false
      toggle.checked = true
      click(`${PM} [data-role="save"]`)

      expect(CookieConsent.acceptedCategory('marketing')).toBe(false)
      expect(ran()).not.toContain('marketing')

      // Re-opening keeps it locked.
      controller.openPreferences()
      expect(el<HTMLInputElement>(marketingToggle).disabled).toBe(true)
      expect(el<HTMLInputElement>(marketingToggle).checked).toBe(false)
    })

    it('drops a stored explicit opt-in once the categories are locked again', async () => {
      writeConsentCookie(
        legacyConsent(['necessary', 'marketing'], { veraCmpGpcOptIn: ['marketing'] }),
      )
      await start()

      expect(accepted()).toEqual(['necessary'])
      expect(readConsentCookie()?.data?.veraCmpGpcOptIn).toEqual([])
      expect(ran()).toEqual([])
    })
  })

  describe('lockDeniedCategories: false', () => {
    const unlocked = { gpc: { lockDeniedCategories: false } }

    it('leaves the denied toggle enabled but "Accept all" still does not enable it', async () => {
      const controller = await start(unlocked)
      click(`${CM} [data-role="all"]`)

      expect(accepted()).toEqual(['analytics', 'functional', 'necessary'])
      expect(ran()).not.toContain('marketing')

      controller.openPreferences()
      const toggle = el<HTMLInputElement>(marketingToggle)
      expect(toggle.disabled).toBe(false)
      expect(toggle.checked).toBe(false)

      click(`${PM} [data-role="all"]`)
      expect(CookieConsent.acceptedCategory('marketing')).toBe(false)

      controller.acceptCategory('all')
      expect(CookieConsent.acceptedCategory('marketing')).toBe(false)
    })

    it('honours and persists an explicit opt-in made in the preferences modal', async () => {
      const onChange = vi.fn()
      const controller = await start({ ...unlocked, onChange })
      controller.openPreferences()

      el<HTMLInputElement>(marketingToggle).click()
      expect(el<HTMLInputElement>(marketingToggle).checked).toBe(true)
      click(`${PM} [data-role="save"]`)

      expect(accepted()).toEqual(['marketing', 'necessary'])
      expect(readConsentCookie()?.categories).toContain('marketing')
      expect(readConsentCookie()?.data?.veraCmpGpcOptIn).toEqual(['marketing'])

      // The held script tag is released and the marketing loader runs.
      expect(ran()).toEqual(['marketing'])
      expect(loadedTrackers()).toEqual(['metaPixel'])
      expect(typeof window.fbq).toBe('function')
      expect(lastConsentUpdate()?.ad_storage).toBe('granted')

      // "Accept all" afterwards keeps the explicit choice.
      controller.acceptCategory('all')
      expect(accepted()).toEqual(['analytics', 'functional', 'marketing', 'necessary'])

      // Reload: reconciliation does not undo the explicit choice.
      await reload({ ...unlocked, onChange })
      expect(accepted()).toEqual(['analytics', 'functional', 'marketing', 'necessary'])
      expect(ran().sort()).toEqual(['analytics', 'functional', 'marketing'])
      expect(lastConsentUpdate()?.ad_storage).toBe('granted')
      expect(loadedTrackers()).toEqual(['googleAnalytics', 'metaPixel'])
    })

    it('withdrawing the opt-in clears the flag, so "Accept all" cannot revive it', async () => {
      writeConsentCookie(
        legacyConsent(['necessary', 'marketing'], { veraCmpGpcOptIn: ['marketing'] }),
      )
      const controller = await start(unlocked)
      expect(accepted()).toEqual(['marketing', 'necessary'])
      expect(ran()).toEqual(['marketing'])

      controller.openPreferences()
      el<HTMLInputElement>(marketingToggle).click()
      click(`${PM} [data-role="save"]`)

      expect(accepted()).toEqual(['necessary'])
      expect(readConsentCookie()?.data?.veraCmpGpcOptIn).toEqual([])

      controller.acceptCategory('all')
      expect(CookieConsent.acceptedCategory('marketing')).toBe(false)
    })

    it('does not treat legacy consent without the opt-in flag as explicit', async () => {
      writeConsentCookie(legacyConsent(['necessary', 'marketing']))
      await start(unlocked)

      expect(accepted()).toEqual(['necessary'])
      expect(ran()).toEqual([])
    })
  })

  describe('without a GPC signal', () => {
    it('"Accept all" accepts and runs every category', async () => {
      setGpc(false)
      await start()
      click(`${CM} [data-role="all"]`)

      expect(accepted()).toEqual(['analytics', 'functional', 'marketing', 'necessary'])
      expect(ran().sort()).toEqual(['analytics', 'functional', 'marketing'])
      expect(loadedTrackers()).toEqual(['googleAnalytics', 'metaPixel'])
      expect(lastConsentUpdate()?.ad_storage).toBe('granted')
    })
  })
})
