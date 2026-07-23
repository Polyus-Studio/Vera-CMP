import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataLayerEntries, resetEnv } from './setup/reset-env'

vi.mock('vanilla-cookieconsent', async () => {
  const { createCookieConsentMock } = await import('./setup/cookieconsent.mock')
  return createCookieConsentMock()
})

import * as CC from 'vanilla-cookieconsent'
import { initPrivacyConsent, resetPrivacyConsent } from '../src/core/index'
import type { PrivacyConsentConfig } from '../src/core/types'

const config: PrivacyConsentConfig = {
  siteName: 'Acme',
  links: { privacyPolicy: '/p', cookiePolicy: '/c' },
  trackers: { metaPixel: { id: '123' } },
}

describe('reset / revoke', () => {
  beforeEach(() => resetEnv())

  it('denies consent mode, erases cookies, resets and re-runs (reload:false)', async () => {
    document.cookie = '_fbp=abc'
    const controller = initPrivacyConsent(config)
    await controller.ready
    vi.mocked(CC.run).mockClear()

    await resetPrivacyConsent({ reload: false })

    expect(vi.mocked(CC.reset)).toHaveBeenCalledWith(true)

    const updates = dataLayerEntries().filter(
      (e) => e[0] === 'consent' && e[1] === 'update',
    )
    const denied = updates[updates.length - 1]?.[2] as Record<string, string>
    expect(denied.ad_storage).toBe('denied')
    expect(denied.analytics_storage).toBe('denied')

    expect(document.cookie).not.toContain('_fbp')
    expect(vi.mocked(CC.run)).toHaveBeenCalledTimes(1)
  })
})
