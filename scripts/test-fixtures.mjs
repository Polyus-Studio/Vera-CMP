// Build the package, pack it into a tarball, then install and build each
// consumer fixture against that tarball. This validates that the published
// package's exports resolve, that importing it is SSR-safe, and that the CSS
// asset resolves — things unit tests cannot cover.
//
// Filter with FIXTURES=vite-vue,next-app (comma-separated) to run a subset.
import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()
const fixturesDir = join(root, 'fixtures')
const only = (process.env.FIXTURES ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

function run(cmd, cwd) {
  console.log(`\n$ ${cmd}\n  (cwd: ${cwd})`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

run('npm run build', root)

const packJson = execSync('npm pack --json', { cwd: root }).toString()
const tarball = resolve(root, JSON.parse(packJson)[0].filename)
console.log(`\nPacked: ${tarball}`)

const fixtures = readdirSync(fixturesDir).filter((name) =>
  existsSync(join(fixturesDir, name, 'package.json')),
)
const selected = only.length
  ? fixtures.filter((name) => only.includes(name))
  : fixtures

const failures = []
for (const name of selected) {
  const dir = join(fixturesDir, name)
  console.log(`\n=== fixture: ${name} ===`)
  try {
    run('npm install --no-audit --no-fund --no-save', dir)
    run(`npm install --no-audit --no-fund --no-save "${tarball}"`, dir)
    run('npm run build', dir)
    console.log(`\n✓ ${name} built successfully`)
  } catch {
    console.error(`\n✗ ${name} failed`)
    failures.push(name)
  }
}

if (failures.length) {
  console.error(`\nFixture failures: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('\nAll consumer fixtures built successfully.')
