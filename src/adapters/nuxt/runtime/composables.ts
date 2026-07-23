import {
  openPrivacyPreferences,
  resetPrivacyConsent,
} from '../../../core/index'
import { getController } from '../../../core/singleton'
import type { PrivacyConsentController, ResetOptions } from '../../../core/types'

export interface VeraCmpComposable {
  /** Open the preferences modal. */
  open: () => void
  /** Revoke consent (reload by default). */
  reset: (options?: ResetOptions) => Promise<void>
  /** The active controller, if initialized. */
  getController: () => PrivacyConsentController | null
}

/** Nuxt composable (auto-imported) for controlling consent. */
export function useVeraCmp(): VeraCmpComposable {
  return {
    open: openPrivacyPreferences,
    reset: resetPrivacyConsent,
    getController: () => getController(),
  }
}
