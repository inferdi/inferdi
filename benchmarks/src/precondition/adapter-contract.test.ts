import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { SUBJECT_NAMES } from '../containers/subject-names.js'
import { orderSubjects, subjects } from '../containers/subjects.js'
import type { DeepValue, Resolver, ScopeHandle, ServiceValue } from '../containers/types.js'

function expectServiceGraph(resolver: Resolver, service: ServiceValue): void {
  const logger = resolver.resolveLogger()
  const config = resolver.resolveConfig()
  const repo = resolver.resolveRepo()

  expect(service.logger).toBe(logger)
  expect(service.repo).toBe(repo)
  expect(repo.logger).toBe(logger)
  expect(repo.config).toBe(config)
}

function deepNodes(value: DeepValue): object[] {
  const l8 = value.l8
  const l7 = l8.l7
  const l6 = l7.l6
  const l5 = l6.l5
  const l4 = l5.l4
  const l3 = l4.l3
  const l2 = l3.l2
  const l1 = l2.l1
  return [value, l8, l7, l6, l5, l4, l3, l2, l1, l1.l0]
}

function wide10Dependencies(value: ReturnType<Resolver['resolveWide10']>): object[] {
  return [
    value.dep0,
    value.dep1,
    value.dep2,
    value.dep3,
    value.dep4,
    value.dep5,
    value.dep6,
    value.dep7,
    value.dep8,
    value.dep9
  ]
}

async function releaseScope(scope: ScopeHandle): Promise<void> {
  await scope.release()
}

for (const subject of subjects) {
  describe(`adapter contract: ${subject.name}`, () => {
    it('preserves singleton and transient identities', () => {
      const resolver = subject.build()
      const service = resolver.resolveService()
      const transientA = resolver.resolveTransient()
      const transientB = resolver.resolveTransient()

      expect(resolver.resolveService()).toBe(service)
      expectServiceGraph(resolver, service)
      expect(transientA).not.toBe(transientB)
      expect(transientA.repo).toBe(service.repo)
      expect(transientB.repo).toBe(service.repo)
      expect(transientA.logger).toBe(service.logger)
      expect(transientB.logger).toBe(service.logger)
    })

    it('builds equivalent deep and wide graphs', () => {
      const resolver = subject.build()
      const deepA = deepNodes(resolver.resolveDeep())
      const deepB = deepNodes(resolver.resolveDeep())
      const wide4A = resolver.resolveWide4()
      const wide4B = resolver.resolveWide4()
      const wide10A = wide10Dependencies(resolver.resolveWide10())
      const wide10B = wide10Dependencies(resolver.resolveWide10())

      expect(deepA).toHaveLength(10)
      expect(deepB).toHaveLength(10)
      for (let index = 0; index < deepA.length; index++) {
        expect(deepA[index]).not.toBe(deepB[index])
      }

      expect(wide4A).not.toBe(wide4B)
      expect(wide4A.logger).toBe(resolver.resolveLogger())
      expect(wide4A.config).toBe(resolver.resolveConfig())
      expect(wide4A.repo).toBe(resolver.resolveRepo())
      expect(wide4A.service).toBe(resolver.resolveService())
      expect(wide4B.logger).toBe(wide4A.logger)
      expect(wide4B.config).toBe(wide4A.config)
      expect(wide4B.repo).toBe(wide4A.repo)
      expect(wide4B.service).toBe(wide4A.service)

      for (let index = 0; index < wide10A.length; index++) {
        expect(wide10A[index]).toBe(wide10B[index])
      }
    })

    it('keeps cold graphs independent and registration resolve-free', async () => {
      const resolver = subject.build()
      const coldA = resolver.createColdGraph()
      const coldB = resolver.createColdGraph()
      const serviceA = coldA.resolveService()
      const serviceB = coldB.resolveService()

      expect(coldA.resolveService()).toBe(serviceA)
      expect(coldB.resolveService()).toBe(serviceB)
      expect(serviceA).not.toBe(serviceB)
      expect(serviceA.repo).not.toBe(serviceB.repo)
      expect(serviceA.logger).not.toBe(serviceB.logger)
      expect(serviceA.repo.config).not.toBe(serviceB.repo.config)
      expect(serviceA.logger).toBe(serviceA.repo.logger)
      expect(serviceB.logger).toBe(serviceB.repo.logger)

      await coldA.release()
      await coldB.release()

      if (resolver.registerGraph) {
        const registered = resolver.registerGraph()
        const registeredService = registered.resolveService()
        expect(registered.resolveService()).toBe(registeredService)
        expect(registeredService.logger).toBe(registeredService.repo.logger)
        await registered.release()
      } else {
        expect(subject.name).toBe(SUBJECT_NAMES.typedi)
      }
    })

    it('uses a root singleton from isolated request scopes', async () => {
      const resolver = subject.build()
      const rootLogger = resolver.resolveLogger()
      const scopeA = resolver.createScope()
      const scopeB = resolver.createScope()
      const scopedA = scopeA.resolve()
      const scopedB = scopeB.resolve()

      expect(scopeA.resolve()).toBe(scopedA)
      expect(scopeB.resolve()).toBe(scopedB)
      expect(scopedA).not.toBe(scopedB)
      expect(scopedA.logger).toBe(rootLogger)
      expect(scopedB.logger).toBe(rootLogger)

      await releaseScope(scopeA)
      await releaseScope(scopeB)
    })

    it('resolves lazy dependencies to the root singleton', () => {
      const resolver = subject.build()
      const logger = resolver.resolveLogger()

      expect(resolver.resolveLazy()).toBe(logger)
      expect(resolver.resolveLazy()).toBe(logger)
    })

    it('matches its declared teardown capability', async () => {
      const resolver = subject.build()
      const supportsSync = resolver.teardown === 'sync' || resolver.teardown === 'both'
      const supportsAsync = resolver.teardown === 'async' || resolver.teardown === 'both'
      const capabilityScope = resolver.createScope()

      expect(capabilityScope.disposeSync !== undefined).toBe(supportsSync)
      expect(capabilityScope.disposeAsync !== undefined).toBe(supportsAsync)
      await capabilityScope.release()

      if (supportsSync) {
        const scope = resolver.createScope()
        const value = scope.resolve()
        expect(scope.disposeSync).toBeTypeOf('function')
        expect(value.disposeCount).toBe(0)
        scope.disposeSync!()
        expect(value.disposeCount).toBe(1)
      }

      if (supportsAsync) {
        const scope = resolver.createScope()
        const value = scope.resolve()
        expect(scope.disposeAsync).toBeTypeOf('function')
        expect(value.disposeCount).toBe(0)
        await scope.disposeAsync!()
        expect(value.disposeCount).toBe(1)
      }
    })
  })
}

