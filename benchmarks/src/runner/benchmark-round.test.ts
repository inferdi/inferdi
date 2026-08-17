import 'reflect-metadata'
import { mkdirSync, writeFileSync, writeSync } from 'node:fs'
import { dirname } from 'node:path'
import { setImmediate as nextEventLoopTurn } from 'node:timers/promises'
import { Bench, type TaskResult } from 'tinybench'
import { expect, it } from 'vitest'
import { orderSubjects, subjects } from '../containers/subjects.js'
import type {
  ColdGraph,
  MaybePromise,
  Resolver,
  ScopeHandle,
  Subject
} from '../containers/types.js'

interface TaskSpec {
  run(): unknown | Promise<unknown>
  beforeEach?: () => MaybePromise<void>
  afterEach?: () => MaybePromise<void>
}

interface Scenario {
  readonly id: string
  readonly name: string
  readonly batchSize: number
  supported(resolver: Resolver): boolean
  task(resolver: Resolver): TaskSpec
}

interface RawTaskResult {
  readonly totalTimeMs: number
  readonly minBatchMs: number
  readonly maxBatchMs: number
  readonly meanBatchMs: number
  readonly medianBatchMs: number
  readonly hz: number
  readonly rme: number
  readonly sampleCount: number
}

interface SubjectRoundResult {
  readonly subject: string
  readonly supported: boolean
  readonly normalizedNsPerOp: number | null
  readonly raw: RawTaskResult | null
}

interface SubjectScenarioRoundResult {
  readonly id: string
  readonly name: string
  readonly batchSize: number
  readonly result: SubjectRoundResult
}

export let sink: unknown

const round = readPositiveInteger('BENCH_ROUND', 1)
const subjectPosition = readNonNegativeInteger('BENCH_SUBJECT_POSITION')
const time = readPositiveNumber('BENCH_TIME_MS', 75)
const warmupTime = readPositiveNumber('BENCH_WARMUP_MS', 30)
const output = process.env.BENCH_ROUND_OUTPUT

if (!output) {
  throw new Error('BENCH_ROUND_OUTPUT is required')
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`)
  return value
}

function readNonNegativeInteger(name: string): number {
  const raw = process.env[name]
  if (raw === undefined) throw new Error(`${name} is required`)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
  return value
}

function readPositiveNumber(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`)
  return value
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

async function releaseAll(values: readonly { release(): MaybePromise<void> }[]): Promise<void> {
  for (const value of values) await value.release()
}

function simpleScenario(
  id: string,
  name: string,
  batchSize: number,
  operation: (resolver: Resolver) => unknown
): Scenario {
  return {
    id,
    name,
    batchSize,
    supported: () => true,
    task: (resolver) => ({
      run: () => {
        let value: unknown
        for (let index = 0; index < batchSize; index++) value = operation(resolver)
        sink = value
      }
    })
  }
}

function registrationScenario(): Scenario {
  const batchSize = 10
  return {
    id: 'registration',
    name: 'Registration',
    batchSize,
    supported: (resolver) => resolver.registerGraph !== undefined,
    task: (resolver) => {
      const graphs: ColdGraph[] = new Array(batchSize)
      return {
        run: () => {
          for (let index = 0; index < batchSize; index++) graphs[index] = resolver.registerGraph!()
          sink = graphs[batchSize - 1]
        },
        afterEach: () => releaseAll(graphs)
      }
    }
  }
}

function firstResolveScenario(): Scenario {
  const batchSize = 100
  return {
    id: 'first-resolve',
    name: 'First resolve',
    batchSize,
    supported: () => true,
    task: (resolver) => {
      const graphs: ColdGraph[] = new Array(batchSize)
      return {
        beforeEach: () => {
          for (let index = 0; index < batchSize; index++) graphs[index] = resolver.createColdGraph()
        },
        run: () => {
          let value: unknown
          for (const graph of graphs) value = graph.resolveService()
          sink = value
        },
        afterEach: () => releaseAll(graphs)
      }
    }
  }
}

function scopeCreationScenario(): Scenario {
  const batchSize = 100
  return {
    id: 'scope-creation',
    name: 'Scope creation',
    batchSize,
    supported: () => true,
    task: (resolver) => {
      const scopes: ScopeHandle[] = new Array(batchSize)
      return {
        run: () => {
          for (let index = 0; index < batchSize; index++) scopes[index] = resolver.createScope()
          sink = scopes[batchSize - 1]
        },
        afterEach: () => releaseAll(scopes)
      }
    }
  }
}

function firstScopedResolveScenario(): Scenario {
  const batchSize = 100
  return {
    id: 'first-scoped-resolve',
    name: 'First scoped resolve',
    batchSize,
    supported: () => true,
    task: (resolver) => {
      const scopes: ScopeHandle[] = new Array(batchSize)
      return {
        beforeEach: () => {
          resolver.resolveLogger()
          for (let index = 0; index < batchSize; index++) scopes[index] = resolver.createScope()
        },
        run: () => {
          let value: unknown
          for (const scope of scopes) value = scope.resolve()
          sink = value
        },
        afterEach: () => releaseAll(scopes)
      }
    }
  }
}

function warmScopedResolveScenario(): Scenario {
  const batchSize = 1000
  return {
    id: 'warm-scoped-resolve',
    name: 'Warm scoped resolve',
    batchSize,
    supported: () => true,
    task: (resolver) => {
      let scope: ScopeHandle
      return {
        beforeEach: () => {
          scope = resolver.createScope()
          scope.resolve()
        },
        run: () => {
          let value: unknown
          for (let index = 0; index < batchSize; index++) value = scope.resolve()
          sink = value
        },
        afterEach: () => scope.release()
      }
    }
  }
}

