import { REGISTRY_KEY, VERSION } from './constants'
import { isBrowser } from './ssr'
import type { PrivacyConsentConfig, PrivacyConsentController } from './types'

function createRegistry(): VeraCmpRegistry {
  return {
    version: VERSION,
    controller: null,
    savedConfig: null,
    scripts: new Set<string>(),
    loaded: new Set<string>(),
  }
}

/**
 * The shared registry lives on `window.__VERA_CMP__` so that multiple copies
 * of this bundle (micro-frontends, duplicated deps) still share one instance
 * and cannot double-initialize. On the server a throwaway registry is returned.
 */
export function getRegistry(): VeraCmpRegistry {
  if (!isBrowser()) {
    return createRegistry()
  }
  if (!window[REGISTRY_KEY]) {
    window[REGISTRY_KEY] = createRegistry()
  }
  return window[REGISTRY_KEY]
}

export function isInitialized(): boolean {
  return getRegistry().controller !== null
}

export function getController(): PrivacyConsentController | null {
  return getRegistry().controller
}

export function getSavedConfig(): PrivacyConsentConfig | null {
  return getRegistry().savedConfig
}

export function setController(
  controller: PrivacyConsentController,
  config: PrivacyConsentConfig,
): void {
  const registry = getRegistry()
  registry.controller = controller
  registry.savedConfig = config
}

/** Clear the controller (but keep the saved config for a possible re-run). */
export function clearController(): void {
  getRegistry().controller = null
}
