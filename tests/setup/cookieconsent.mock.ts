import { vi } from 'vitest'

export interface CcState {
  accepted: string[]
}

/** Mutable state read by the mocked `getUserPreferences` / `acceptCategory`. */
export function ccState(): CcState {
  const g = globalThis as unknown as { __CC_STATE__?: CcState }
  if (!g.__CC_STATE__) g.__CC_STATE__ = { accepted: [] }
  return g.__CC_STATE__
}

export function setAccepted(accepted: string[]): void {
  ccState().accepted = accepted.slice()
}

/** A stand-in for the `vanilla-cookieconsent` namespace used in unit tests. */
export function createCookieConsentMock() {
  return {
    run: vi.fn(async (_config: unknown) => {}),
    show: vi.fn(),
    hide: vi.fn(),
    showPreferences: vi.fn(),
    hidePreferences: vi.fn(),
    acceptCategory: vi.fn((categories: string | string[]) => {
      if (Array.isArray(categories)) {
        ccState().accepted = categories.slice()
      } else if (categories === 'all') {
        ccState().accepted = ['necessary', 'functional', 'analytics', 'marketing']
      } else {
        ccState().accepted = [categories]
      }
    }),
    acceptedCategory: vi.fn((category: string) =>
      ccState().accepted.includes(category),
    ),
    validConsent: vi.fn(() => false),
    eraseCookies: vi.fn(),
    getCookie: vi.fn(() => ({})),
    getUserPreferences: vi.fn(() => ({
      acceptType: 'custom' as const,
      acceptedCategories: ccState().accepted.slice(),
      rejectedCategories: [],
      acceptedServices: {},
      rejectedServices: {},
    })),
    reset: vi.fn(),
    setLanguage: vi.fn(async () => true),
    loadScript: vi.fn(async () => true),
  }
}
