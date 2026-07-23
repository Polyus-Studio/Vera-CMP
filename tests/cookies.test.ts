import { beforeEach, describe, expect, it } from 'vitest'
import { eraseCookies, getAllCookieNames } from '../src/core/cookies'
import { resetEnv } from './setup/reset-env'

function clearAllCookies(): void {
  for (const name of getAllCookieNames()) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}

describe('cookies', () => {
  beforeEach(() => {
    resetEnv()
    clearAllCookies()
  })

  it('lists cookie names', () => {
    document.cookie = 'foo=1'
    document.cookie = 'bar=2'
    expect(getAllCookieNames().sort()).toEqual(['bar', 'foo'])
  })

  it('erases matching cookies by string and regexp', () => {
    document.cookie = '_ga=abc'
    document.cookie = '_ga_XYZ=def'
    document.cookie = 'keep=1'

    eraseCookies([/^_ga/])

    const names = getAllCookieNames()
    expect(names).not.toContain('_ga')
    expect(names).not.toContain('_ga_XYZ')
    expect(names).toContain('keep')
  })

  it('does nothing when there are no matches', () => {
    document.cookie = 'keep=1'
    eraseCookies(['_missing'])
    expect(getAllCookieNames()).toContain('keep')
  })
})