describe('balanced subject order', () => {
  it('places every subject once in every process position', () => {
    const positions = new Map(subjects.map((subject) => [subject.name, new Set<number>()]))

    for (let round = 1; round <= subjects.length; round++) {
      orderSubjects(round).forEach((subject, position) => positions.get(subject.name)!.add(position))
    }

    for (const subjectPositions of positions.values()) {
      expect(subjectPositions.size).toBe(subjects.length)
    }
  })

  it('uses every ordered adjacent subject pair once per block', () => {
    const pairs = new Map<string, number>()

    for (let round = 1; round <= subjects.length; round++) {
      const ordered = orderSubjects(round)
      for (let position = 1; position < ordered.length; position++) {
        const pair = `${ordered[position - 1]!.name}\0${ordered[position]!.name}`
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1)
      }
    }

    expect(pairs.size).toBe(subjects.length * (subjects.length - 1))
    for (const count of pairs.values()) expect(count).toBe(1)
  })

  it('balances the relative order of checked and fast modes', () => {
    let checkedBeforeFast = 0
    let fastBeforeChecked = 0

    for (let round = 1; round <= subjects.length; round++) {
      const names = orderSubjects(round).map((subject) => subject.name)
      if (
        names.indexOf(SUBJECT_NAMES.inferdiDefault) <
        names.indexOf(SUBJECT_NAMES.inferdiFast)
      ) checkedBeforeFast++
      else fastBeforeChecked++
    }

    expect(checkedBeforeFast).toBe(subjects.length / 2)
    expect(fastBeforeChecked).toBe(subjects.length / 2)
  })
})
