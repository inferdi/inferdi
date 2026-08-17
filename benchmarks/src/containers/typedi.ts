import 'reflect-metadata'
import { Container } from 'typedi'
import * as F from '../fixtures/typedi.js'
import type { ColdGraph, Resolver, ScopeHandle } from './types.js'

Container.set({
  id: F.LAZY_LOGGER_TOKEN,
  factory: () => () => Container.get(F.Logger)
})

let coldGraphId = 0
let scopeId = 0

function createColdGraph(): ColdGraph {
  const id = `build-${coldGraphId++}`
  const container = Container.of(id)

  return {
    resolveService: () => container.get(F.TypedDIService),
    release: () => { Container.reset(id) }
  }
}

export function buildRoot(): Resolver {
  return {
    teardown: 'sync',
    release: () => { Container.reset() },
    resolveLogger: () => Container.get(F.Logger),
    resolveConfig: () => Container.get(F.Config),
    resolveRepo: () => Container.get(F.Repo),
    resolveService: () => Container.get(F.TypedDIService),
    resolveTransient: () => Container.get(F.TransientService),
    resolveDeep: () => Container.get(F.L9),
    resolveWide4: () => Container.get(F.Wide4),
    resolveWide10: () => Container.get(F.Wide10),
    createColdGraph,
    createScope: (): ScopeHandle => {
      const id = `scope-${scopeId++}`
      const scope = Container.of(id)
      scope.set({ id: 'scoped', type: F.ScopedService })

      return {
        resolve: () => scope.get<F.ScopedService>('scoped'),
        release: () => { Container.reset(id) },
        disposeSync: () => { Container.reset(id) }
      }
    },
    resolveLazy: () => Container.get(F.LazyConsumer).use()
  }
}
