import { inject, type App, type Plugin } from 'vue'
import {
  initPrivacyConsent,
  openPrivacyPreferences,
  resetPrivacyConsent,
} from '../core/index'
import type {
  PrivacyConsentConfig,
  PrivacyConsentController,
  ResetOptions,
} from '../core/types'

const INJECTION_KEY = Symbol('vera-cmp')

export interface VeraCmpApi {
  openPreferences: () => void
  reset: (options?: ResetOptions) => Promise<void>
  getController: () => PrivacyConsentController | null
}

/**
 * Vue plugin: `app.use(createPrivacyConsent(config))`. Initialization is
 * client-only (the core init no-ops during SSR), so it is safe with Vite SSR.
 */
export function createPrivacyConsent(config: PrivacyConsentConfig): Plugin {
  return {
    install(app: App) {
      let controller: PrivacyConsentController | null = null
      if (typeof window !== 'undefined') {
        controller = initPrivacyConsent(config)
      }
      const api: VeraCmpApi = {
        openPreferences: openPrivacyPreferences,
        reset: resetPrivacyConsent,
        getController: () => controller,
      }
      app.provide(INJECTION_KEY, api)
      app.config.globalProperties.$privacyConsent = api
    },
  }
}

/** Composable to access consent controls inside a component. */
export function usePrivacyConsent(): VeraCmpApi {
  return (
    inject<VeraCmpApi | undefined>(INJECTION_KEY, undefined) ?? {
      openPreferences: openPrivacyPreferences,
      reset: resetPrivacyConsent,
      getController: () => null,
    }
  )
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $privacyConsent: VeraCmpApi
  }
}
