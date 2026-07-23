import { beforeEach, describe, expect, it } from 'vitest'
import { isScriptLoaded, loadScript, removeScript } from '../src/core/script-loader'
import { resetEnv } from './setup/reset-env'

describe('script-loader', () => {
  beforeEach(() => resetEnv())

  it('injects a script once and dedupes by id', () => {
    void loadScript({ id: 'x', src: 'https://example.com/a.js' })
    void loadScript({ id: 'x', src: 'https://example.com/a.js' })
    expect(document.querySelectorAll('script#x').length).toBe(1)
    expect(isScriptLoaded('x')).toBe(true)
  })

  it('applies attributes and flags', () => {
    void loadScript({
      id: 'y',
      src: 'https://example.com/b.js',
      attrs: { 'data-foo': 'bar' },
      defer: true,
    })
    const el = document.getElementById('y') as HTMLScriptElement
    expect(el.getAttribute('data-foo')).toBe('bar')
    expect(el.defer).toBe(true)
    expect(el.async).toBe(true)
  })

  it('removeScript removes the node and forgets the id', () => {
    void loadScript({ id: 'z', src: 'https://example.com/c.js' })
    removeScript('z')
    expect(document.getElementById('z')).toBeNull()
    expect(isScriptLoaded('z')).toBe(false)
  })
})
