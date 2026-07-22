import {describe, expect, it} from 'vitest'
import {Container} from '../src/Container'

interface Service {
  readonly id: number
  readonly values: readonly unknown[]
}

type RuntimeCtor = new (...values: unknown[]) => Service

interface RuntimeContainer {
  registerValue(key: string, value: unknown): RuntimeContainer
  registerClass(
    key: string,
    Ctor: RuntimeCtor,
    deps: string[],
    kind: 'singleton' | 'transient'
  ): RuntimeContainer
  get(key: string): unknown
}

const TIER_UP_AT = 4096
const LANE_CAPACITY = [2, 8, 4, 1] as const

function createCtor(id: number): RuntimeCtor {
  return class {
    public readonly values: readonly unknown[]

    public constructor(...values: unknown[]) {
      this.values = values
    }

    public readonly id = id
  }
}

function resolvePastTier(container: RuntimeContainer, key: string): Service {
  let value: Service | undefined
  for (let index = 0; index <= TIER_UP_AT; index++) {
    value = container.get(key) as Service
  }
  return value!
}

describe('registerClass construct IC lanes', () => {
  it('promotes every protected lane, reuses constructor lanes, and quarantines overflow', () => {
    for (let arity = 0; arity < LANE_CAPACITY.length; arity++) {
      const constructors = Array.from(
        {length: LANE_CAPACITY[arity]},
        (_, lane) => createCtor(arity * 100 + lane)
      )

      for (let lane = 0; lane < constructors.length; lane++) {
        const container = new Container({strict: false}) as unknown as RuntimeContainer
        const deps = Array.from({length: arity}, (_, index) => `a${arity}l${lane}d${index}`)
        const expected = deps.map((_, index) => arity * 1_000 + lane * 10 + index)

        for (let index = 0; index < deps.length; index++) {
          container.registerValue(deps[index]!, expected[index])
        }
        container.registerClass('service', constructors[lane]!, deps, 'transient')

        const value = resolvePastTier(container, 'service')
        expect(value.id).toBe(arity * 100 + lane)
        expect(value.values).toEqual(expected)
      }

      const reused = new Container({strict: false}) as unknown as RuntimeContainer
      const reusedDeps = Array.from({length: arity}, (_, index) => `reused${index}`)
      const reusedExpected = reusedDeps.map((_, index) => arity * 10_000 + index)
      for (let index = 0; index < reusedDeps.length; index++) {
        reused.registerValue(reusedDeps[index]!, reusedExpected[index])
      }
      reused.registerClass('service', constructors[0]!, reusedDeps, 'transient')

      const reusedValue = resolvePastTier(reused, 'service')
      expect(reusedValue.id).toBe(arity * 100)
      expect(reusedValue.values).toEqual(reusedExpected)

      const overflow = new Container({strict: false}) as unknown as RuntimeContainer
      const overflowDeps = Array.from({length: arity}, (_, index) => `overflow${index}`)
      const overflowExpected = overflowDeps.map((_, index) => arity * 100_000 + index)
      for (let index = 0; index < overflowDeps.length; index++) {
        overflow.registerValue(overflowDeps[index]!, overflowExpected[index])
      }
      overflow.registerClass('service', createCtor(arity * 100 + 99), overflowDeps, 'transient')

      const overflowValue = resolvePastTier(overflow, 'service')
      expect(overflowValue.id).toBe(arity * 100 + 99)
      expect(overflowValue.values).toEqual(overflowExpected)
    }
  })
})