function syncTeardownScenario(): Scenario {
  const batchSize = 100
  return {
    id: 'sync-teardown',
    name: 'Sync teardown',
    batchSize,
    supported: (resolver) => resolver.teardown === 'sync' || resolver.teardown === 'both',
    task: (resolver) => {
      const scopes: ScopeHandle[] = new Array(batchSize)
      return {
        beforeEach: () => {
          for (let index = 0; index < batchSize; index++) {
            scopes[index] = resolver.createScope()
            scopes[index].resolve()
          }
        },
        run: () => {
          for (const scope of scopes) scope.disposeSync!()
          sink = scopes[batchSize - 1]
        },
        afterEach: () => releaseAll(scopes)
      }
    }
  }
}

function asyncTeardownScenario(): Scenario {
  const batchSize = 100
  return {
    id: 'async-teardown',
    name: 'Async teardown',
    batchSize,
    supported: (resolver) => resolver.teardown === 'async' || resolver.teardown === 'both',
    task: (resolver) => {
      const scopes: ScopeHandle[] = new Array(batchSize)
      return {
        beforeEach: () => {
          for (let index = 0; index < batchSize; index++) {
            scopes[index] = resolver.createScope()
            scopes[index].resolve()
          }
        },
        run: async () => {
          for (const scope of scopes) await scope.disposeAsync!()
          sink = scopes[batchSize - 1]
        },
        afterEach: () => releaseAll(scopes)
      }
    }
  }
}

const scenarios: readonly Scenario[] = [
  simpleScenario('hot-singleton', 'Hot singleton resolve', 1000, (resolver) => resolver.resolveService()),
  simpleScenario('transient', 'Transient resolve', 250, (resolver) => resolver.resolveTransient()),
  simpleScenario('deep-graph', 'Deep graph (10 levels)', 100, (resolver) => resolver.resolveDeep()),
  simpleScenario('wide-4', 'Wide graph (4 dependencies)', 250, (resolver) => resolver.resolveWide4()),
  simpleScenario('wide-10', 'Wide graph (10 dependencies)', 100, (resolver) => resolver.resolveWide10()),
  registrationScenario(),
  firstResolveScenario(),
  scopeCreationScenario(),
  firstScopedResolveScenario(),
  warmScopedResolveScenario(),
  syncTeardownScenario(),
  asyncTeardownScenario(),
  simpleScenario('lazy-resolve', 'Lazy resolve', 1000, (resolver) => resolver.resolveLazy())
]

function rawResult(result: TaskResult): RawTaskResult {
  if (result.error) throw result.error
  const medianBatchMs = median(result.samples)
  return {
    totalTimeMs: result.totalTime,
    minBatchMs: result.min,
    maxBatchMs: result.max,
    meanBatchMs: result.mean,
    medianBatchMs,
    hz: result.hz,
    rme: result.rme,
    sampleCount: result.samples.length
  }
}

async function runScenario(
  scenario: Scenario,
  subject: Subject
): Promise<SubjectScenarioRoundResult> {
  const resolver = subject.build()
  if (!scenario.supported(resolver)) {
    try {
      return {
        id: scenario.id,
        name: scenario.name,
        batchSize: scenario.batchSize,
        result: {
          subject: subject.name,
          supported: false,
          normalizedNsPerOp: null,
          raw: null
        }
      }
    } finally {
      await resolver.release()
    }
  }

  const bench = new Bench({
    time,
    warmupTime,
    iterations: 10,
    warmupIterations: 5,
    throws: true
  })
  const task = scenario.task(resolver)
  bench.add(subject.name, task.run, {
    beforeEach: task.beforeEach
      ? async () => { await task.beforeEach!() }
      : undefined,
    afterEach: task.afterEach
      ? async () => {
          await task.afterEach!()
          /* Inversify uses WeakRef-backed caches whose completed batch state stays alive until the current job ends */
          if (resolver.requiresCleanupTurn) await nextEventLoopTurn()
        }
      : undefined
  })

  try {
    await bench.warmup()
    await bench.run()
    const raw = rawResult(bench.getTask(subject.name)!.result!)
    return {
      id: scenario.id,
      name: scenario.name,
      batchSize: scenario.batchSize,
      result: {
        subject: subject.name,
        supported: true,
        normalizedNsPerOp: raw.medianBatchMs * 1_000_000 / scenario.batchSize,
        raw
      }
    }
  } finally {
    bench.reset()
    bench.remove(subject.name)
    await resolver.release()
    await nextEventLoopTurn()
  }
}

it('records one isolated benchmark subject', async () => {
  const orderedSubjects = orderSubjects(round)
  if (subjectPosition >= orderedSubjects.length) {
    throw new Error(
      `BENCH_SUBJECT_POSITION must be less than ${orderedSubjects.length}`
    )
  }
  const subject = orderedSubjects[subjectPosition]!
  const scenarioResults: SubjectScenarioRoundResult[] = []

  writeSync(
    process.stdout.fd,
    `Subject ${subjectPosition + 1}/${orderedSubjects.length}: ${subject.name}\n`
  )

  for (let index = 0; index < scenarios.length; index++) {
    const scenario = scenarios[index]
    writeSync(process.stdout.fd, `Scenario ${index + 1}/${scenarios.length}: ${scenario.name}\n`)
    scenarioResults.push(await runScenario(scenario, subject))
  }

  const result = {
    round,
    subjectPosition,
    subject: subject.name,
    resultOrder: subjects.map((candidate) => candidate.name),
    subjectOrder: orderedSubjects.map((subject) => subject.name),
    timing: { timeMs: time, warmupTimeMs: warmupTime },
    scenarios: scenarioResults
  }

  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`)
  expect(scenarioResults).toHaveLength(scenarios.length)
}, 30 * 60_000)
