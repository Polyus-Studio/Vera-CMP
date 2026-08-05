import { createApp, h } from 'vue'
import { createPrivacyConsent } from '@polyus-studio/vera-cmp/vue'
import '@polyus-studio/vera-cmp/style.css'

const app = createApp({ render: () => h('div', 'Vera CMP fixture') })

app.use(
  createPrivacyConsent({
    siteName: 'Vite Fixture',
    language: 'en',
    links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
    cookie: { name: 'vera_cmp_vite_fixture_consent' },
    trackers: {
      googleAnalytics: { id: 'G-TEST' },
    },
  }),
)

app.mount('#app')
