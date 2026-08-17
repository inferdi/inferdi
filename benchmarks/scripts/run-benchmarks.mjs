import { spawnSync } from 'node:child_process'
import { readFileSync, realpathSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { cpus, arch, platform, release, tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeSubjectResults } from './merge-benchmark-results.mjs'

const benchmarkRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repositoryRoot = resolve(benchmarkRoot, '..')
const args = parseArgs(process.argv.slice(2))
const mode = args.mode ?? 'quick'
const publicRoundBlock = 8

if (mode !== 'quick' && mode !== 'public') {
  throw new Error('--mode must be quick or public')
}

const artifact = mode === 'public' ? 'production' : args.artifact ?? 'source'
const rounds = positiveInteger(args.rounds ?? (mode === 'public' ? publicRoundBlock : 1), 'rounds')
const timeMs = positiveNumber(args.time ?? (mode === 'public' ? 100 : 75), 'time')
const warmupTimeMs = positiveNumber(args.warmup ?? (mode === 'public' ? 50 : 30), 'warmup')

if (mode === 'public' && rounds % publicRoundBlock !== 0) {
  throw new Error(`Public mode requires complete ${publicRoundBlock}-round balanced blocks`)
}

if (artifact !== 'source' && artifact !== 'production') {
  throw new Error('--artifact must be source or production')
}

const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const outputPath = resolve(
  benchmarkRoot,
  args.output ?? `results/${mode}-${stamp}.json`
)
const temporaryRoot = mkdtempSync(join(tmpdir(), 'inferdi-bench-'))

try {
  if (mode === 'public') {
    run('corepack', ['pnpm', 'install', '--frozen-lockfile'], benchmarkRoot)
  }

  run('corepack', ['pnpm', 'run', 'typecheck'], benchmarkRoot)

  if (artifact === 'production') {
    run(
      'corepack',
      ['pnpm', '--dir', repositoryRoot, '--filter', '@inferdi/inferdi', 'run', 'build'],
      repositoryRoot
    )
  }

  run(
    'corepack',
    ['pnpm', 'exec', 'vitest', 'run', 'src/precondition'],
    benchmarkRoot,
    { BENCH_INFERDI_ARTIFACT: artifact }
  )

  const roundResults = []
  for (let round = 1; round <= rounds; round++) {
    const subjectResults = []
    let subjectCount = 1
    process.stdout.write(`\nBenchmark round ${round}/${rounds}\n`)

    for (let subjectPosition = 0; subjectPosition < subjectCount; subjectPosition++) {
      const subjectOutput = join(
        temporaryRoot,
        `round-${round}-subject-${subjectPosition}.json`
      )
      run(
        'corepack',
        ['pnpm', 'exec', 'vitest', 'run', 'src/runner/benchmark-round.test.ts'],
        benchmarkRoot,
        {
          BENCH_INFERDI_ARTIFACT: artifact,
          BENCH_ROUND: String(round),
          BENCH_SUBJECT_POSITION: String(subjectPosition),
          BENCH_ROUND_OUTPUT: subjectOutput,
          BENCH_TIME_MS: String(timeMs),
          BENCH_WARMUP_MS: String(warmupTimeMs),
          NODE_OPTIONS: '--no-warnings'
        }
      )
      const subjectResult = JSON.parse(readFileSync(subjectOutput, 'utf8'))

      if (subjectPosition === 0) {
        if (!Array.isArray(subjectResult.subjectOrder) || subjectResult.subjectOrder.length === 0) {
          throw new Error(`Benchmark round ${round} returned no subjects`)
        }
        subjectCount = subjectResult.subjectOrder.length
      }

      subjectResults.push(subjectResult)
    }

    roundResults.push(mergeSubjectResults(subjectResults))
  }

  const raw = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    artifact: {
      mode: artifact,
      entry: artifact === 'production'
        ? '../packages/inferdi/dist/index.js'
        : '../packages/inferdi/src/index.ts'
    },
    git: {
      commit: capture('git', ['rev-parse', 'HEAD'], repositoryRoot),
      dirty: capture('git', ['status', '--porcelain'], repositoryRoot).length > 0
    },
    environment: {
      node: process.version,
      pnpm: pnpmVersion(),
      os: `${platform()} ${release()}`,
      architecture: arch(),
      cpu: cpus()[0]?.model ?? 'unknown',
      powerMode: readPowerMode()
    },
    dependencies: dependencyVersions(),
    configuration: {
      rounds,
      timeMs,
      warmupTimeMs,
      frozenLockfile: mode === 'public',
      processIsolation: true,
      processIsolationLevel: 'subject',
      subjectOrder: 'balanced-latin-square'
    },
    rounds: roundResults
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(raw, null, 2)}\n`)
  process.stdout.write(`\nRaw benchmark result: ${relativeDisplay(outputPath)}\n`)
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index++) {
    const argument = values[index]
    if (argument === '--') continue
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`)
    const name = argument.slice(2)
    const value = values[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}`)
    parsed[name] = value
    index++
  }
  return parsed
}

function positiveInteger(value, name) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer`)
  return parsed
}

function positiveNumber(value, name) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`--${name} must be positive`)
  return parsed
}

function run(command, commandArgs, cwd, extraEnvironment = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: { ...process.env, ...extraEnvironment },
    encoding: 'utf8',
    stdio: 'inherit'
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} exited with status ${result.status}`)
  }
}

function capture(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, { cwd, encoding: 'utf8' })
  if (result.status === 0) return result.stdout.trim()
  if (result.error) throw result.error
  throw new Error(`${command} ${commandArgs.join(' ')} exited with status ${result.status}`)
}

function dependencyVersions() {
  const names = [
    '@swc/core',
    '@types/node',
    'inversify',
    'awilix',
    'reflect-metadata',
    'tsyringe',
    'typedi',
    'typed-inject',
    'tinybench',
    'typescript',
    'unplugin-swc',
    'vitest'
  ]
  const versions = {
    '@inferdi/inferdi': JSON.parse(
      readFileSync(join(repositoryRoot, 'packages/inferdi/package.json'), 'utf8')
    ).version
  }

  for (const name of names) {
    const packageRoot = realpathSync(join(benchmarkRoot, 'node_modules', name))
    versions[name] = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version
  }
  return versions
}

function pnpmVersion() {
  const captured = capture('corepack', ['pnpm', '--version'], benchmarkRoot)
  if (captured) return captured

  const userAgentMatch = process.env.npm_config_user_agent?.match(/pnpm\/([^ ]+)/)
  if (userAgentMatch) return userAgentMatch[1]

  const packageManager = JSON.parse(
    readFileSync(join(benchmarkRoot, 'package.json'), 'utf8')
  ).packageManager
  return packageManager.split('@').at(-1)
}

function readPowerMode() {
  try {
    return readFileSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', 'utf8').trim()
  } catch {
    return null
  }
}

function relativeDisplay(path) {
  const display = relative(benchmarkRoot, path)
  return display.startsWith('..') ? path : display
}
