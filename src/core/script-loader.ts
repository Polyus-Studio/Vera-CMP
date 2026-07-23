import { getRegistry } from './singleton'
import { isBrowser } from './ssr'

export interface LoadScriptOptions {
  /** Unique id — used as the `<script id>` and dedupe key. */
  id: string
  src: string
  /** @default true */
  async?: boolean
  /** @default false */
  defer?: boolean
  /** Extra attributes to set on the tag. */
  attrs?: Record<string, string>
}

/** Whether a script with this id is already present / loaded. */
export function isScriptLoaded(id: string): boolean {
  if (!isBrowser()) return false
  return getRegistry().scripts.has(id) || document.getElementById(id) !== null
}

/** Mark an id as loaded without injecting a tag (e.g. inline snippets). */
export function markScriptLoaded(id: string): boolean {
  if (!isBrowser()) return false
  const registry = getRegistry()
  if (registry.scripts.has(id)) return true
  registry.scripts.add(id)
  return false
}

/**
 * Inject an external script exactly once. Concurrent calls and repeated
 * initializations are deduped via the id (registry + existing DOM node).
 */
export function loadScript(options: LoadScriptOptions): Promise<boolean> {
  if (!isBrowser()) return Promise.resolve(false)

  const { id, src, async = true, defer = false, attrs = {} } = options
  const registry = getRegistry()

  if (isScriptLoaded(id)) return Promise.resolve(true)

  return new Promise<boolean>((resolve) => {
    const el = document.createElement('script')
    el.id = id
    el.src = src
    el.async = async
    if (defer) el.defer = true
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value)
    }
    el.addEventListener('load', () => {
      registry.scripts.add(id)
      resolve(true)
    })
    el.addEventListener('error', () => {
      el.remove()
      resolve(false)
    })
    // Appending synchronously (with the id set) makes concurrent callers
    // find the node via getElementById and skip a second injection.
    ;(document.head || document.documentElement).appendChild(el)
  })
}

/** Remove a previously injected script and forget its id. */
export function removeScript(id: string): void {
  if (!isBrowser()) return
  getRegistry().scripts.delete(id)
  document.getElementById(id)?.remove()
}
