import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repositoryRoot = resolve(dirname(scriptPath), '../../..')

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function scenarioCategory(scenario) {
  const [name, mode] = scenario.split('/')

  if (name.includes('0async')) return `lane0/${mode}`
  if (name.includes('1async')) return `lane1/${mode}`
  if (name.includes('2async')) return `fallback2/${mode}`
  if (name === 'factory-0deps') return `unchanged0/${mode}`
  if (name.startsWith('sync-')) return 'sync/transient'
  return 'other'
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  })

  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}\n` +
      `${result.error?.message ?? result.stderr}`
    )
  }

  return result.stdout
}

function buildModule(entryPath, outputPath) {
  const esbuildPath = resolve(
    repositoryRoot,
    'packages/inferdi/node_modules/.bin/esbuild'
  )

  if (!existsSync(esbuildPath)) {
    throw new Error(
      `esbuild not found at ${esbuildPath}. Run ` +
      '`corepack pnpm install --frozen-lockfile` first.'
    )
  }

  runCommand(esbuildPath, [
    entryPath,
    '--bundle',
    '--format=esm',
    '--legal-comments=none',
    '--log-level=warning',
    '--platform=node',
    '--target=node16',
    '--tree-shaking=true',
    `--outfile=${outputPath}`
  ])
}

function prepareModule(value, label) {
  if (value === 'worktree' || value.startsWith('git:')) {
    const directory = mkdtempSync(join(tmpdir(), 'inferdi-async-fast-lanes-'))
    const outputPath = join(directory, 'index.mjs')

    try {
      if (value === 'worktree') {
        buildModule(
          resolve(repositoryRoot, 'packages/inferdi/src/index.ts'),
          outputPath
        )
      } else {
        const ref = value.slice('git:'.length)

        if (ref === '') {
          throw new Error(`${label} git ref is empty`)
        }

        writeFileSync(
          join(directory, 'Container.ts'),
          runCommand('git', [
            'show',
            `${ref}:packages/inferdi/src/Container.ts`
          ])
        )
        writeFileSync(
          join(directory, 'index.ts'),
          runCommand('git', [
            'show',
            `${ref}:packages/inferdi/src/index.ts`
          ])
        )
        buildModule(join(directory, 'index.ts'), outputPath)
      }

      return {
        input: value,
        url: pathToFileURL(outputPath).href,
        cleanup() {
          rmSync(directory, {recursive: true, force: true})
        }
      }
    } catch (error) {
      rmSync(directory, {recursive: true, force: true})
      throw error
    }
  }

  const url = value.startsWith('file:')
    ? value
    : pathToFileURL(resolve(value)).href
  const path = fileURLToPath(url)

  if (!existsSync(path)) {
    throw new Error(
      `${label} module not found: ${path}\n` +
      'Paths such as /path/to/... are placeholders. In this repository use ' +
      '`git:HEAD` for the baseline and `worktree` for the candidate.'
    )
  }

  return {
    input: value,
    url,
    cleanup() {}
  }
}

class BenchClass {
  constructor(...args) {
    this.value = args.length
  }
}

function benchFactory(...args) {
  return args.length
}

function buildGraph(Container, spec) {
  let container = new Container({fast: spec.contract === 'fast'})
  const deps = []
  const asyncKeys = []

  for (let i = 0; i < spec.totalDeps; i++) {
    const key = `dep${i}`
    deps.push(key)

    if (spec.asyncPositions.includes(i)) {
      asyncKeys.push(key)
      container = container.registerAsyncFactory(key, benchFactory, [])
    } else {
      container = container.registerValue(key, i)
    }
  }

  if (spec.syncPath) {
    container = spec.target === 'class'
      ? container.registerClass('target', BenchClass, deps, 'transient')
      : container.registerFactory('target', benchFactory, deps, 'transient')
  } else {
    container = spec.target === 'class'
      ? container.registerClass('target', BenchClass, deps, spec.lifetime)
      : container.registerAsyncFactory('target', benchFactory, deps, spec.lifetime)
  }

  return {container, asyncKeys}
}

async function warmDependencies(graph) {
  await Promise.all(graph.asyncKeys.map((key) => graph.container.getAsync(key)))
}

async function prepare(Container, spec, iterations) {
  if (spec.syncPath) {
    const graph = buildGraph(Container, spec)
    return {
      sync: true,
      run() {
        return graph.container.get('target')
      }
    }
  }

  if (spec.mode === 'singleton-cold') {
    const graphs = Array.from({length: iterations}, () => buildGraph(Container, spec))
    await Promise.all(graphs.flatMap((graph) =>
      graph.asyncKeys.map((key) => graph.container.getAsync(key))
    ))
    return {
      sync: false,
      run(index) {
        return graphs[index].container.getAsync('target')
      }
    }
  }

  const graph = buildGraph(Container, spec)

  if (spec.mode === 'scoped-cold') {
    const scopes = Array.from(
      {length: iterations},
      () => graph.container.createScope()
    )
    await warmDependencies(graph)
    return {
      sync: false,
      run(index) {
        return scopes[index].getAsync('target')
      }
    }
  }

  await warmDependencies(graph)

  if (spec.mode === 'singleton-warm') {
    await graph.container.getAsync('target')
  }

  return {
    sync: false,
    run() {
      return graph.container.getAsync('target')
    }
  }
}

function collectGarbage() {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc()
  } else if (typeof Bun !== 'undefined') {
    Bun.gc(true)
  }
}

async function measurePrepared(prepared, iterations) {
  let sink
  const started = performance.now()

  if (prepared.sync) {
    for (let i = 0; i < iterations; i++) {
      sink = prepared.run(i)
    }
  } else {
    for (let i = 0; i < iterations; i++) {
      sink = await prepared.run(i)
    }
  }

  const elapsed = performance.now() - started

  if (sink === Symbol.for('impossible benchmark value')) {
    throw new Error('unreachable')
  }

  return elapsed * 1e6 / iterations
}

function iterationsFor(spec) {
  if (spec.syncPath) return 300_000
  if (spec.mode === 'singleton-warm') return 150_000
  if (spec.mode === 'singleton-cold') return 3_000
  if (spec.mode === 'scoped-cold') return 5_000
  return 20_000
}

function buildSpecs(filter) {
  const shapes = [
    {name: 'factory-0deps', target: 'factory', totalDeps: 0, asyncPositions: []},
    {name: 'factory-1sync-0async', target: 'factory', totalDeps: 1, asyncPositions: []},
    {name: 'factory-5sync-0async', target: 'factory', totalDeps: 5, asyncPositions: []},
    {name: 'factory-1async-first', target: 'factory', totalDeps: 5, asyncPositions: [0]},
    {name: 'factory-1async-middle', target: 'factory', totalDeps: 5, asyncPositions: [2]},
    {name: 'factory-1async-last', target: 'factory', totalDeps: 5, asyncPositions: [4]},
    {name: 'class-1async-first', target: 'class', totalDeps: 5, asyncPositions: [0]},
    {name: 'class-1async-middle', target: 'class', totalDeps: 5, asyncPositions: [2]},
    {name: 'class-1async-last', target: 'class', totalDeps: 5, asyncPositions: [4]},
    {name: 'factory-2async', target: 'factory', totalDeps: 5, asyncPositions: [0, 4]},
    {name: 'class-2async', target: 'class', totalDeps: 5, asyncPositions: [0, 4]}
  ]
  const modes = ['transient', 'singleton-cold', 'singleton-warm', 'scoped-cold']
  const specs = []

  for (const shape of shapes) {
    for (const mode of modes) {
      for (const contract of ['checked', 'fast']) {
        specs.push({
          ...shape,
          mode,
          contract,
          lifetime: mode === 'transient'
            ? 'transient'
            : mode === 'scoped-cold'
              ? 'scoped'
              : undefined,
          syncPath: false
        })
      }
    }
  }

  for (const target of ['factory', 'class']) {
    for (const contract of ['checked', 'fast']) {
      specs.push({
        name: `sync-${target}-5deps`,
        target,
        totalDeps: 5,
        asyncPositions: [],
        mode: 'transient',
        contract,
        lifetime: 'transient',
        syncPath: true
      })
    }
  }

  if (filter === undefined) {
    return specs
  }

  const pattern = new RegExp(filter)
  return specs.filter((spec) => pattern.test(
    `${spec.name}/${spec.mode}/${spec.contract}`
  ))
}

async function runWorker(modulePath, round, filter) {
  const {Container} = await import(modulePath)
  const specs = buildSpecs(filter)
  const ordered = round % 2 === 0 ? specs : [...specs].reverse()
  const results = []

  for (const spec of ordered) {
    const iterations = iterationsFor(spec)
    const warmupIterations = Math.min(iterations, spec.syncPath ? 20_000 : 500)
    const warmup = await prepare(Container, spec, warmupIterations)
    collectGarbage()
    await measurePrepared(warmup, warmupIterations)

    const prepared = await prepare(Container, spec, iterations)
    collectGarbage()
    results.push({
      scenario: `${spec.name}/${spec.mode}/${spec.contract}`,
      iterations,
      ns: await measurePrepared(prepared, iterations)
    })
  }

  process.stdout.write(JSON.stringify({
    runtime: typeof Bun === 'undefined'
      ? {name: 'node', version: process.version, v8: process.versions.v8}
      : {name: 'bun', version: Bun.version, webkit: process.versions.webkit},
    round,
    results
  }))
}

function runChild(modulePath, round, filter) {
  const runtimeArgs = typeof Bun === 'undefined' ? ['--expose-gc'] : []
  const args = [
    ...runtimeArgs,
    scriptPath,
    '--worker',
    modulePath,
    String(round)
  ]

  if (filter !== undefined) {
    args.push(filter)
  }

  const child = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  })

  if (child.error !== undefined || child.status !== 0 || child.stdout.trim() === '') {
    throw new Error(
      `Benchmark worker failed with status ${child.status}: ` +
      `${child.error?.message ?? (child.stderr || 'empty stdout')}`
    )
  }

  return JSON.parse(child.stdout)
}

function summarize(report) {
  const groups = new Map()

  for (const result of report.results) {
    const values = groups.get(scenarioCategory(result.scenario)) ?? []
    values.push(result.pairedDeltaPct)
    groups.set(scenarioCategory(result.scenario), values)
  }

  for (const [group, values] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    console.log([
      group.padEnd(28),
      `median ${median(values).toFixed(2)}%`,
      `p10 ${percentile(values, 0.1).toFixed(2)}%`,
      `p90 ${percentile(values, 0.9).toFixed(2)}%`,
      `n=${values.length}`
    ].join('\t'))
  }
}

async function runParent() {
  const baselineArg = process.argv[2]
  const candidateArg = process.argv[3]
  const outputPath = process.argv[4]
  const rounds = Number(process.argv[5] ?? 11)
  const filter = process.argv[6]

  if (!baselineArg || !candidateArg || !outputPath || !Number.isInteger(rounds) || rounds < 1) {
    throw new Error(
      'usage: benchmark-async-fast-lanes.mjs ' +
      '<git:ref|worktree|baseline-module> ' +
      '<git:ref|worktree|candidate-module> <output-json> [rounds] [filter]'
    )
  }

  const preparedModules = []

  try {
    const baseline = prepareModule(baselineArg, 'Baseline')
    preparedModules.push(baseline)
    const candidate = prepareModule(candidateArg, 'Candidate')
    preparedModules.push(candidate)
    const samples = {baseline: [], candidate: []}
    let runtime

    for (let round = 0; round < rounds; round++) {
      const order = round % 2 === 0
        ? [['baseline', baseline.url], ['candidate', candidate.url]]
        : [['candidate', candidate.url], ['baseline', baseline.url]]

      for (const [variant, modulePath] of order) {
        const sample = runChild(modulePath, round, filter)
        runtime = sample.runtime
        samples[variant].push(sample)
        console.log(`round ${round + 1}/${rounds}\t${variant}`)
      }
    }

    const byScenario = new Map()

    for (const variant of ['baseline', 'candidate']) {
      for (const sample of samples[variant]) {
        for (const result of sample.results) {
          const entry = byScenario.get(result.scenario) ?? {
            iterations: result.iterations,
            baselineNs: [],
            candidateNs: []
          }
          entry[`${variant}Ns`][sample.round] = result.ns
          byScenario.set(result.scenario, entry)
        }
      }
    }

    const results = [...byScenario].map(([scenario, entry]) => {
      const ratios = entry.candidateNs.map(
        (value, index) => value / entry.baselineNs[index]
      )
      const ratioMedian = median(ratios)
      const deviations = ratios.map((ratio) => Math.abs(ratio - ratioMedian))

      return {
        scenario,
        iterations: entry.iterations,
        baselineNs: entry.baselineNs,
        candidateNs: entry.candidateNs,
        baselineMedianNs: median(entry.baselineNs),
        candidateMedianNs: median(entry.candidateNs),
        pairedDeltaPct: (ratioMedian - 1) * 100,
        pairedMadPct: median(deviations) * 100
      }
    }).sort((a, b) => a.scenario.localeCompare(b.scenario))
    const report = {
      runtime,
      baselineInput: baseline.input,
      candidateInput: candidate.input,
      baselineModule: baseline.url,
      candidateModule: candidate.url,
      rounds,
      filter,
      results
    }

    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
    summarize(report)
    console.log(`report\t${outputPath}`)
  } finally {
    for (let index = preparedModules.length - 1; index >= 0; index--) {
      preparedModules[index].cleanup()
    }
  }
}

if (process.argv[2] === '--worker') {
  await runWorker(process.argv[3], Number(process.argv[4]), process.argv[5])
} else {
  await runParent()
}
