import type * as CC from 'vanilla-cookieconsent'

/** The four consent categories managed by this library. */
export type Category = 'necessary' | 'functional' | 'analytics' | 'marketing'

/** Google Consent Mode operating mode. */
export type ConsentModeVariant = 'basic' | 'advanced'

/** Locales shipped with built-in translations. */
export type SupportedLocale = 'en' | 'ru'

/** Recursive partial that leaves functions and arrays intact. */
export type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

/** Context handed to a custom tracker loader. */
export interface TrackerLoaderContext {
  id?: string
  category: Category
  consentMode: ConsentModeVariant
}

/**
 * Per-tracker settings. In hybrid mode a built-in loader is used by default;
 * set `enabled: false` to skip it, or provide `loader` to inject the vendor
 * script yourself.
 */
export interface TrackerSettings {
  /** Vendor identifier (measurement id, container id, pixel id, ...). */
  id?: string
  /** Defaults to `true` when an `id` is provided. */
  enabled?: boolean
  /** Override the consent category the tracker is gated behind. */
  category?: Category
  /** Custom loader replacing the built-in one (hybrid mode). */
  loader?: (ctx: TrackerLoaderContext) => void | Promise<void>
}

export interface HotjarSettings extends TrackerSettings {
  /** Hotjar snippet version. */
  version?: number
}

export interface TrackersConfig {
  /** Google Analytics 4 (gtag.js). Defaults to the `analytics` category. */
  googleAnalytics?: TrackerSettings
  /** Google Tag Manager — a consent-aware container. Defaults to `analytics`. */
  googleTagManager?: TrackerSettings
  /** Meta (Facebook) Pixel. Defaults to the `marketing` category. */
  metaPixel?: TrackerSettings
  /** Microsoft Clarity. Defaults to the `analytics` category. */
  clarity?: TrackerSettings
  /** Hotjar. Defaults to the `analytics` category. */
  hotjar?: HotjarSettings
}

export interface ConsentModeConfig {
  /** Enable Google Consent Mode signalling. @default true */
  enabled?: boolean
  /**
   * `basic`: Google tags are not loaded or contacted before consent.
   * `advanced`: tags load immediately with all signals denied and use
   * `wait_for_update` cookieless pings until the user decides.
   * @default 'basic'
   */
  mode?: ConsentModeVariant
}

export interface GpcConfig {
  /** Honour the browser Global Privacy Control signal. @default true */
  enabled?: boolean
  /** Categories forced off when GPC is active. @default ['marketing'] */
  deniedCategories?: Category[]
  /** Render GPC-denied categories as locked (read-only) in the UI. @default true */
  lockDeniedCategories?: boolean
  /** Append a notice explaining that GPC was honoured. @default true */
  showHonoredNotice?: boolean
}

export interface PrivacyLinks {
  privacyPolicy: string
  cookiePolicy: string
  terms?: string
}

/** Subset of vanilla-cookieconsent cookie options surfaced to consumers. */
export type PrivacyCookieOptions = Pick<
  CC.CookieOptions,
  'name' | 'domain' | 'path' | 'sameSite' | 'expiresAfterDays'
>

/**
 * Public configuration. Company names, domains and tracker ids are never
 * hard-coded — everything is supplied here per site.
 */
export interface PrivacyConsentConfig {
  /** Site / brand name shown in the modal copy. */
  siteName: string
  /** Default language. @default 'en' */
  language?: SupportedLocale
  /** Detect the language from the browser when possible. @default false */
  autoDetectLanguage?: boolean
  /** Consent revision — bump to force re-consent after a policy change. @default 0 */
  revision?: number
  /** Links rendered in the modal footer / sections. */
  links: PrivacyLinks
  /** Cookie storage options. */
  cookie?: PrivacyCookieOptions
  /**
   * Intercept `<script type="text/plain" data-category>` tags. Built-in
   * callback loaders are the primary mechanism, so this is off by default.
   * @default false
   */
  manageScriptTags?: boolean
  /**
   * Allow direct Google Analytics and Google Tag Manager to run together.
   * When false (default) a warning is emitted, since GA is usually deployed
   * *through* GTM and running both double-counts hits.
   * @default false
   */
  allowDirectGaWithGtm?: boolean
  /** Google Consent Mode configuration. */
  consentMode?: ConsentModeConfig
  /** Global Privacy Control configuration. */
  gpc?: GpcConfig
  /** Third-party trackers to manage. */
  trackers?: TrackersConfig
  /** Passed straight through to vanilla-cookieconsent. */
  guiOptions?: CC.GuiOptions
  /** Dark overlay + block interaction until a choice is made. @default false */
  disablePageInteraction?: boolean
  /** Fired once, the first time consent is given. */
  onFirstConsent?: CC.CookieConsentConfig['onFirstConsent']
  /** Fired on every page load with valid consent and on first consent. */
  onConsent?: CC.CookieConsentConfig['onConsent']
  /** Fired when the user changes their choice. */
  onChange?: CC.CookieConsentConfig['onChange']
  /** Deep overrides for the built-in en/ru copy. */
  translations?: Partial<Record<SupportedLocale, DeepPartial<CC.Translation>>>
}

export interface ResetOptions {
  /**
   * Reload the page after revoking consent so that already-loaded trackers
   * are fully torn down. When false the saved config is re-run instead.
   * @default true
   */
  reload?: boolean
}

/** Object returned by {@link initPrivacyConsent}. */
export interface PrivacyConsentController {
  /** Resolves after `CookieConsent.run()` and GPC reconciliation finish. */
  ready: Promise<void>
  /** Open the preferences modal. */
  openPreferences: () => void
  /** Revoke consent, erase cookies and reset (reload by default). */
  reset: (options?: ResetOptions) => Promise<void>
  /** Accept the given categories (`'all'` / `[]` / a list). */
  acceptCategory: (categories?: string | string[]) => void
  /** Snapshot of the user's current preferences, or null on the server. */
  getConsent: () => CC.UserPreferences | null
}

export type TrackerKey = keyof TrackersConfig

/** Re-export the upstream types consumers may want (via the namespace). */
export type CookieConsentConfig = CC.CookieConsentConfig
export type CookieValue = CC.CookieValue
export type UserPreferences = CC.UserPreferences
export type Translation = CC.Translation
