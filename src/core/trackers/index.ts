export { loadGoogleAnalytics } from './google-analytics'
export { loadGoogleTagManager } from './google-tag-manager'
export { loadMetaPixel } from './meta-pixel'
export { loadMicrosoftClarity } from './microsoft-clarity'
export { loadHotjar } from './hotjar'
export {
  resolveTrackers,
  warnOnGaGtmConflict,
  loadEagerTrackers,
  applyConsent,
  eraseAllTrackers,
} from './registry'
