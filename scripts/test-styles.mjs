import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const stylesheet = readFileSync(
  new URL('../dist/vera-cmp.css', import.meta.url),
  'utf8',
)

assert.match(
  stylesheet,
  /#cc-main \.cm__btn:not\(\.cm__btn--close\),\s*#cc-main \.pm__btn\s*\{\s*width: 100%;\s*\}/,
  'Mobile action buttons must be full-width without stretching the consent modal close button.',
)

assert.doesNotMatch(
  stylesheet,
  /#cc-main \.cm__btn,\s*#cc-main \.pm__btn\s*\{\s*width: 100%;\s*\}/,
  'The consent modal close button must not be included in the full-width mobile rule.',
)

console.log('Built responsive CMP styles verified.')
