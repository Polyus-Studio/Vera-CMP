import { defineConfig, type Options } from 'tsup'

/** Everything that must NOT be bundled into the output. */
const external: (string | RegExp)[] = [
  'vanilla-cookieconsent',
  'vue',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'next',
  '@nuxt/kit',
  '@nuxt/schema',
  'nuxt',
  /^nuxt\//,
  /^#/, // Nuxt virtual imports (#app, #imports, ...)
]

const shared: Options = {
  format: ['esm'],
  target: 'es2020',
  platform: 'browser',
  dts: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  external,
  tsconfig: 'tsconfig.build.json',
}

export default defineConfig([
  // Core + framework-agnostic + Vue + Nuxt module and its runtime files.
  // Nuxt runtime files are declared as separate entries so they are preserved
  // as individual modules in dist/nuxt/runtime and can be resolved at runtime
  // by the Nuxt module through createResolver().
  {
    ...shared,
    clean: false,
    entry: {
      index: 'src/index.ts',
      vue: 'src/adapters/vue.ts',
      'nuxt/module': 'src/adapters/nuxt/module.ts',
      'nuxt/runtime/plugin.client': 'src/adapters/nuxt/runtime/plugin.client.ts',
      'nuxt/runtime/composables': 'src/adapters/nuxt/runtime/composables.ts',
    },
  },
  // React + Next.js entries. They are kept self-contained (no shared chunk)
  // and the "use client" directive is prepended by scripts/add-use-client.mjs
  // after the build — esbuild strips module-level directives while bundling.
  {
    ...shared,
    clean: false,
    splitting: false,
    entry: {
      react: 'src/adapters/react.tsx',
      next: 'src/adapters/next.tsx',
    },
  },
])
