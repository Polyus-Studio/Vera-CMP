import { beforeEach, describe, expect, it } from 'vitest'
import {
  denyConsentMode,
  initConsentMode,
  updateConsentMode,
} from '../src/core/consent-mode'
import { dataLayerEntries, resetEnv } from './setup/reset-env'

function findConsent(kind: 'default' | 'update'): unknown[] | undefined {
  return dataLayerEntries().find((e) => e[0] === 'consent' && e[1] === kind)
}

describe('consent-mode', () => {
  beforeEach(() => resetEnv())

  it('basic mode sets denied defaults without wait_for_update', () => {
    initConsentMode('basic')
    const payload = findConsent('default')?.[2] as Record<string, unknown>
    expect(payload.analytics_storage).toBe('denied')
    expect(payload.ad_storage).toBe('denied')
    expect(payload.security_storage).toBe('granted')
    expect(payload.wait_for_update).toBeUndefined()
  })

  it('advanced mode adds wait_for_update', () => {
    initConsentMode('advanced')
    const payload = findConsent('default')?.[2] as Record<string, unknown>
    expect(payload.wait_for_update).toBe(500)
  })

  it('only configures the default once', () => {
    initConsentMode('basic')
    initConsentMode('advanced')
    const defaults = dataLayerEntries().filter(
      (e) => e[0] === 'consent' && e[1] === 'default',
    )
    expect(defaults.length).toBe(1)
  })

  it('grants only the accepted categories on update', () => {
    initConsentMode('basic')
    updateConsentMode(['analytics'])
    const payload = findConsent('update')?.[2] as Record<string, string>
    expect(payload.analytics_storage).toBe('granted')
    expect(payload.ad_storage).toBe('denied')
    expect(payload.ad_user_data).toBe('denied')
  })

  it('denies everything on revoke', () => {
    initConsentMode('basic')
    updateConsentMode(['analytics', 'marketing'])
    denyConsentMode()
    const updates = dataLayerEntries().filter(
      (e) => e[0] === 'consent' && e[1] === 'update',
    )
    const payload = updates[updates.length - 1]?.[2] as Record<string, string>
    expect(payload.analytics_storage).toBe('denied')
    expect(payload.ad_storage).toBe('denied')
    expect(payload.security_storage).toBe('granted')
  })
})
