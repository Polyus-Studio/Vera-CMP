import { loadScript } from '../script-loader'

const SCRIPT_ID = 'vera-cmp-meta-pixel'

/** Load the Meta (Facebook) Pixel and track the initial PageView. */
export function loadMetaPixel(id: string): void {
  const w = window
  if (typeof w.fbq !== 'function') {
    const fbq: any = function () {
      // eslint-disable-next-line prefer-rest-params
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments)
    }
    w.fbq = fbq
    if (!w._fbq) w._fbq = fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
  }

  void loadScript({
    id: SCRIPT_ID,
    src: 'https://connect.facebook.net/en_US/fbevents.js',
    async: true,
  })

  w.fbq!('init', id)
  w.fbq!('track', 'PageView')
}
