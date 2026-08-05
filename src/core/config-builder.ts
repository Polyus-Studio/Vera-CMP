import type * as CC from 'vanilla-cookieconsent'
import {
  CATEGORIES,
  DEFAULT_COOKIE_EXPIRES_DAYS,
  DEFAULT_COOKIE_NAME,
  KNOWN_COOKIES,
} from './constants'
import { shouldLockGpcCategories } from './gpc'
import { buildTranslations } from './translations'
import { resolveTrackers } from './trackers/registry'
import type { Category, PrivacyConsentConfig } from './types'

export interface GpcState {
  active: boolean
  deniedCategories: Category[]
}

type Callbacks = Pick<
  CC.CookieConsentConfig,
  'onFirstConsent' | 'onConsent' | 'onChange'
>

function defaultGuiOptions(): CC.GuiOptions {
  return {
    consentModal: {
      layout: 'box',
      position: 'bottom right',
      equalWeightButtons: true,
      flipButtons: false,
    },
    preferencesModal: {
      layout: 'box',
      equalWeightButtons: true,
      flipButtons: false,
    },
  }
}

function buildAutoClear(
  category: Category,
  config: PrivacyConsentConfig,
): CC.AutoClear | undefined {
  const cookies: CC.CookieItem[] = []
  for (const tracker of resolveTrackers(config)) {
    if (tracker.category !== category) continue
    for (const name of KNOWN_COOKIES[tracker.key]) {
      cookies.push({ name })
    }
  }
  return cookies.length > 0 ? { cookies } : undefined
}

function buildCategories(
  config: PrivacyConsentConfig,
  gpc: GpcState,
): CC.CookieConsentConfig['categories'] {
  const lock = gpc.active && shouldLockGpcCategories(config.gpc)
  const categories: Record<string, CC.Category> = {}

  for (const category of CATEGORIES) {
    const isNecessary = category === 'necessary'
    const deniedByGpc = gpc.active && gpc.deniedCategories.includes(category)
    categories[category] = {
      // opt-in: everything except necessary starts disabled.
      enabled: isNecessary,
      readOnly: isNecessary || (deniedByGpc && lock),
      autoClear: buildAutoClear(category, config),
    }
  }
  return categories
}

function buildCookie(config: PrivacyConsentConfig): CC.CookieOptions {
  const cookie: CC.CookieOptions = {
    name: config.cookie?.name ?? DEFAULT_COOKIE_NAME,
    expiresAfterDays:
      config.cookie?.expiresAfterDays ?? DEFAULT_COOKIE_EXPIRES_DAYS,
  }

  // vanilla-cookieconsent merges this object over its defaults. Passing an
  // optional key as `undefined` (or an empty domain) overwrites a valid
  // default and produces attributes such as `Domain=undefined` or
  // `Path=undefined`, so browsers refuse to persist the consent cookie.
  if (config.cookie?.domain) cookie.domain = config.cookie.domain
  if (config.cookie?.path) cookie.path = config.cookie.path
  if (config.cookie?.sameSite) cookie.sameSite = config.cookie.sameSite

  return cookie
}

/** Translate a {@link PrivacyConsentConfig} into a vanilla-cookieconsent config. */
export function buildCookieConsentConfig(
  config: PrivacyConsentConfig,
  gpc: GpcState,
  callbacks: Callbacks,
): CC.CookieConsentConfig {
  const translations = buildTranslations(config, {
    gpcActive: gpc.active,
    gpcDeniedCategories: gpc.deniedCategories,
    showGpcNotice: config.gpc?.showHonoredNotice !== false,
  })

  return {
    mode: 'opt-in',
    revision: config.revision ?? 0,
    // Built-in callback loaders are the primary mechanism, so script-tag
    // interception is opt-in.
    manageScriptTags: config.manageScriptTags ?? false,
    autoClearCookies: true,
    disablePageInteraction: config.disablePageInteraction ?? false,
    guiOptions: config.guiOptions ?? defaultGuiOptions(),
    cookie: buildCookie(config),
    categories: buildCategories(config, gpc),
    language: {
      default: config.language ?? 'en',
      autoDetect: config.autoDetectLanguage ? 'browser' : undefined,
      translations,
    },
    onFirstConsent: callbacks.onFirstConsent,
    onConsent: callbacks.onConsent,
    onChange: callbacks.onChange,
  }
}
