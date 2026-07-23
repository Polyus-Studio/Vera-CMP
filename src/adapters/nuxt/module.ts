import {
  addImportsDir,
  addPlugin,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import type { PrivacyConsentConfig } from '../../core/types'

/** Module options mirror the library config and are read from `veraCmp`. */
export type ModuleOptions = PrivacyConsentConfig

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@polyus-studio/vera-cmp',
    configKey: 'veraCmp',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {} as ModuleOptions,
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Expose options to the client through public runtime config so they can
    // be overridden per environment.
    const runtimePublic = nuxt.options.runtimeConfig.public as Record<
      string,
      unknown
    >
    runtimePublic.veraCmp = {
      ...(runtimePublic.veraCmp as Record<string, unknown> | undefined),
      ...options,
    }

    // Client-only plugin (must not run during SSR).
    addPlugin({ src: resolver.resolve('./runtime/plugin.client'), mode: 'client' })

    // Auto-import useVeraCmp() and friends.
    addImportsDir(resolver.resolve('./runtime'))
  },
})

declare module '@nuxt/schema' {
  interface NuxtConfig {
    veraCmp?: Partial<ModuleOptions>
  }
  interface NuxtOptions {
    veraCmp?: Partial<ModuleOptions>
  }
}
