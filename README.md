# @polyus-studio/vera-cmp

Centralized cookie-consent management (CMP) for 30+ sites — a typed wrapper
around [`vanilla-cookieconsent`](https://cookieconsent.orestbida.com/) v3 with
first-class adapters for **Vue/Vite**, **Nuxt**, **React** and **Next.js**
(including SSR).

- 🍪 Four categories: `necessary` (read-only), `functional`, `analytics`, `marketing`
- 🚫 No optional tracker loads before consent (opt-in / GDPR by default)
- 📊 Built-in loaders for Google Analytics, Google Tag Manager, Meta Pixel,
  Microsoft Clarity and Hotjar — each disable-able or replaceable per site
- 🟢 Google **Consent Mode** v2 (`basic` / `advanced`) and **Global Privacy Control**
- ♻️ Consent revision, revoke, and known-cookie erasure
- 🌍 English & Russian copy out of the box, deeply overridable
- 🎨 Responsive theme driven by CSS variables (light/dark)
- 🧱 ESM build, TypeScript declarations, separate CSS export
- 🛡️ Guards against double initialization and duplicate script injection

No domains, company names or tracker ids are hard-coded — everything is passed
through config.

---

## Installation

The package is published to **GitHub Packages**. Tell npm where to find the
`@polyus-studio` scope by adding an `.npmrc` to your project:

```ini
# .npmrc
@polyus-studio:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` must be a token with `read:packages`. Then:

```bash
npm install @polyus-studio/vera-cmp
```

## Quick start (framework-agnostic)

```ts
import {
  initPrivacyConsent,
  openPrivacyPreferences,
  resetPrivacyConsent,
} from '@polyus-studio/vera-cmp'
import '@polyus-studio/vera-cmp/style.css'

initPrivacyConsent({
  siteName: 'Acme',
  language: 'en',
  revision: 1,
  links: {
    privacyPolicy: '/privacy',
    cookiePolicy: '/cookies',
    terms: '/terms',
  },
  trackers: {
    googleAnalytics: { id: 'G-XXXXXXX' },
    metaPixel: { id: '000000000000000' },
  },
})

// Re-open the preferences dialog (e.g. from a "Cookie settings" footer link):
openPrivacyPreferences()

// Revoke consent, erase cookies and reload:
resetPrivacyConsent()
```

The three functions are the entire public API:

| Function | Description |
| --- | --- |
| `initPrivacyConsent(config)` | Initialize the banner. Returns a controller with `{ ready, openPreferences, reset, acceptCategory, getConsent }`. SSR-safe (no-op on the server) and idempotent. |
| `openPrivacyPreferences()` | Open the preferences modal. |
| `resetPrivacyConsent(options?)` | Revoke consent → deny Consent Mode, erase known cookies, tear down, then reload (default) or re-run the saved config (`{ reload: false }`). |

---

## Framework integration

### Vite + Vue

```ts
// main.ts
import { createApp } from 'vue'
import { createPrivacyConsent } from '@polyus-studio/vera-cmp/vue'
import '@polyus-studio/vera-cmp/style.css'
import App from './App.vue'

createApp(App)
  .use(
    createPrivacyConsent({
      siteName: 'Acme',
      links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
      trackers: { googleAnalytics: { id: 'G-XXXXXXX' } },
    }),
  )
  .mount('#app')
```

```vue
<script setup lang="ts">
import { usePrivacyConsent } from '@polyus-studio/vera-cmp/vue'
const { openPreferences } = usePrivacyConsent()
</script>

<template>
  <button @click="openPreferences()">Cookie settings</button>
</template>
```

Initialization is client-only, so it is safe with Vite SSR.

### Nuxt

Register the module and pass options under the `veraCmp` key:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@polyus-studio/vera-cmp/nuxt'],
  css: ['@polyus-studio/vera-cmp/style.css'],
  veraCmp: {
    siteName: 'Acme',
    language: 'en',
    links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
    trackers: { googleTagManager: { id: 'GTM-XXXXXXX' } },
  },
})
```

The module installs a **client-only** plugin (no SSR execution) and auto-imports
the `useVeraCmp()` composable:

```vue
<script setup lang="ts">
const { open, reset } = useVeraCmp()
</script>

<template>
  <button @click="open()">Cookie settings</button>
