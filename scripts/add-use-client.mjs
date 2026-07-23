// Prepend the "use client" directive to the React/Next.js entry bundles.
// esbuild strips module-level directives while bundling, so we add it here,
// after the build, where it survives untouched.
import { readFile, writeFile } from 'node:fs/promises'

const files = ['dist/react.js', 'dist/next.js']
const directive = '"use client";\n'

for (const file of files) {
  const contents = await readFile(file, 'utf8')
  if (!contents.startsWith('"use client"') && !contents.startsWith("'use client'")) {
    await writeFile(file, directive + contents)
    console.log(`[vera-cmp] prepended "use client" to ${file}`)
  }
}
