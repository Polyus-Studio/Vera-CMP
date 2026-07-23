export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['@polyus-studio/vera-cmp/nuxt'],
  css: ['@polyus-studio/vera-cmp/style.css'],
  veraCmp: {
    siteName: 'Nuxt Fixture',
    language: 'en',
    links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
    trackers: {
      clarity: { id: 'test0000' },
    },
  },
})