</template>
```

Options are exposed through `runtimeConfig.public.veraCmp`, so they can be
overridden per environment.

### Next.js (App Router)

The `/next` entry is a client component (`"use client"`), so it can be dropped
straight into a server-rendered layout:

```tsx
// app/layout.tsx
import { PrivacyConsentProvider } from '@polyus-studio/vera-cmp/next'
import '@polyus-studio/vera-cmp/style.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrivacyConsentProvider
          config={{
            siteName: 'Acme',
            links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
            trackers: { googleAnalytics: { id: 'G-XXXXXXX' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
```

```tsx
'use client'
import { usePrivacyConsent } from '@polyus-studio/vera-cmp/next'

export function CookieSettingsButton() {
  const { openPreferences } = usePrivacyConsent()
  return <button onClick={() => openPreferences()}>Cookie settings</button>
}
```

For plain React (CRA / Vite React) import from `@polyus-studio/vera-cmp/react`
— the API is identical.

---

## Configuration reference

```ts
interface PrivacyConsentConfig {
  siteName: string
  language?: 'en' | 'ru'            // default 'en'
  autoDetectLanguage?: boolean      // detect from the browser
  revision?: number                 // bump to force re-consent
  links: {
    privacyPolicy: string
    cookiePolicy: string
    terms?: string
  }
  cookie?: {                        // consent cookie storage
    name?: string                   // default 'vera_cmp_consent'
    domain?: string
    path?: string
    sameSite?: 'Lax' | 'Strict' | 'None'
    expiresAfterDays?: number       // default 182
  }
  manageScriptTags?: boolean        // legacy <script type="text/plain"> mode, default false
  allowDirectGaWithGtm?: boolean    // silence the GA+GTM warning, default false
  consentMode?: {
    enabled?: boolean               // default true
    mode?: 'basic' | 'advanced'     // default 'basic'
  }
  gpc?: {
    enabled?: boolean               // default true
    deniedCategories?: Category[]   // default ['marketing']
    lockDeniedCategories?: boolean  // default true
    showHonoredNotice?: boolean     // default true
  }
  trackers?: {
    googleAnalytics?: TrackerSettings   // → analytics
    googleTagManager?: TrackerSettings  // → analytics (consent-aware container)
    metaPixel?: TrackerSettings         // → marketing
    clarity?: TrackerSettings           // → analytics
    hotjar?: TrackerSettings & { version?: number }  // → analytics
  }
  guiOptions?: GuiOptions           // passed to vanilla-cookieconsent
  onFirstConsent?, onConsent?, onChange?   // lifecycle hooks
  translations?: { en?: DeepPartial<Translation>; ru?: DeepPartial<Translation> }
}

interface TrackerSettings {
  id?: string
  enabled?: boolean                 // default true when an id is set
  category?: Category               // override the gating category
  loader?: (ctx) => void | Promise<void>   // hybrid: custom loader
}
```

### Trackers (hybrid loading)

By default each configured tracker is loaded by a built-in loader **only after
the relevant category is accepted**, and its script is injected exactly once
(duplicate injections are guarded against). Per tracker you can:

- **disable** the built-in loader: `googleAnalytics: { enabled: false }`
- **replace** it with your own: `metaPixel: { id: '…', loader: (ctx) => { /* … */ } }`

```ts
trackers: {
  googleAnalytics: { id: 'G-XXXXXXX' },
  hotjar: { id: '1234567', version: 6 },
  clarity: { id: 'abcdefghij' },
  // Load your own script instead of the built-in one:
  metaPixel: {
    id: '000000000000000',
    loader: () => {/* custom injection */},
  },
}
```

### Google Consent Mode

- **`basic`** (default) — Google tags are **not loaded or contacted** before
  consent. On acceptance the tag is loaded and `consent` is updated.
- **`advanced`** — the Google tag loads immediately with all signals denied and
  uses `wait_for_update` to send cookieless pings until the user decides.

```ts
consentMode: { mode: 'advanced' }
```

### Google Tag Manager

GTM is treated as a **consent-aware container**, not a plain tracker: tags inside
it are expected to respect Consent Mode / their own trigger conditions. If you
enable **both** direct Google Analytics and GTM, a warning is emitted (GA is
usually deployed *through* GTM, so running both double-counts hits). Set
`allowDirectGaWithGtm: true` if this is intentional.

### Global Privacy Control (GPC)

When the browser sends a GPC signal, the categories in `gpc.deniedCategories`
(default `['marketing']`) are turned off — **even if the stored consent
previously accepted them** (an active GPC signal overrides old consent). The
banner still shows so the visitor can manage the remaining categories; denied
categories are locked and a notice explains that GPC was honoured.

### Revoke & revision

- Bump `revision` after a policy change to invalidate stored consent and re-prompt.
- `resetPrivacyConsent()` denies Consent Mode, erases known first-party cookies,
  tears the plugin down and reloads (pass `{ reload: false }` to re-run in place).

---

## Theming

Import the stylesheet once and override any `--vera-cmp-*` custom property:

```css
:root {
  --vera-cmp-accent: #e2231a;
  --vera-cmp-accent-hover: #b91b14;
  --vera-cmp-radius: 8px;
  --vera-cmp-font-family: 'Inter', system-ui, sans-serif;
}
```

Light and dark themes are handled automatically via `prefers-color-scheme`;
force one with `<html data-vera-cmp-theme="dark">`.

---

## Development

```bash
npm install
npm run typecheck     # tsc --noEmit
npm run test:run      # vitest
npm run build         # dist/*.js, *.d.ts and dist/vera-cmp.css
npm run test:fixtures # build the Vite/Next/Nuxt consumer fixtures against the packed package
```

CI runs typecheck + unit tests + build, then builds the consumer fixtures.
Publishing to GitHub Packages is a manual `workflow_dispatch` (see
`.github/workflows/publish.yml`).

## License

MIT © Polyus Studio
