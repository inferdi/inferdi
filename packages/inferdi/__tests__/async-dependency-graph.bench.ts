import {bench, describe} from 'vitest'
import {Container, type Lifetime} from '../src/Container'

export let sink: unknown

const pendingBenchmarkSetup: Promise<unknown>[] = []

class Database {
  public readonly ready = true
}

class Repository {
  constructor(public readonly db: Database) {}
}

class WideService {
  constructor(
    public readonly db: Database,
    public readonly a: number,
    public readonly b: number,
    public readonly c: number,
    public readonly d: number
  ) {}
}

class MatrixService {
  public readonly dependencyCount: number

  constructor(...args: unknown[]) {
    this.dependencyCount = args.length
  }
}

interface MatrixContainer {
  registerValue(key: string, value: unknown): MatrixContainer
  registerAsyncFactory(
    key: string,
    factory: (...args: unknown[]) => unknown,
    deps: readonly string[],
    lifetime?: Lifetime
  ): MatrixContainer
  registerClass(
    key: string,
    Ctor: new (...args: unknown[]) => unknown,
    deps: string[],
    lifetime?: Lifetime
  ): MatrixContainer
  createScope(): MatrixContainer
  getAsync(key: string): Promise<unknown>
}

interface MatrixShape {
  readonly name: string
  readonly target: 'factory' | 'class'
  readonly totalDeps: number
  readonly asyncPositions: readonly number[]
}

const matrixFactory = (...args: unknown[]) => args.length

function buildMatrixGraph(
  fast: boolean,
  shape: MatrixShape,
  lifetime: Lifetime
): {container: MatrixContainer; asyncKeys: readonly string[]} {
  let container = new Container({fast}) as unknown as MatrixContainer
  const deps: string[] = []
  const asyncKeys: string[] = []

  for (let i = 0; i < shape.totalDeps; i++) {
    const key = `dep${i}`
    deps.push(key)

    if (shape.asyncPositions.includes(i)) {
      asyncKeys.push(key)
      container = container.registerAsyncFactory(key, matrixFactory, [])
    } else {
      container = container.registerValue(key, i)
    }
  }

  container = shape.target === 'class'
    ? container.registerClass('target', MatrixService, deps, lifetime)
    : container.registerAsyncFactory('target', matrixFactory, deps, lifetime)

  return {container, asyncKeys}
}

function startMatrixDependencies(
  container: MatrixContainer,
  keys: readonly string[]
): void {
  for (const key of keys) {
    pendingBenchmarkSetup.push(container.getAsync(key))
  }
}

function validateMatrixTarget(
  pending: Promise<unknown>,
  shape: MatrixShape
): void {
  pendingBenchmarkSetup.push(pending.then((value) => {
    const dependencyCount = value instanceof MatrixService
      ? value.dependencyCount
      : value

    if (dependencyCount !== shape.totalDeps) {
      throw new Error(`Invalid async benchmark fixture: ${shape.name}`)
    }
  }))
}

describe('async graph sync isolation', () => {
  const mixed = new Container()
    .registerValue('sync', {value: 1})
    .registerValue('syncDb', new Database())
    .registerFactory('transient', () => ({value: 1}), 'transient')
    .registerClass('syncClass', Repository, ['syncDb'], 'transient')
    .registerAsyncFactory('async', async () => new Database(), [])
  mixed.get('sync')

  bench('sync cache hit in mixed container', () => {
    sink = mixed.get('sync')
  })

  bench('sync transient resolve in mixed container', () => {
    sink = mixed.get('transient')
  })

  bench('sync transient class resolve in mixed container', () => {
    sink = mixed.get('syncClass')
  })

  bench('build mixed container + first sync resolve', () => {
    const c = new Container()
      .registerFactory('sync', () => ({value: 1}))
      .registerAsyncFactory('async', async () => new Database(), [])
    sink = c.get('sync')
  })
})

describe('async graph resolution', () => {
  const warm = new Container()
    .registerAsyncFactory('db', async () => new Database(), [])
  pendingBenchmarkSetup.push(warm.getAsync('db'))

  bench('async singleton warm resolve', async () => {
    sink = await warm.getAsync('db')
  })

  bench('build + first async singleton resolve', async () => {
    const c = new Container()
      .registerAsyncFactory('db', async () => new Database(), [])
    sink = await c.getAsync('db')
  }, {iterations: 1000})

  const scopedRoot = new Container()
    .registerAsyncFactory('db', async () => new Database(), [], 'scoped')

  bench('scope + first async scoped resolve', async () => {
    sink = await scopedRoot.createScope().getAsync('db')
  }, {iterations: 1000})

  const oneDep = new Container()
    .registerValue('a', 1)
    .registerAsyncFactory('value', async (a: number) => a, ['a'], 'transient')

  bench('async transient with one warmed dependency', async () => {
    sink = await oneDep.getAsync('value')
  })

  const fiveDeps = new Container()
    .registerValue('a', 1)
    .registerValue('b', 2)
    .registerValue('c', 3)
    .registerValue('d', 4)
    .registerValue('e', 5)
    .registerAsyncFactory(
      'value',
      async (a: number, b: number, c: number, d: number, e: number) => a + b + c + d + e,
      ['a', 'b', 'c', 'd', 'e'],
      'transient'
    )

  bench('async transient with five warmed dependencies', async () => {
    sink = await fiveDeps.getAsync('value')
  })

  const oneClass = new Container()
    .registerAsyncFactory('db', async () => new Database(), [])
    .registerClass('repository', Repository, ['db'], 'transient')
  pendingBenchmarkSetup.push(oneClass.getAsync('db'))

  bench('async class with one warmed dependency', async () => {
    sink = await oneClass.getAsync('repository')
  })

  const wideClass = new Container()
    .registerAsyncFactory('db', async () => new Database(), [])
    .registerValue('a', 1)
    .registerValue('b', 2)
    .registerValue('c', 3)
    .registerValue('d', 4)
    .registerClass('service', WideService, ['db', 'a', 'b', 'c', 'd'], 'transient')
  pendingBenchmarkSetup.push(wideClass.getAsync('db'))

  bench('async class with five mixed warmed dependencies', async () => {
    sink = await wideClass.getAsync('service')
  })

  bench('100-way singleton single-flight', async () => {
    const c = new Container()
      .registerAsyncFactory('db', async () => new Database(), [])
    sink = await Promise.all(Array.from({length: 100}, () => c.getAsync('db')))
  }, {iterations: 100})
})

