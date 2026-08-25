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

const REPEATED_RESOLVES = 4097
const CONSTRUCTOR_POOL_SIZES = [2, 8, 4, 1] as const

function createCtor(id: number): RuntimeCtor {
  return class {
    public readonly values: readonly unknown[]

    public constructor(...values: unknown[]) {
      this.values = values
    }

    public readonly id = id
  }
}

function resolveRepeatedly(container: RuntimeContainer, key: string): Service {
  let value: Service | undefined
  for (let index = 0; index < REPEATED_RESOLVES; index++) {
    value = container.get(key) as Service
  }
  return value!
}

describe('registerClass constructor-pool stress', () => {
  it('preserves constructor identity and dependency order after repeated resolves', () => {
    for (let arity = 0; arity < CONSTRUCTOR_POOL_SIZES.length; arity++) {
      const constructors = Array.from(
        {length: CONSTRUCTOR_POOL_SIZES[arity]},
        (_, constructorIndex) => createCtor(arity * 100 + constructorIndex)
      )

      for (let constructorIndex = 0; constructorIndex < constructors.length; constructorIndex++) {
        const container = new Container({fast: true}) as unknown as RuntimeContainer
        const deps = Array.from(
          {length: arity},
          (_, index) => `a${arity}c${constructorIndex}d${index}`
        )
        const expected = deps.map(
          (_, index) => arity * 1_000 + constructorIndex * 10 + index
        )

        for (let index = 0; index < deps.length; index++) {
          container.registerValue(deps[index]!, expected[index])
        }
        container.registerClass(
          'service',
          constructors[constructorIndex]!,
          deps,
          'transient'
        )

        const value = resolveRepeatedly(container, 'service')
        expect(value.id).toBe(arity * 100 + constructorIndex)
        expect(value.values).toEqual(expected)
      }

      const reused = new Container({fast: true}) as unknown as RuntimeContainer
      const reusedDeps = Array.from({length: arity}, (_, index) => `reused${index}`)
      const reusedExpected = reusedDeps.map((_, index) => arity * 10_000 + index)
      for (let index = 0; index < reusedDeps.length; index++) {
        reused.registerValue(reusedDeps[index]!, reusedExpected[index])
      }
      reused.registerClass('service', constructors[0]!, reusedDeps, 'transient')

      const reusedValue = resolveRepeatedly(reused, 'service')
      expect(reusedValue.id).toBe(arity * 100)
      expect(reusedValue.values).toEqual(reusedExpected)

      const extra = new Container({fast: true}) as unknown as RuntimeContainer
      const extraDeps = Array.from({length: arity}, (_, index) => `extra${index}`)
      const extraExpected = extraDeps.map((_, index) => arity * 100_000 + index)
      for (let index = 0; index < extraDeps.length; index++) {
        extra.registerValue(extraDeps[index]!, extraExpected[index])
      }
      extra.registerClass(
        'service',
        createCtor(arity * 100 + 99),
        extraDeps,
        'transient'
      )

      const extraValue = resolveRepeatedly(extra, 'service')
      expect(extraValue.id).toBe(arity * 100 + 99)
      expect(extraValue.values).toEqual(extraExpected)
    }
  })
})
