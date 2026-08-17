import { Container } from '@inferdi/inferdi'
import {
  Logger, Config, Repo, Service, TransientService, ScopedService,
  Wide4, Wide10, Dep0, Dep1, Dep2, Dep3, Dep4, Dep5, Dep6, Dep7, Dep8, Dep9,
  L0, L1, L2, L3, L4, L5, L6, L7, L8, L9,
  LazyConsumer
} from '../fixtures/plain.js'
import type { ColdGraph, Resolver, ScopeHandle } from './types.js'

function configureRoot(fast: boolean) {
  return new Container({ fast })
    .registerClass('logger', Logger, [], 'singleton', 'lazyLogger')
    .registerClass('config', Config, [], 'singleton')
    .registerClass('repo', Repo, ['logger', 'config'], 'singleton')
    .registerClass('service', Service, ['repo', 'logger'], 'singleton')
    .registerClass('transientService', TransientService, ['repo', 'logger'], 'transient')
    .registerClass('scoped', ScopedService, ['logger'], 'scoped')
    .registerClass('wide4', Wide4, ['logger', 'config', 'repo', 'service'], 'transient')
    .registerClass('dep0', Dep0, [], 'singleton')
    .registerClass('dep1', Dep1, [], 'singleton')
    .registerClass('dep2', Dep2, [], 'singleton')
    .registerClass('dep3', Dep3, [], 'singleton')
    .registerClass('dep4', Dep4, [], 'singleton')
    .registerClass('dep5', Dep5, [], 'singleton')
    .registerClass('dep6', Dep6, [], 'singleton')
    .registerClass('dep7', Dep7, [], 'singleton')
    .registerClass('dep8', Dep8, [], 'singleton')
    .registerClass('dep9', Dep9, [], 'singleton')
    .registerClass(
      'wide10',
      Wide10,
      ['dep0', 'dep1', 'dep2', 'dep3', 'dep4', 'dep5', 'dep6', 'dep7', 'dep8', 'dep9'],
      'transient'
    )
    .registerClass('l0', L0, [], 'transient')
    .registerClass('l1', L1, ['l0'], 'transient')
    .registerClass('l2', L2, ['l1'], 'transient')
    .registerClass('l3', L3, ['l2'], 'transient')
    .registerClass('l4', L4, ['l3'], 'transient')
    .registerClass('l5', L5, ['l4'], 'transient')
    .registerClass('l6', L6, ['l5'], 'transient')
    .registerClass('l7', L7, ['l6'], 'transient')
    .registerClass('l8', L8, ['l7'], 'transient')
    .registerClass('l9', L9, ['l8'], 'transient')
    .registerClass('lazyConsumer', LazyConsumer, ['lazyLogger'], 'singleton')
}

function coldGraph(fast: boolean): ColdGraph {
  const container = configureRoot(fast)

  return {
    resolveService: () => container.get('service'),
    release: () => container[Symbol.dispose]()
  }
}

export function buildRoot(fast = false): Resolver {
  const root = configureRoot(fast)

  return {
    teardown: 'both',
    release: () => root[Symbol.dispose](),
    resolveLogger: () => root.get('logger'),
    resolveConfig: () => root.get('config'),
    resolveRepo: () => root.get('repo'),
    resolveService: () => root.get('service'),
    resolveTransient: () => root.get('transientService'),
    resolveDeep: () => root.get('l9'),
    resolveWide4: () => root.get('wide4'),
    resolveWide10: () => root.get('wide10'),
    registerGraph: () => coldGraph(fast),
    createColdGraph: () => coldGraph(fast),
    createScope: (): ScopeHandle => {
      const scope = root.createScope()

      return {
        resolve: () => scope.get('scoped'),
        release: () => scope[Symbol.dispose](),
        disposeSync: () => scope[Symbol.dispose](),
        disposeAsync: () => scope.dispose()
      }
    },
    resolveLazy: () => (root.get('lazyConsumer') as LazyConsumer).use()
  }
}
