import { isBrowser } from './ssr'

/** Names of all cookies readable from `document.cookie`. */
export function getAllCookieNames(): string[] {
  if (!isBrowser()) return []
  return document.cookie
    .split(';')
    .map((chunk) => chunk.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name))
}

function matches(name: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string' ? name === pattern : pattern.test(name)
}

/** Domain scopes a cookie might have been set on, most-specific first. */
function domainScopes(explicit?: string): (string | undefined)[] {
  if (explicit) return [explicit, undefined]
  if (!isBrowser()) return [undefined]

  const host = window.location.hostname
  const scopes = new Set<string | undefined>([undefined, host, `.${host}`])
  const parts = host.split('.')
  // Registrable parent domain, e.g. `.example.com` for `www.example.com`.
  if (parts.length > 2) {
    scopes.add(`.${parts.slice(-2).join('.')}`)
  }
  return [...scopes]
}

/**
 * Best-effort deletion of first-party cookies matching the given patterns
 * across the likely path/domain scopes. HttpOnly and cross-site cookies
 * cannot be removed from JavaScript — that is an accepted limitation.
 */
export function eraseCookies(
  patterns: (string | RegExp)[],
  explicitDomain?: string,
): void {
  if (!isBrowser() || patterns.length === 0) return

  const names = getAllCookieNames().filter((name) =>
    patterns.some((pattern) => matches(name, pattern)),
  )
  const paths = ['/', window.location.pathname]

  for (const name of names) {
    for (const domain of domainScopes(explicitDomain)) {
      for (const path of paths) {
        let cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
        if (domain) cookie += `; domain=${domain}`
        document.cookie = cookie
      }
    }
  }
}
