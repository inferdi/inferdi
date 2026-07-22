import {bench, describe} from 'vitest'
import {Container} from '../src/Container'

type Kind = 'singleton' | 'transient' | 'scoped'

interface Service {
  readonly checksum: number
}

type RuntimeCtor = new (...deps: number[]) => Service

interface RuntimeContainer {
  registerValue(key: string, value: number): RuntimeContainer
  registerClass(
    key: string,
    Ctor: RuntimeCtor,
    deps: string[],
    kind: Kind
  ): RuntimeContainer
  createScope(): RuntimeContainer
  get(key: string): number | Service
}

interface Fixture {
  readonly container: RuntimeContainer
  readonly expected: readonly number[]
  readonly keys: readonly string[]
}

const ARITIES = [0, 1, 2, 3, 4, 5, 6, 7] as const
const POOL_SIZES = [1, 2, 4, 8, 16] as const
const MAX_POOL_SIZE = POOL_SIZES[POOL_SIZES.length - 1]
const BENCH_OPTIONS = {time: 300, warmupTime: 150} as const

let sink = 0

function createCtor(arity: number, id: number): RuntimeCtor {
  if (arity === 0) {
    return class { readonly checksum = id }
  }
  if (arity === 1) {
    return class { constructor(readonly checksum: number) { this.checksum += id } }
  }
  if (arity === 2) {
    return class { readonly checksum: number; constructor(a0: number, a1: number) { this.checksum = id + a0 + a1 } }
  }
  if (arity === 3) {
    return class { readonly checksum: number; constructor(a0: number, a1: number, a2: number) { this.checksum = id + a0 + a1 + a2 } }
  }
  if (arity === 4) {
    return class { readonly checksum: number; constructor(a0: number, a1: number, a2: number, a3: number) { this.checksum = id + a0 + a1 + a2 + a3 } }
  }
  if (arity === 5) {
    return class { readonly checksum: number; constructor(a0: number, a1: number, a2: number, a3: number, a4: number) { this.checksum = id + a0 + a1 + a2 + a3 + a4 } }
  }
  if (arity === 6) {
    return class { readonly checksum: number; constructor(a0: number, a1: number, a2: number, a3: number, a4: number, a5: number) { this.checksum = id + a0 + a1 + a2 + a3 + a4 + a5 } }
  }
  return class { readonly checksum: number; constructor(a0: number, a1: number, a2: number, a3: number, a4: number, a5: number, a6: number) { this.checksum = id + a0 + a1 + a2 + a3 + a4 + a5 + a6 } }
}

const CTORS = ARITIES.map((arity) =>
  Array.from({length: MAX_POOL_SIZE}, (_, id) => createCtor(arity, id))
)

function buildFixture(
  arity: number,
  poolSize: number,
  kind: Kind,
  strict: boolean,
  distinctDependencyKeys = false
): Fixture {
  const container = new Container({strict}) as unknown as RuntimeContainer
  const sharedDeps = Array.from({length: arity}, (_, index) => `dep${index}`)

  for (let index = 0; index < arity; index++) container.registerValue(sharedDeps[index]!, index + 1)

  const keys = Array.from({length: poolSize}, (_, index) => `service${index}`)
  const expected: number[] = []

  for (let index = 0; index < poolSize; index++) {
    const deps = distinctDependencyKeys
      ? Array.from({length: arity}, (_, dependency) => `service${index}dep${dependency}`)
      : sharedDeps
    let dependencySum = 0
    if (distinctDependencyKeys) {
      for (let dependency = 0; dependency < deps.length; dependency++) {
        const value = (index + 1) * 100 + dependency + 1
        dependencySum += value
        container.registerValue(deps[dependency]!, value)
      }
    } else {
      dependencySum = arity * (arity + 1) / 2
    }
    expected.push(dependencySum + index)
    container.registerClass(keys[index]!, CTORS[arity]![index]!, deps, kind)
  }

  return {container, expected, keys}
}

for (const arity of [1, 3] as const) {
  describe(`registerClass distinct dependency keys: arity ${arity}`, () => {
    const strictFixture = buildFixture(arity, MAX_POOL_SIZE, 'transient', true, true)
    const fastFixture = buildFixture(arity, MAX_POOL_SIZE, 'transient', false, true)
    consumeAll(strictFixture)
    consumeAll(fastFixture)

    bench('hot transient, strict, 16 unique Ctor', hotResolve(strictFixture), BENCH_OPTIONS)
    bench('hot transient, fast, 16 unique Ctor', hotResolve(fastFixture), BENCH_OPTIONS)
    bench('build + first resolve, transient, 16 unique Ctor', () => {
      consumeAll(buildFixture(arity, MAX_POOL_SIZE, 'transient', true, true))
    }, BENCH_OPTIONS)
  })
}

function consumeAll(fixture: Fixture, container = fixture.container): void {
  for (let index = 0; index < fixture.keys.length; index++) {
    const value = container.get(fixture.keys[index]!) as Service
    if (value.checksum !== fixture.expected[index]) {
      throw new Error(`Invalid benchmark fixture at index ${index}`)
    }
    sink ^= value.checksum
  }
}

function hotResolve(fixture: Fixture): () => void {
  let index = 0
  const mask = fixture.keys.length - 1

  return () => {
    const value = fixture.container.get(fixture.keys[index]!) as Service
    sink ^= value.checksum
    index = (index + 1) & mask
  }
}

for (const arity of ARITIES) {
  describe(`registerClass construct IC: arity ${arity}`, () => {
    for (const poolSize of POOL_SIZES) {
      const strictFixture = buildFixture(arity, poolSize, 'transient', true)
      const fastFixture = buildFixture(arity, poolSize, 'transient', false)
      consumeAll(strictFixture)
      consumeAll(fastFixture)

      bench(
        `hot transient, strict, ${poolSize} unique Ctor`,
        hotResolve(strictFixture),
        BENCH_OPTIONS
      )
      bench(
        `hot transient, fast, ${poolSize} unique Ctor`,
        hotResolve(fastFixture),
        BENCH_OPTIONS
      )
    }

    bench(`build transient graph, ${MAX_POOL_SIZE} unique Ctor`, () => {
      sink ^= buildFixture(arity, MAX_POOL_SIZE, 'transient', true).keys.length
    }, BENCH_OPTIONS)

    bench(`build + first resolve, transient, ${MAX_POOL_SIZE} unique Ctor`, () => {
      consumeAll(buildFixture(arity, MAX_POOL_SIZE, 'transient', true))
    }, BENCH_OPTIONS)

    bench(`build + first resolve, singleton, ${MAX_POOL_SIZE} unique Ctor`, () => {
      consumeAll(buildFixture(arity, MAX_POOL_SIZE, 'singleton', true))
    }, BENCH_OPTIONS)

    const scoped = buildFixture(arity, MAX_POOL_SIZE, 'scoped', true)
    bench(`new scope + first resolve, scoped, ${MAX_POOL_SIZE} unique Ctor`, () => {
      consumeAll(scoped, scoped.container.createScope())
    }, BENCH_OPTIONS)
  })
}
