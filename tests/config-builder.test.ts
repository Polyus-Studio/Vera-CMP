import { describe, expect, it } from 'vitest'
import { buildCookieConsentConfig } from '../src/core/config-builder'
import type { PrivacyConsentConfig, Translation } from '../src/core/types'

const base: PrivacyConsentConfig = {
  siteName: 'Acme',
  language: 'en',
  revision: 3,
  links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies', terms: '/terms' },
  trackers: {
    googleAnalytics: { id: 'G-1' },
    metaPixel: { id: '123' },
  },
}

const noGpc = { active: false, deniedCategories: [] as never[] }

describe('config-builder', () => {
  it('maps the core options', () => {
    const cfg = buildCookieConsentConfig(base, noGpc, {})
    expect(cfg.mode).toBe('opt-in')
    expect(cfg.manageScriptTags).toBe(false)
    expect(cfg.revision).toBe(3)
    expect(cfg.categories.necessary.readOnly).toBe(true)
    expect(cfg.categories.necessary.enabled).toBe(true)
    expect(cfg.categories.analytics.enabled).toBe(false)
    expect(cfg.language.default).toBe('en')
    expect(cfg.language.translations.en).toBeDefined()
    expect(cfg.language.translations.ru).toBeDefined()
  })

  it('adds autoClear cookies for configured trackers', () => {
    const cfg = buildCookieConsentConfig(base, noGpc, {})
    expect(cfg.categories.analytics.autoClear?.cookies.length).toBeGreaterThan(0)
    expect(
      cfg.categories.marketing.autoClear?.cookies.some((c) => c.name === '_fbp'),
    ).toBe(true)
  })

  it('locks GPC-denied categories and injects the notice', () => {
    const cfg = buildCookieConsentConfig(
      base,
      { active: true, deniedCategories: ['marketing'] },
      {},
    )
    expect(cfg.categories.marketing.readOnly).toBe(true)
    expect(cfg.categories.marketing.enabled).toBe(false)
    const en = cfg.language.translations.en as Translation
    expect(en.preferencesModal.sections[0]?.description).toContain(
      'Global Privacy Control',
    )
  })

  it('honours the manageScriptTags override', () => {
    const cfg = buildCookieConsentConfig(
      { ...base, manageScriptTags: true },
      noGpc,
      {},
    )
    expect(cfg.manageScriptTags).toBe(true)
  })

  it('applies translation overrides', () => {
    const cfg = buildCookieConsentConfig(
      {
        ...base,
        translations: { en: { consentModal: { title: 'Custom title' } } },
      },
      noGpc,
      {},
    )
    const en = cfg.language.translations.en as Translation
    expect(en.consentModal.title).toBe('Custom title')
  })
})
