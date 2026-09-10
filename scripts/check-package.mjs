import {readFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {join} from 'node:path'

const packageDirectory = process.cwd()
const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'))

if (!manifest.name) throw new Error('package.json must define a package name')

const runProbe = (type, source) => {
  const result = spawnSync(process.execPath, [`--input-type=${type}`, '--eval', source], {
    cwd: packageDirectory,
    encoding: 'utf8'
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout)
  }
}

runProbe('module', `const entry = await import(${JSON.stringify(manifest.name)}); if (!Object.keys(entry).length) throw new Error('ESM entry point has no exports')`)
runProbe('commonjs', `const entry = require(${JSON.stringify(manifest.name)}); if (!Object.keys(entry).length) throw new Error('CJS entry point has no exports'); if (require(${JSON.stringify(`${manifest.name}/package.json`)}).name !== ${JSON.stringify(manifest.name)}) throw new Error('package.json export does not resolve')`)

const cacheName = manifest.name.replaceAll(/[^a-z0-9]+/gi, '-')
const packed = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: packageDirectory,
  encoding: 'utf8',
  env: {...process.env, npm_config_cache: `/tmp/inferdi-${cacheName}-npm-cache`}
})
if (packed.error) throw packed.error
if (packed.status !== 0) throw new Error(packed.stderr || packed.stdout)
if (!packed.stdout) throw new Error('npm pack returned no JSON output')

const packResult = JSON.parse(packed.stdout)[0]
if (!packResult) throw new Error('npm pack returned no package information')

const packedFiles = new Set(packResult.files.map((file) => file.path))
const allowedEntries = ['package.json', ...(manifest.files ?? [])]
const unexpectedFile = [...packedFiles].find((file) =>
  !allowedEntries.some((entry) => file === entry || file.startsWith(`${entry}/`))
)
if (unexpectedFile) {
  throw new Error(`npm pack includes an unexpected file: ${unexpectedFile}`)
}

const entryTargets = new Set()
const collectTargets = (value) => {
  if (typeof value === 'string') {
    if (value.startsWith('./')) entryTargets.add(value.slice(2))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const nested of Object.values(value)) collectTargets(nested)
}

collectTargets(manifest.main)
collectTargets(manifest.module)
collectTargets(manifest.types)
collectTargets(manifest.exports)

for (const target of entryTargets) {
  if (!packedFiles.has(target)) {
    throw new Error(`npm pack is missing manifest target: ${target}`)
  }
}
