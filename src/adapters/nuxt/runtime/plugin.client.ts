import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { initPrivacyConsent } from '../../../core/index'
import type { PrivacyConsentConfig } from '../../../core/types'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public.veraCmp as
    | PrivacyConsentConfig
    | undefined
  if (config?.siteName) {
    initPrivacyConsent(config)
  }
})
