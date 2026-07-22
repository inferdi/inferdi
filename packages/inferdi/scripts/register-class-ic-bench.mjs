import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const PROCESS_START = process.hrtime.bigint()
const ARITIES = [0, 1, 2, 3, 4, 5, 6, 7]
const POOL_SIZES = [1, 2, 4, 8, 16]

let sink = 0

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function createCtor(arity, id) {
  if (arity === 0) return class { checksum = id }
  if (arity === 1) return class { constructor(a0) { this.checksum = id + a0 } }
  if (arity === 2) return class { constructor(a0, a1) { this.checksum = id + a0 + a1 } }
  if (arity === 3) return class { constructor(a0, a1, a2) { this.checksum = id + a0 + a1 + a2 } }
  if (arity === 4) return class { constructor(a0, a1, a2, a3) { this.checksum = id + a0 + a1 + a2 + a3 } }
  if (arity === 5) return class { constructor(a0, a1, a2, a3, a4) { this.checksum = id + a0 + a1 + a2 + a3 + a4 } }
  if (arity === 6) return class { constructor(a0, a1, a2, a3, a4, a5) { this.checksum = id + a0 + a1 + a2 + a3 + a4 + a5 } }
  return class { constructor(a0, a1, a2, a3, a4, a5, a6) { this.checksum = id + a0 + a1 + a2 + a3 + a4 + a5 + a6 } }
}

function createCtorPools(size = POOL_SIZES[POOL_SIZES.length - 1]) {
  return ARITIES.map((arity) =>
    Array.from({length: size}, (_, id) => createCtor(arity, id))
  )
}

function buildFixture(Container, ctorPools, arity, poolSize, kind, strict) {
  const container = new Container({strict})
  const deps = Array.from({length: arity}, (_, index) => `dep${index}`)
  const dependencySum = arity * (arity + 1) / 2

  for (let index = 0; index < arity; index++) {
    container.registerValue(deps[index], index + 1)
  }

  const keys = Array.from({length: poolSize}, (_, index) => `service${index}`)
  for (let index = 0; index < poolSize; index++) {
    container.registerClass(keys[index], ctorPools[arity][index], deps, kind)
  }

  return {
    container,
    expected: keys.map((_, index) => dependencySum + index),
    keys
  }
}

function consumeAll(fixture, container = fixture.container) {
  for (let index = 0; index < fixture.keys.length; index++) {
    const value = container.get(fixture.keys[index])
    if (value.checksum !== fixture.expected[index]) {
      throw new Error(`Invalid fixture at arity/pool index ${index}`)
    }
    sink ^= value.checksum
  }
}

function hotResolve(fixture) {
  let index = 0
  const mask = fixture.keys.length - 1
  return () => {
    const value = fixture.container.get(fixture.keys[index])
    sink ^= value.checksum
    index = (index + 1) & mask
  }
}

function timed(fn, iterations) {
  const start = process.hrtime.bigint()
  for (let index = 0; index < iterations; index++) fn()
  return Number(process.hrtime.bigint() - start) / iterations
}

function warm(fn, iterations) {
  for (let index = 0; index < iterations; index++) fn()
}

function compareScenario(name, baselineFn, candidateFn, warmup, iterations, rounds) {
  warm(baselineFn, warmup)
  warm(candidateFn, warmup)
  const baseline = []
  const candidate = []

  for (let round = 0; round < rounds; round++) {
    if (round % 2 === 0) {
      baseline.push(timed(baselineFn, iterations))
      candidate.push(timed(candidateFn, iterations))
    } else {
      candidate.push(timed(candidateFn, iterations))
      baseline.push(timed(baselineFn, iterations))
    }
  }

  const baselineNs = median(baseline)
  const candidateNs = median(candidate)
  process.stdout.write(`${name}\t${baselineNs.toFixed(2)}\t${candidateNs.toFixed(2)}\t${(baselineNs / candidateNs).toFixed(4)}\n`)
}

async function importContainer(artifact, role) {
  const url = `${pathToFileURL(resolve(artifact)).href}?role=${role}`
  return (await import(url)).Container
}

