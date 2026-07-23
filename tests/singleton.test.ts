import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnv } from './setup/reset-env'

vi.mock('vanilla-cookieconsent', async () => {
  const { createCookieConsentMock } = await import('./setup/cookieconsent.mock')
  return createCookieConsentMock()
})

import * as CC from 'vanilla-cookieconsent'
import { initPrivacyConsent } from '../src/core/index'
import type { PrivacyConsentConfig } from '../src/core/types'

const config: PrivacyConsentConfig = {
  siteName: 'Acme',
  links: { privacyPolicy: '/p', cookiePolicy: '/c' },
}

describe('re-init guard', () => {
  beforeEach(() => resetEnv())

  it('initializes once and returns the same controller on re-init', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = initPrivacyConsent(config)
    const second = initPrivacyConsent(config)

    expect(first).toBe(second)
    expect(vi.mocked(CC.run)).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
