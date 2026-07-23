import { loadScript } from '../script-loader'

const SCRIPT_ID = 'vera-cmp-clarity'

/** Load Microsoft Clarity for the given project id. */
export function loadMicrosoftClarity(id: string): void {
  const w = window
  if (typeof w.clarity !== 'function') {
    const clarity: any = function () {
      // eslint-disable-next-line prefer-rest-params
      ;(clarity.q = clarity.q || []).push(arguments)
    }
    w.clarity = clarity
  }
  void loadScript({
    id: SCRIPT_ID,
    src: `https://www.clarity.ms/tag/${encodeURIComponent(id)}`,
    async: true,
  })
}