async function compare(baselineArtifact, candidateArtifact) {
  const Baseline = await importContainer(baselineArtifact, 'baseline')
  const Candidate = await importContainer(candidateArtifact, 'candidate')
  const ctorPools = createCtorPools()

  process.stdout.write('scenario\tbaseline_ns\tcandidate_ns\tcandidate_speedup\n')

  for (const arity of ARITIES) {
    for (const poolSize of POOL_SIZES) {
      for (const strict of [true, false]) {
        const baselineFixture = buildFixture(Baseline, ctorPools, arity, poolSize, 'transient', strict)
        const candidateFixture = buildFixture(Candidate, ctorPools, arity, poolSize, 'transient', strict)
        consumeAll(baselineFixture)
        consumeAll(candidateFixture)
        compareScenario(
          `hot/a${arity}/k${poolSize}/${strict ? 'strict' : 'fast'}`,
          hotResolve(baselineFixture),
          hotResolve(candidateFixture),
          100_000,
          100_000,
          7
        )
      }
    }

    const poolSize = POOL_SIZES[POOL_SIZES.length - 1]
    compareScenario(
      `build/a${arity}/k${poolSize}/transient`,
      () => { sink ^= buildFixture(Baseline, ctorPools, arity, poolSize, 'transient', true).keys.length },
      () => { sink ^= buildFixture(Candidate, ctorPools, arity, poolSize, 'transient', true).keys.length },
      2_000,
      5_000,
      7
    )
    compareScenario(
      `first/a${arity}/k${poolSize}/transient`,
      () => consumeAll(buildFixture(Baseline, ctorPools, arity, poolSize, 'transient', true)),
      () => consumeAll(buildFixture(Candidate, ctorPools, arity, poolSize, 'transient', true)),
      1_000,
      2_000,
      7
    )
    compareScenario(
      `first/a${arity}/k${poolSize}/singleton`,
      () => consumeAll(buildFixture(Baseline, ctorPools, arity, poolSize, 'singleton', true)),
      () => consumeAll(buildFixture(Candidate, ctorPools, arity, poolSize, 'singleton', true)),
      1_000,
      2_000,
      7
    )

    const baselineScoped = buildFixture(Baseline, ctorPools, arity, poolSize, 'scoped', true)
    const candidateScoped = buildFixture(Candidate, ctorPools, arity, poolSize, 'scoped', true)
    compareScenario(
      `first/a${arity}/k${poolSize}/scoped`,
      () => consumeAll(baselineScoped, baselineScoped.container.createScope()),
      () => consumeAll(candidateScoped, candidateScoped.container.createScope()),
      1_000,
      2_000,
      7
    )
  }

  if (sink === Number.NaN) process.stdout.write('unreachable\n')
}

async function coldChild(artifact) {
  const importStart = process.hrtime.bigint()
  const Container = await importContainer(artifact, 'cold')
  const importMs = Number(process.hrtime.bigint() - importStart) / 1e6
  const ctorPools = createCtorPools(4)

  const transientStart = process.hrtime.bigint()
  for (const arity of ARITIES) {
    consumeAll(buildFixture(Container, ctorPools, arity, 4, 'transient', true))
  }
  const transientMs = Number(process.hrtime.bigint() - transientStart) / 1e6

  const singletonStart = process.hrtime.bigint()
  for (const arity of ARITIES) {
    consumeAll(buildFixture(Container, ctorPools, arity, 4, 'singleton', true))
  }
  const singletonMs = Number(process.hrtime.bigint() - singletonStart) / 1e6

  process.stdout.write(JSON.stringify({
    importMs,
    processMs: Number(process.hrtime.bigint() - PROCESS_START) / 1e6,
    singletonMs,
    transientMs
  }))
}

function runColdChild(artifact) {
  const start = process.hrtime.bigint()
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), 'cold-child', artifact],
    {encoding: 'utf8'}
  )
  const wallMs = Number(process.hrtime.bigint() - start) / 1e6

  if (child.error) throw child.error
  if (child.status !== 0) {
    throw new Error(child.stderr || `Cold child failed with status ${child.status}`)
  }

  return {...JSON.parse(child.stdout), wallMs}
}

function coldCompare(baselineArtifact, candidateArtifact, rounds = 25) {
  const results = {
    baseline: {importMs: [], processMs: [], singletonMs: [], transientMs: [], wallMs: []},
    candidate: {importMs: [], processMs: [], singletonMs: [], transientMs: [], wallMs: []}
  }

  for (let round = 0; round < rounds; round++) {
    const order = round % 2 === 0
      ? [['baseline', baselineArtifact], ['candidate', candidateArtifact]]
      : [['candidate', candidateArtifact], ['baseline', baselineArtifact]]

    for (const [role, artifact] of order) {
      const sample = runColdChild(artifact)
      for (const key of Object.keys(sample)) results[role][key].push(sample[key])
    }
  }

  process.stdout.write('metric\tbaseline_ms\tcandidate_ms\tcandidate_ratio\n')
  for (const key of Object.keys(results.baseline)) {
    const baselineMs = median(results.baseline[key])
    const candidateMs = median(results.candidate[key])
    process.stdout.write(`${key}\t${baselineMs.toFixed(4)}\t${candidateMs.toFixed(4)}\t${(candidateMs / baselineMs).toFixed(4)}\n`)
  }
}

const [mode, firstArtifact, secondArtifact, rounds] = process.argv.slice(2)

if (mode === 'compare' && firstArtifact && secondArtifact) {
  await compare(firstArtifact, secondArtifact)
} else if (mode === 'cold-compare' && firstArtifact && secondArtifact) {
  coldCompare(firstArtifact, secondArtifact, rounds === undefined ? 25 : Number(rounds))
} else if (mode === 'cold-child' && firstArtifact) {
  await coldChild(firstArtifact)
} else {
  process.stderr.write('Usage: node scripts/register-class-ic-bench.mjs <compare|cold-compare> <baseline.js> <candidate.js> [rounds]\n')
  process.exitCode = 1
}
