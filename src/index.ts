export {
  initPrivacyConsent,
  openPrivacyPreferences,
  resetPrivacyConsent,
} from './core/index'

export { VERSION } from './core/constants'

export type {
  PrivacyConsentConfig,
  PrivacyConsentController,
  ResetOptions,
  TrackerSettings,
  HotjarSettings,
  TrackersConfig,
  TrackerKey,
  TrackerLoaderContext,
  ConsentModeConfig,
  ConsentModeVariant,
  GpcConfig,
  PrivacyLinks,
  PrivacyCookieOptions,
  Category,
  SupportedLocale,
  DeepPartial,
  CookieConsentConfig,
  CookieValue,
  UserPreferences,
  Translation,
} from './core/types'
