import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const GZIP_LIMIT = 3 * 1024
const result = await build({
  entryPoints: [fileURLToPath(new URL('../src/index.ts', import.meta.url))],
  bundle: true,
  format: 'esm',
  legalComments: 'none',
  logLevel: 'silent',
  minify: true,
  platform: 'node',
  sourcemap: false,
  target: 'node16',
  treeShaking: true,
  write: false
})
const output = result.outputFiles[0]

if (output === undefined) {
  throw new Error('Core bundle build produced no JavaScript output')
}

const minifiedBytes = output.contents.byteLength
const gzipBytes = gzipSync(output.contents, {level: 9}).byteLength

console.log(
  `Core bundle: ${minifiedBytes} B minified, ${gzipBytes} B gzip ` +
  `(limit: < ${GZIP_LIMIT} B)`
)

if (gzipBytes >= GZIP_LIMIT) {
  throw new Error(
    `Core bundle exceeds the gzip budget by ${gzipBytes - GZIP_LIMIT + 1} B`
  )
}
