import type { ReactNode } from 'react'
import { PrivacyConsentProvider } from '@polyus-studio/vera-cmp/next'
import '@polyus-studio/vera-cmp/style.css'

export const metadata = { title: 'Vera CMP — Next fixture' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrivacyConsentProvider
          config={{
            siteName: 'Next Fixture',
            language: 'en',
            links: { privacyPolicy: '/privacy', cookiePolicy: '/cookies' },
            trackers: { googleTagManager: { id: 'GTM-TEST' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
