import { loadScript } from '../script-loader'

const SCRIPT_ID = 'vera-cmp-hotjar'
const DEFAULT_VERSION = 6

/** Load Hotjar for the given site id (and optional snippet version). */
export function loadHotjar(id: string, version: number = DEFAULT_VERSION): void {
  const w = window
  const hjid = Number(id)
  if (typeof w.hj !== 'function') {
    const hj: any = function () {
      // eslint-disable-next-line prefer-rest-params
      ;(hj.q = hj.q || []).push(arguments)
    }
    w.hj = hj
  }
  w._hjSettings = { hjid, hjsv: version }
  void loadScript({
    id: SCRIPT_ID,
    src: `https://static.hotjar.com/c/hotjar-${hjid}.js?sv=${version}`,
    async: true,
  })
}
