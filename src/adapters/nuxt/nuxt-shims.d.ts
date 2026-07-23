/**
 * Minimal type shims for the Nuxt virtual `#app` module so this package can be
 * type-checked and built standalone. At runtime the consumer's Nuxt provides
 * the real implementations.
 */
declare module '#app' {
  export function defineNuxtPlugin<T>(plugin: T): T
  export function useRuntimeConfig(): {
    public: Record<string, unknown>
    [key: string]: unknown
  }
}
