import type { PrivacyConsentConfig, PrivacyConsentController } from './core/types'

/**
 * Ambient declarations for the browser globals that tracker loaders and the
 * singleton registry attach to `window` / `navigator`.
 */
export {}

type AnyFn = (...args: any[]) => any

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void

    /** Meta (Facebook) Pixel queue function. */
    fbq?: AnyFn & {
      queue?: unknown[]
      callMethod?: AnyFn
      push?: AnyFn
      loaded?: boolean
      version?: string
    }
    _fbq?: Window['fbq']

    /** Microsoft Clarity queue function. */
    clarity?: AnyFn & { q?: unknown[] }

    /** Hotjar queue function. */
    hj?: AnyFn & { q?: unknown[] }
    _hjSettings?: { hjid: number; hjsv: number }

    /** Shared registry used to guard against double initialization. */
    __VERA_CMP__?: VeraCmpRegistry
  }

  interface Navigator {
    /** Global Privacy Control signal (not universally supported). */
    readonly globalPrivacyControl?: boolean
  }

  /** Cross-bundle registry stored on `window.__VERA_CMP__`. */
  interface VeraCmpRegistry {
    version: string
    controller: PrivacyConsentController | null
    savedConfig: PrivacyConsentConfig | null
    /** Ids of `<script>` tags injected by the script loader (dedupe). */
    scripts: Set<string>
    /** Tracker keys already initialized (dedupe across re-init). */
    loaded: Set<string>
  }
}
