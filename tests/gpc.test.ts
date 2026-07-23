import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnv } from './setup/reset-env'
import { setAccepted } from './setup/cookieconsent.mock'

vi.mock('vanilla-cookieconsent', async () => {
  const { createCookieConsentMock } = await import('./setup/cookieconsent.mock')
  return createCookieConsentMock()
})

import * as CC from 'vanilla-cookieconsent'
import { isGpcActive } from '../src/core/gpc'
import { initPrivacyConsent } from '../src/core/index'
import type { PrivacyConsentConfig } from '../src/core/types'

function setGpc(value: boolean | undefined): void {
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    value,
    configurable: true,
  })
}

const config: PrivacyConsentConfig = {
  siteName: 'Acme',
  links: { privacyPolicy: '/p', cookiePolicy: '/c' },
  trackers: { googleAnalytics: { id: 'G-1' }, metaPixel: { id: '123' } },
}

describe('gpc', () => {
  beforeEach(() => resetEnv())
  afterEach(() => setGpc(undefined))

  it('reflects the navigator signal and config toggle', () => {
    setGpc(true)
    expect(isGpcActive()).toBe(true)
    expect(isGpcActive({ enabled: false })).toBe(false)
    setGpc(false)
    expect(isGpcActive()).toBe(false)
  })

  it('overrides stored consent that conflicts with GPC', async () => {
    setGpc(true)
    setAccepted(['necessary', 'analytics', 'marketing'])

    const controller = initPrivacyConsent(config)
    await controller.ready

    const calls = vi.mocked(CC.acceptCategory).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[calls.length - 1]?.[0]).toEqual(['necessary', 'analytics'])
  })

  it('does not override when there is no conflict', async () => {
    setGpc(true)
    setAccepted(['necessary', 'analytics'])

    const controller = initPrivacyConsent(config)
    await controller.ready

    expect(vi.mocked(CC.acceptCategory)).not.toHaveBeenCalled()
  })
})