describe('AsyncLazy overhead', () => {
  bench('register async factory + get wrapper', () => {
    sink = new Container()
      .registerAsyncFactory('db', () => new Database(), [], undefined, 'dbLazy')
      .get('dbLazy')
  })

  bench('register async factory + first wrapper.get()', async () => {
    const wrapper = new Container()
      .registerAsyncFactory('db', () => new Database(), [], undefined, 'dbLazy')
      .get('dbLazy')
    sink = await wrapper.get()
  }, {iterations: 1000})

  bench('register async factory + direct getAsync(target)', async () => {
    const c = new Container()
      .registerAsyncFactory('db', () => new Database(), [])
    sink = await c.getAsync('db')
  }, {iterations: 1000})

  const warm = new Container()
    .registerAsyncFactory('db', () => new Database(), [], undefined, 'dbLazy')
  const wrapper = warm.get('dbLazy')
  pendingBenchmarkSetup.push(wrapper.get())

  bench('warm singleton AsyncLazy.get()', async () => {
    sink = await wrapper.get()
  })
})

describe('registration-time async classification', () => {
  bench('register sync class with zero dependencies', () => {
    sink = new Container().registerClass('db', Database, [])
  })

  bench('register async factory with zero dependencies', () => {
    sink = new Container().registerAsyncFactory('value', () => 1, [])
  })

  bench('register async factory with one dependency', () => {
    sink = new Container()
      .registerValue('dependency', 1)
      .registerAsyncFactory('value', (dependency: number) => dependency, ['dependency'])
  })

  bench('register async class with one dependency', () => {
    sink = new Container()
      .registerAsyncFactory('db', () => new Database(), [])
      .registerClass('repository', Repository, ['db'])
  })

  bench('register async class with five dependencies', () => {
    sink = new Container()
      .registerAsyncFactory('db', () => new Database(), [])
      .registerValue('a', 1)
      .registerValue('b', 2)
      .registerValue('c', 3)
      .registerValue('d', 4)
      .registerClass('service', WideService, ['db', 'a', 'b', 'c', 'd'])
  })
})

describe('async dependency fast-lane matrix', () => {
  const shapes: readonly MatrixShape[] = [
    {name: 'factory 0 deps', target: 'factory', totalDeps: 0, asyncPositions: []},
    {name: 'factory 1 sync / 0 async', target: 'factory', totalDeps: 1, asyncPositions: []},
    {name: 'factory 5 sync / 0 async', target: 'factory', totalDeps: 5, asyncPositions: []},
    {name: 'factory 1 async first', target: 'factory', totalDeps: 5, asyncPositions: [0]},
    {name: 'factory 1 async middle', target: 'factory', totalDeps: 5, asyncPositions: [2]},
    {name: 'factory 1 async last', target: 'factory', totalDeps: 5, asyncPositions: [4]},
    {name: 'class 1 async first', target: 'class', totalDeps: 5, asyncPositions: [0]},
    {name: 'class 1 async middle', target: 'class', totalDeps: 5, asyncPositions: [2]},
    {name: 'class 1 async last', target: 'class', totalDeps: 5, asyncPositions: [4]},
    {name: 'factory 2 async', target: 'factory', totalDeps: 5, asyncPositions: [0, 4]},
    {name: 'class 2 async', target: 'class', totalDeps: 5, asyncPositions: [0, 4]}
  ]

  for (const fast of [false, true]) {
    const contract = fast ? 'fast' : 'checked'

    for (const shape of shapes) {
      const transient = buildMatrixGraph(fast, shape, 'transient')
      startMatrixDependencies(transient.container, transient.asyncKeys)
      validateMatrixTarget(transient.container.getAsync('target'), shape)

      bench(`${contract} / transient / ${shape.name}`, async () => {
        sink = await transient.container.getAsync('target')
      })

      const coldValidation = buildMatrixGraph(fast, shape, 'singleton')
      validateMatrixTarget(coldValidation.container.getAsync('target'), shape)

      bench(`${contract} / build + first singleton resolve / ${shape.name}`, async () => {
        const graph = buildMatrixGraph(fast, shape, 'singleton')
        sink = await graph.container.getAsync('target')
      }, {iterations: 1000})

      const warm = buildMatrixGraph(fast, shape, 'singleton')
      validateMatrixTarget(warm.container.getAsync('target'), shape)

      bench(`${contract} / singleton warm / ${shape.name}`, async () => {
        sink = await warm.container.getAsync('target')
      })

      const scoped = buildMatrixGraph(fast, shape, 'scoped')
      startMatrixDependencies(scoped.container, scoped.asyncKeys)
      validateMatrixTarget(scoped.container.createScope().getAsync('target'), shape)

      bench(`${contract} / scope + first scoped resolve / ${shape.name}`, async () => {
        sink = await scoped.container.createScope().getAsync('target')
      }, {iterations: 1000})
    }
  }
})

/* Benchmark collection is synchronous, so warm state must settle before timing starts */
await Promise.all(pendingBenchmarkSetup)
