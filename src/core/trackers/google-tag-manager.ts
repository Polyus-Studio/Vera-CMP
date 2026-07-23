import { ensureGtag } from '../gtag'
import { loadScript } from '../script-loader'

const SCRIPT_ID = 'vera-cmp-gtm'

/**
 * Load a Google Tag Manager container. GTM is a *consent-aware container*:
 * tags inside it are expected to respect Google Consent Mode / their own
 * trigger conditions rather than being gated by this loader alone.
 */
export function loadGoogleTagManager(id: string): void {
  ensureGtag()
  window.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  void loadScript({
    id: SCRIPT_ID,
    src: `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`,
    async: true,
  })
}
