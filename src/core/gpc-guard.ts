import * as CookieConsent from 'vanilla-cookieconsent'
import { GPC_OPT_IN_DATA_KEY } from './constants'
import { isBrowser } from './ssr'
import type { Category } from './types'

/** Attribute that replaces `data-category` on script tags held back by GPC. */
export const GPC_HELD_SCRIPT_ATTR = 'data-vera-cmp-gpc-held'

/** Clicks that save the visitor's own toggle choices. */
const EXPLICIT_SAVE_SELECTOR =
  '#cc-main .pm [data-role="save"], [data-cc="accept-custom"]'

export interface GpcGuardOptions {
  /** Whether a GPC signal is currently honoured. */
  active: boolean
  /** Categories GPC denies. */
  deniedCategories: Category[]
  /** `gpc.lockDeniedCategories` — when true nothing can enable them. */
  locked: boolean
  /** Whether `<script type="text/plain" data-category>` tags are managed. */
  manageScriptTags: boolean
}

export interface GpcGuard {
  /** True while {@link GpcGuard.enforce} re-persists consent. */
  readonly enforcing: boolean
  /**
   * Re-assert GPC after a consent action. Every denied category that is
   * accepted without being allowed is revoked again and the explicit opt-in
   * flag is re-persisted. Returns the categories that had to be revoked.
   *
   * @param newlyAccepted categories this action changed (`'all'` for the
   * first consent). A denied category is only allowed to *become* accepted
   * through an explicit "Save preferences" with `locked: false`; a category
   * that was already accepted stays only if its opt-in flag is stored.
   */
  enforce: (newlyAccepted: readonly string[] | 'all') => Category[]
  /** Accepted categories minus every denied category that is not allowed. */
  filter: (accepted: Category[]) => Category[]
  /** Denied categories a programmatic `acceptCategory()` must exclude. */
  exclusions: () => Category[]
  /**
   * Neutralise script tags of denied categories so vanilla-cookieconsent
   * never collects them. Must run before `CookieConsent.run()`.
   */
  holdScriptTags: () => void
  /** Run held script tags whose category is now (explicitly) accepted. */
  releaseScriptTags: (accepted: Category[]) => void
  /** Show the denied toggles off and disabled (no-op unless locked). */
  lockToggles: (root?: ParentNode | null) => void
  /** Start tracking explicit saves (and block clicks on locked toggles). */
  attach: () => void
  detach: () => void
}

function currentAccepted(): Category[] {
  return CookieConsent.getUserPreferences().acceptedCategories as Category[]
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item))
}

/**
 * Re-create a held script so the browser executes it, mirroring how
 * vanilla-cookieconsent activates `manageScriptTags` scripts (`data-src`,
 * `data-type`). Scripts with a source are run in order: `done` fires once
 * they load (or fail).
 */
function activateScript(script: HTMLScriptElement, done: () => void): void {
  const dataType = script.getAttribute('data-type')
  const dataSrc = script.getAttribute('data-src')
  const fresh = document.createElement('script')
  fresh.textContent = script.innerHTML
  for (const { name, value } of Array.from(script.attributes)) {
    if (
      name === 'type' ||
      name === 'data-type' ||
      name === 'data-src' ||
      name === GPC_HELD_SCRIPT_ATTR
    ) {
      continue
    }
    fresh.setAttribute(name, value)
  }
  if (dataType) fresh.type = dataType
  if (dataSrc) fresh.src = dataSrc

  const src = dataSrc ?? script.getAttribute('src')
  const waitForLoad =
    Boolean(src) &&
    (!dataType || dataType === 'text/javascript' || dataType === 'module')
  if (waitForLoad) fresh.onload = fresh.onerror = () => done()
  script.replaceWith(fresh)
  if (!waitForLoad) done()
}

/**
 * Enforces Global Privacy Control on top of vanilla-cookieconsent.
 *
 * vanilla-cookieconsent always accepts `readOnly` categories, so GPC-denied
 * categories are never marked read-only. Instead every consent callback
 * re-asserts the signal (vanilla-cookieconsent's own buttons call its
 * internal `acceptCategory`, which cannot be intercepted), the preferences
 * modal disables the denied toggles, and their script tags are held back so
 * they can never run on a transient acceptance.
 */
