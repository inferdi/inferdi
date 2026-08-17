import 'reflect-metadata'
import { Container } from 'inversify'
import * as F from '../fixtures/inversify.js'
import type { ColdGraph, Resolver, ScopeHandle } from './types.js'

const T = F.TOKENS

function configureRoot(): Container {
  const container = new Container()
  container.bind(T.Logger).to(F.Logger).inSingletonScope()
  container.bind(T.Config).to(F.Config).inSingletonScope()
  container.bind(T.Repo).to(F.Repo).inSingletonScope()
  container.bind(T.Service).to(F.Service).inSingletonScope()
  container.bind(T.TransientService).to(F.TransientService).inTransientScope()
  container.bind(T.Wide4).to(F.Wide4).inTransientScope()
  container.bind(T.Dep0).to(F.Dep0).inSingletonScope()
  container.bind(T.Dep1).to(F.Dep1).inSingletonScope()
  container.bind(T.Dep2).to(F.Dep2).inSingletonScope()
  container.bind(T.Dep3).to(F.Dep3).inSingletonScope()
  container.bind(T.Dep4).to(F.Dep4).inSingletonScope()
  container.bind(T.Dep5).to(F.Dep5).inSingletonScope()
  container.bind(T.Dep6).to(F.Dep6).inSingletonScope()
  container.bind(T.Dep7).to(F.Dep7).inSingletonScope()
  container.bind(T.Dep8).to(F.Dep8).inSingletonScope()
  container.bind(T.Dep9).to(F.Dep9).inSingletonScope()
  container.bind(T.Wide10).to(F.Wide10).inTransientScope()
  container.bind(T.L0).to(F.L0).inTransientScope()
  container.bind(T.L1).to(F.L1).inTransientScope()
  container.bind(T.L2).to(F.L2).inTransientScope()
  container.bind(T.L3).to(F.L3).inTransientScope()
  container.bind(T.L4).to(F.L4).inTransientScope()
  container.bind(T.L5).to(F.L5).inTransientScope()
  container.bind(T.L6).to(F.L6).inTransientScope()
  container.bind(T.L7).to(F.L7).inTransientScope()
  container.bind(T.L8).to(F.L8).inTransientScope()
  container.bind(T.L9).to(F.L9).inTransientScope()
  container.bind<() => F.Logger>(T.LazyLogger)
    .toDynamicValue(({ get }) => () => get(T.Logger))
    .inSingletonScope()
  container.bind(T.LazyConsumer).to(F.LazyConsumer).inSingletonScope()
  return container
}

function coldGraph(): ColdGraph {
  const container = configureRoot()

  return {
    resolveService: () => container.get(T.Service),
    release: () => container.unbindAll()
  }
}

export function buildRoot(): Resolver {
  const root = configureRoot()

  return {
    teardown: 'none',
    requiresCleanupTurn: true,
    release: () => root.unbindAll(),
    resolveLogger: () => root.get(T.Logger),
    resolveConfig: () => root.get(T.Config),
    resolveRepo: () => root.get(T.Repo),
    resolveService: () => root.get(T.Service),
    resolveTransient: () => root.get(T.TransientService),
    resolveDeep: () => root.get(T.L9),
    resolveWide4: () => root.get(T.Wide4),
    resolveWide10: () => root.get(T.Wide10),
    registerGraph: coldGraph,
    createColdGraph: coldGraph,
    createScope: (): ScopeHandle => {
      const scope = new Container({ parent: root })
      scope.bind(T.ScopedService).to(F.ScopedService).inSingletonScope()

      return {
        resolve: () => scope.get(T.ScopedService),
        release: () => scope.unbindAll()
      }
    },
    resolveLazy: () => root.get<F.LazyConsumer>(T.LazyConsumer).use()
  }
}
