/**
 * True only in a real browser environment. Every side-effecting entry point
 * guards on this so the library is safe to import during SSR / prerendering
 * (Nuxt, Next.js, Vue SSR) where `window` / `document` do not exist.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}