export function createGpcGuard(options: GpcGuardOptions): GpcGuard {
  const active = options.active
  const locked = options.locked
  // `necessary` is read-only and cannot be denied.
  const denied: Category[] = options.active
    ? options.deniedCategories.filter((category) => category !== 'necessary')
    : []

  let enforcing = false
  let explicitSave = false
  // Denied categories the visitor explicitly opted into (locked: false only).
  let optIn: Category[] = []

  const isDenied = (value: string | null | undefined): value is Category =>
    typeof value === 'string' && (denied as string[]).includes(value)

  const readOptIn = (): Category[] => {
    let data: unknown
    try {
      data = CookieConsent.getCookie('data')
    } catch {
      return []
    }
    const value =
      data && typeof data === 'object'
        ? (data as Record<string, unknown>)[GPC_OPT_IN_DATA_KEY]
        : undefined
    return Array.isArray(value) ? value.filter(isDenied) : []
  }

  const writeOptIn = (categories: Category[]): void => {
    // Never create a consent cookie before the visitor has decided.
    if (!CookieConsent.validConsent()) return
    CookieConsent.setCookieData({
      value: { [GPC_OPT_IN_DATA_KEY]: categories },
      mode: 'update',
    })
  }

  const filter = (accepted: Category[]): Category[] =>
    accepted.filter(
      (category) =>
        !denied.includes(category) || (!locked && optIn.includes(category)),
    )

  const isDeniedToggle = (target: Element): boolean => {
    if (!(target instanceof HTMLInputElement)) return false
    if (!target.classList.contains('section__toggle')) return false
    if (!target.closest('#cc-main')) return false
    // Service toggles carry their category; category toggles carry it as value.
    const category = target.hasAttribute('data-category')
      ? target.getAttribute('data-category')
      : target.value
    return isDenied(category)
  }

  const onClick = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return

    if (locked && isDeniedToggle(target)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (target.closest(EXPLICIT_SAVE_SELECTOR)) {
      // vanilla-cookieconsent handles the click synchronously after this
      // capture listener; the flag only lives for this event dispatch.
      explicitSave = true
      setTimeout(() => {
        explicitSave = false
      }, 0)
    }
  }

  return {
    get enforcing() {
      return enforcing
    },

    enforce(newlyAccepted) {
      if (denied.length === 0) return []

      const accepted = currentAccepted()
      const stored = readOptIn()
      const saved = explicitSave
      explicitSave = false

      const isNew = (category: Category): boolean =>
        newlyAccepted === 'all' || newlyAccepted.includes(category)
      const allowed = (category: Category): boolean =>
        !locked && (isNew(category) ? saved : stored.includes(category))

      const blocked = denied.filter(
        (category) => accepted.includes(category) && !allowed(category),
      )

      let finalAccepted = accepted
      if (blocked.length > 0) {
        enforcing = true
        try {
          CookieConsent.acceptCategory(
            accepted.filter((category) => !blocked.includes(category)),
            blocked,
          )
        } finally {
          enforcing = false
        }
        finalAccepted = currentAccepted()
      }

      optIn = locked
        ? []
        : denied.filter((category) => finalAccepted.includes(category))
      if (!sameMembers(optIn, stored)) writeOptIn(optIn)

      return blocked
    },

    filter(accepted) {
      return denied.length === 0 ? accepted : filter(accepted)
    },

    exclusions() {
      if (denied.length === 0) return []
      if (locked) return denied.slice()
      const accepted = currentAccepted()
      return denied.filter(
        (category) => !(optIn.includes(category) && accepted.includes(category)),
      )
    },

    holdScriptTags() {
      if (!isBrowser() || !options.manageScriptTags) return

      // A previous instance (re-init after resetPrivacyConsent) may have held
      // tags that this configuration no longer denies: hand them back.
      const held = document.querySelectorAll<HTMLScriptElement>(
        `script[${GPC_HELD_SCRIPT_ATTR}]`,
      )
      for (const script of Array.from(held)) {
        const category = script.getAttribute(GPC_HELD_SCRIPT_ATTR)
        if (category === null || isDenied(category)) continue
        script.setAttribute('data-category', category)
        script.removeAttribute(GPC_HELD_SCRIPT_ATTR)
      }

      if (denied.length === 0) return
      const scripts = document.querySelectorAll<HTMLScriptElement>(
        'script[data-category]',
      )
      for (const script of Array.from(scripts)) {
        const category = script.getAttribute('data-category') ?? ''
        const service = script.getAttribute('data-service') ?? ''
        // `!category` / `!service` scripts run on rejection, not on consent.
        if (category.startsWith('!') || service.startsWith('!')) continue
        if (!isDenied(category)) continue
        script.setAttribute(GPC_HELD_SCRIPT_ATTR, category)
        script.removeAttribute('data-category')
      }
    },

    releaseScriptTags(accepted) {
      if (!isBrowser() || !options.manageScriptTags || denied.length === 0) {
        return
      }
      const pending = Array.from(
        document.querySelectorAll<HTMLScriptElement>(
          `script[${GPC_HELD_SCRIPT_ATTR}]`,
        ),
      ).filter((script) => {
        const category = script.getAttribute(GPC_HELD_SCRIPT_ATTR)
        return isDenied(category) && filter(accepted).includes(category)
      })
      // Claim them now so a second release cannot run them twice.
      for (const script of pending) script.removeAttribute(GPC_HELD_SCRIPT_ATTR)

      const runFrom = (index: number): void => {
        const script = pending[index]
        if (script) activateScript(script, () => runFrom(index + 1))
      }
      runFrom(0)
    },

    lockToggles(root) {
      if (!isBrowser() || !locked || denied.length === 0) return
      const scope = root ?? document.getElementById('cc-main')
      if (!scope) return
      for (const category of denied) {
        const inputs = scope.querySelectorAll<HTMLInputElement>(
          `input.section__toggle[value="${category}"]:not([data-category]),` +
            ` input.section__toggle[data-category="${category}"]`,
        )
        for (const input of Array.from(inputs)) {
          input.checked = false
          input.disabled = true
        }
      }
    },

    attach() {
      if (!isBrowser() || !active || denied.length === 0) return
      document.addEventListener('click', onClick, true)
    },

    detach() {
      if (!isBrowser()) return
      document.removeEventListener('click', onClick, true)
    },
  }
}
