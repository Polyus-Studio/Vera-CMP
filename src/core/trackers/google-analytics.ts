import { ensureGtag, gtag } from '../gtag'
import { loadScript } from '../script-loader'

const SCRIPT_ID = 'vera-cmp-ga'

/** Load Google Analytics 4 (gtag.js) for the given measurement id. */
export function loadGoogleAnalytics(id: string): void {
  ensureGtag()
  gtag('js', new Date())
  gtag('config', id)
  void loadScript({
    id: SCRIPT_ID,
    src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`,
    async: true,
  })
}
