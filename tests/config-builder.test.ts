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

  it('preserves vanilla-cookieconsent storage defaults when cookie options are omitted', () => {
    const cfg = buildCookieConsentConfig(base, noGpc, {})

    expect(cfg.cookie).toEqual({
      name: 'vera_cmp_consent',
      expiresAfterDays: 182,
    })
    expect(cfg.cookie).not.toHaveProperty('domain')
    expect(cfg.cookie).not.toHaveProperty('path')
    expect(cfg.cookie).not.toHaveProperty('sameSite')
  })

  it('omits an empty domain while forwarding explicit cookie options', () => {
    const cfg = buildCookieConsentConfig(
      {
        ...base,
        cookie: {
          name: 'site_consent',
          domain: '',
          path: '/',
          sameSite: 'Strict',
          expiresAfterDays: 30,
        },
      },
      noGpc,
      {},
    )

    expect(cfg.cookie).toEqual({
      name: 'site_consent',
      path: '/',
      sameSite: 'Strict',
      expiresAfterDays: 30,
    })
    expect(cfg.cookie).not.toHaveProperty('domain')
  })

  it('adds autoClear cookies for configured trackers', () => {
    const cfg = buildCookieConsentConfig(base, noGpc, {})
    expect(cfg.categories.analytics.autoClear?.cookies.length).toBeGreaterThan(0)
    expect(
      cfg.categories.marketing.autoClear?.cookies.some((c) => c.name === '_fbp'),
    ).toBe(true)
  })

  it('never marks GPC-denied categories read-only and injects the notice', () => {
    // vanilla-cookieconsent force-accepts read-only categories on every
    // acceptCategory() call ("Reject all" included), so GPC-denied categories
    // must stay regular opt-in categories; the GPC guard enforces them.
    const cfg = buildCookieConsentConfig(
      base,
      { active: true, deniedCategories: ['marketing'] },
      {},
    )
    expect(cfg.categories.marketing.readOnly).toBe(false)
    expect(cfg.categories.marketing.enabled).toBe(false)
    expect(cfg.categories.necessary.readOnly).toBe(true)
    const en = cfg.language.translations.en as Translation
    expect(en.preferencesModal.sections[0]?.description).toContain(
      'Global Privacy Control',
    )
    expect(en.preferencesModal.sections[0]?.description).toContain(
      'cannot be switched on while the signal is active',
    )
  })

  it('words the GPC notice for unlocked categories', () => {
    const cfg = buildCookieConsentConfig(
      { ...base, gpc: { lockDeniedCategories: false } },
      { active: true, deniedCategories: ['marketing'] },
      {},
    )
    expect(cfg.categories.marketing.readOnly).toBe(false)
    const ru = cfg.language.translations.ru as Translation
    expect(ru.preferencesModal.sections[0]?.description).toContain(
      'включить их по отдельности',
    )
  })

  it('does not claim analytics data is aggregated or anonymised', () => {
    const cfg = buildCookieConsentConfig(base, noGpc, {})
    const analytics = (locale: 'en' | 'ru') =>
      (cfg.language.translations[locale] as Translation).preferencesModal.sections.find(
        (section) => section.linkedCategory === 'analytics',
      )?.description ?? ''
    expect(analytics('en')).not.toMatch(/aggregated|anonymi[sz]ed/i)
    expect(analytics('ru')).not.toMatch(/обезличен|агрегир/i)
    expect(analytics('en')).not.toBe('')
    expect(analytics('ru')).not.toBe('')
  })

  it('clears Yandex Metrica cookies with the analytics category when declared', () => {
    const cfg = buildCookieConsentConfig(
      { ...base, trackers: { yandexMetrica: {} } },
      noGpc,
      {},
    )
    const names = cfg.categories.analytics.autoClear?.cookies.map((c) => c.name) ?? []
    expect(names).toEqual(
      expect.arrayContaining(['_ym_uid', '_ym_d', '_ym_isad', '_ym_visorc']),
    )
    expect(names.some((name) => name instanceof RegExp && name.test('_ym_hostIndex'))).toBe(true)
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
