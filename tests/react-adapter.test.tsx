import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnv } from './setup/reset-env'

vi.mock('vanilla-cookieconsent', async () => {
  const { createCookieConsentMock } = await import('./setup/cookieconsent.mock')
  return createCookieConsentMock()
})

import * as CC from 'vanilla-cookieconsent'
import {
  PrivacyConsentProvider,
  usePrivacyConsent,
} from '../src/adapters/react'
import type { PrivacyConsentConfig } from '../src/core/types'

const config: PrivacyConsentConfig = {
  siteName: 'Acme',
  links: { privacyPolicy: '/p', cookiePolicy: '/c' },
}

function OpenButton() {
  const { openPreferences } = usePrivacyConsent()
  return <button onClick={() => openPreferences()}>open</button>
}

describe('react adapter', () => {
  beforeEach(() => {
    cleanup()
    resetEnv()
  })

  it('initializes once on mount', () => {
    render(<PrivacyConsentProvider config={config} />)
    expect(vi.mocked(CC.run)).toHaveBeenCalledTimes(1)
  })

  it('usePrivacyConsent opens the preferences modal', () => {
    render(
      <PrivacyConsentProvider config={config}>
        <OpenButton />
      </PrivacyConsentProvider>,
    )
    fireEvent.click(screen.getByText('open'))
    expect(vi.mocked(CC.showPreferences)).toHaveBeenCalled()
  })
})
