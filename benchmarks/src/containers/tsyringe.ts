import 'reflect-metadata'
import { container as rootContainer, Lifecycle, type DependencyContainer } from 'tsyringe'
import * as F from '../fixtures/tsyringe.js'
import type { ColdGraph, Resolver, ScopeHandle } from './types.js'

const T = F.TOKENS

function configure(container: DependencyContainer): DependencyContainer {
  container.register(T.Logger, { useClass: F.Logger }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Config, { useClass: F.Config }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Repo, { useClass: F.Repo }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Service, { useClass: F.Service }, { lifecycle: Lifecycle.Singleton })
  container.register(
    T.TransientService,
    { useClass: F.TransientService },
    { lifecycle: Lifecycle.Transient }
  )
  container.register(
    T.ScopedService,
    { useClass: F.ScopedService },
    { lifecycle: Lifecycle.ContainerScoped }
  )
  container.register(T.Wide4, { useClass: F.Wide4 }, { lifecycle: Lifecycle.Transient })
  container.register(T.Dep0, { useClass: F.Dep0 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep1, { useClass: F.Dep1 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep2, { useClass: F.Dep2 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep3, { useClass: F.Dep3 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep4, { useClass: F.Dep4 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep5, { useClass: F.Dep5 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep6, { useClass: F.Dep6 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep7, { useClass: F.Dep7 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep8, { useClass: F.Dep8 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Dep9, { useClass: F.Dep9 }, { lifecycle: Lifecycle.Singleton })
  container.register(T.Wide10, { useClass: F.Wide10 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L0, { useClass: F.L0 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L1, { useClass: F.L1 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L2, { useClass: F.L2 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L3, { useClass: F.L3 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L4, { useClass: F.L4 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L5, { useClass: F.L5 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L6, { useClass: F.L6 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L7, { useClass: F.L7 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L8, { useClass: F.L8 }, { lifecycle: Lifecycle.Transient })
  container.register(T.L9, { useClass: F.L9 }, { lifecycle: Lifecycle.Transient })
  container.register(T.LazyLogger, { useFactory: (dependency) => () => dependency.resolve(T.Logger) })
  container.register(
    T.LazyConsumer,
    { useClass: F.LazyConsumer },
    { lifecycle: Lifecycle.Singleton }
  )
  return container
}

function coldGraph(): ColdGraph {
  const container = configure(rootContainer.createChildContainer())

  return {
    resolveService: () => container.resolve(T.Service),
    release: () => container.dispose()
  }
}

export function buildRoot(): Resolver {
  const root = configure(rootContainer.createChildContainer())

  return {
    teardown: 'async',
    release: () => root.dispose(),
    resolveLogger: () => root.resolve(T.Logger),
    resolveConfig: () => root.resolve(T.Config),
    resolveRepo: () => root.resolve(T.Repo),
    resolveService: () => root.resolve(T.Service),
    resolveTransient: () => root.resolve(T.TransientService),
    resolveDeep: () => root.resolve(T.L9),
    resolveWide4: () => root.resolve(T.Wide4),
    resolveWide10: () => root.resolve(T.Wide10),
    registerGraph: coldGraph,
    createColdGraph: coldGraph,
    createScope: (): ScopeHandle => {
      const scope = root.createChildContainer()

      return {
        resolve: () => scope.resolve(T.ScopedService),
        release: () => scope.dispose(),
        disposeAsync: async () => { await scope.dispose() }
      }
    },
    resolveLazy: () => root.resolve<F.LazyConsumer>(T.LazyConsumer).use()
  }
}
