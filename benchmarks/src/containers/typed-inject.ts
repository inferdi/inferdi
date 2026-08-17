import { createInjector, Scope, type Injector } from 'typed-inject'
import {
  Logger, Config, Repo, Service, TransientService, ScopedService,
  Wide4, Wide10, Dep0, Dep1, Dep2, Dep3, Dep4, Dep5, Dep6, Dep7, Dep8, Dep9,
  L0, L1, L2, L3, L4, L5, L6, L7, L8, L9,
  LazyConsumer
} from '../fixtures/typed-inject.js'
import type { ColdGraph, Resolver, ScopeHandle } from './types.js'

const lazyLoggerFactory = Object.assign(
  ($injector: Injector<{ logger: Logger }>) => () => $injector.resolve('logger'),
  { inject: ['$injector'] as const }
)

function configureRoot() {
  return createInjector()
    .provideClass('logger', Logger)
    .provideClass('config', Config)
    .provideClass('repo', Repo)
    .provideClass('service', Service)
    .provideClass('transientService', TransientService, Scope.Transient)
    .provideClass('wide4', Wide4, Scope.Transient)
    .provideClass('dep0', Dep0)
    .provideClass('dep1', Dep1)
    .provideClass('dep2', Dep2)
    .provideClass('dep3', Dep3)
    .provideClass('dep4', Dep4)
    .provideClass('dep5', Dep5)
    .provideClass('dep6', Dep6)
    .provideClass('dep7', Dep7)
    .provideClass('dep8', Dep8)
    .provideClass('dep9', Dep9)
    .provideClass('wide10', Wide10, Scope.Transient)
    .provideClass('l0', L0, Scope.Transient)
    .provideClass('l1', L1, Scope.Transient)
    .provideClass('l2', L2, Scope.Transient)
    .provideClass('l3', L3, Scope.Transient)
    .provideClass('l4', L4, Scope.Transient)
    .provideClass('l5', L5, Scope.Transient)
    .provideClass('l6', L6, Scope.Transient)
    .provideClass('l7', L7, Scope.Transient)
    .provideClass('l8', L8, Scope.Transient)
    .provideClass('l9', L9, Scope.Transient)
    .provideFactory('lazyLogger', lazyLoggerFactory)
    .provideClass('lazyConsumer', LazyConsumer)
}

function coldGraph(): ColdGraph {
  const container = configureRoot()

  return {
    resolveService: () => container.resolve('service'),
    release: () => container.dispose()
  }
}

export function buildRoot(): Resolver {
  const root = configureRoot()

  return {
    teardown: 'async',
    release: () => root.dispose(),
    resolveLogger: () => root.resolve('logger'),
    resolveConfig: () => root.resolve('config'),
    resolveRepo: () => root.resolve('repo'),
    resolveService: () => root.resolve('service'),
    resolveTransient: () => root.resolve('transientService'),
    resolveDeep: () => root.resolve('l9'),
    resolveWide4: () => root.resolve('wide4'),
    resolveWide10: () => root.resolve('wide10'),
    registerGraph: coldGraph,
    createColdGraph: coldGraph,
    createScope: (): ScopeHandle => {
      const scope = root.createChildInjector().provideClass('scoped', ScopedService)

      return {
        resolve: () => scope.resolve('scoped'),
        release: () => scope.dispose(),
        disposeAsync: () => scope.dispose()
      }
    },
    resolveLazy: () => root.resolve('lazyConsumer').use()
  }
}
