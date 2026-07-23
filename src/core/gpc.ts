import { isBrowser } from './ssr'
import type { Category, GpcConfig } from './types'

/** Categories forced off when GPC is active, unless overridden. */
export const DEFAULT_GPC_DENIED_CATEGORIES: Category[] = ['marketing']

/**
 * Whether the browser is currently signalling Global Privacy Control and the
 * feature is enabled in config. GPC is not natively supported by
 * vanilla-cookieconsent v3, so the wrapper enforces it explicitly.
 */
export function isGpcActive(config?: GpcConfig): boolean {
  if (!isBrowser()) return false
  if (config?.enabled === false) return false
  return navigator.globalPrivacyControl === true
}

/** The categories GPC should deny (marketing by default). */
export function gpcDeniedCategories(config?: GpcConfig): Category[] {
  return config?.deniedCategories ?? DEFAULT_GPC_DENIED_CATEGORIES
}

export function shouldLockGpcCategories(config?: GpcConfig): boolean {
  return config?.lockDeniedCategories !== false
}

export function shouldShowGpcNotice(config?: GpcConfig): boolean {
  return config?.showHonoredNotice !== false
}
