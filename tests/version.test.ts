import { describe, expect, it } from 'vitest'
import pkg from '../package.json'
import { VERSION } from '../src/core/constants'

describe('VERSION', () => {
  it('matches the package.json version', () => {
    expect(VERSION).toBe(pkg.version)
  })
})
