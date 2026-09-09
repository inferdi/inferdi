import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'

const packageDirectory = fileURLToPath(new URL('..', import.meta.url))
const esm = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8')
const cjs = await readFile(new URL('../dist/index.cjs', import.meta.url), 'utf8')

if (!/^(?:'use client'|"use client")/.test(esm)) {
  throw new Error("ESM output must start with 'use client'")
}
if (esm.includes('@inferdi/inferdi') || cjs.includes('@inferdi/inferdi')) {
  throw new Error('@inferdi/inferdi must remain type-only')
}
if (!/from\s+["']react["']/.test(esm) || !/require\(["']react["']\)/.test(cjs)) {
  throw new Error('ESM and CJS output must keep React external')
}

const declaration = await readFile(new URL('../dist/index.d.ts', import.meta.url), 'utf8')
for (const name of [
  'inferdiReact',
  'InferdiReactBinding',
  'InferdiReactScopeBinding',
  'InferdiStableSyncKey',
  'InferdiStableAsyncKey'
]) {
  if (!declaration.includes(name)) {
    throw new Error(`declaration output is missing ${name}`)
  }
}
if (declaration.includes('Container<DependenciesMap>')) {
  throw new Error('declaration output must preserve exact container graphs')
}

const unused = await build({
  stdin: {
    contents: "import '@inferdi/react'",
    resolveDir: packageDirectory
  },
  bundle: true,
  write: false,
  minify: true,
  format: 'esm',
  logLevel: 'silent',
  external: ['react', '@inferdi/inferdi']
})
if (unused.outputFiles[0].text.trim() !== '') {
  throw new Error('unused ESM package import must tree-shake away')
}
