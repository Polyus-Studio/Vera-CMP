// The "use client" directive is injected at build time (see tsup.config.ts),
// so this entry can be imported directly from Next.js Server Components.
export {
  PrivacyConsentProvider,
  usePrivacyConsent,
  type PrivacyConsentProviderProps,
  type PrivacyConsentContextValue,
} from './react'
