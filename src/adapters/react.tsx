import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
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

export interface PrivacyConsentContextValue {
  openPreferences: () => void
  reset: (options?: ResetOptions) => Promise<void>
  getController: () => PrivacyConsentController | null
}

const globalValue: PrivacyConsentContextValue = {
  openPreferences: openPrivacyPreferences,
  reset: resetPrivacyConsent,
  getController: () => null,
}

const PrivacyConsentContext =
  createContext<PrivacyConsentContextValue | null>(null)

export interface PrivacyConsentProviderProps {
  config: PrivacyConsentConfig
  children?: ReactNode
}

/**
 * Initializes the consent manager once on the client. SSR-safe: init runs in
 * an effect, never during render. Can wrap the app or be dropped in standalone
 * (`<PrivacyConsentProvider config={...} />`).
 */
export function PrivacyConsentProvider({
  config,
  children,
}: PrivacyConsentProviderProps) {
  const controllerRef = useRef<PrivacyConsentController | null>(null)

  useEffect(() => {
    controllerRef.current = initPrivacyConsent(config)
    // Intentionally run once — consent must survive remounts/route changes,
    // and the singleton guard makes re-init a no-op regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<PrivacyConsentContextValue>(
    () => ({
      openPreferences: openPrivacyPreferences,
      reset: resetPrivacyConsent,
      getController: () => controllerRef.current,
    }),
    [],
  )

  return (
    <PrivacyConsentContext.Provider value={value}>
      {children}
    </PrivacyConsentContext.Provider>
  )
}

/**
 * Access consent controls. Works inside a {@link PrivacyConsentProvider} and
 * also standalone (falls back to the module-level singleton API).
 */
export function usePrivacyConsent(): PrivacyConsentContextValue {
  return useContext(PrivacyConsentContext) ?? globalValue
}
