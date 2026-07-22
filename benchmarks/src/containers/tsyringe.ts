import 'reflect-metadata'
import { container as rootContainer, Lifecycle, type DependencyContainer } from 'tsyringe'
import * as F from '../fixtures/tsyringe.js'
import type { Resolver } from './types.js'

const T = F.TOKENS

function configure(c: DependencyContainer): DependencyContainer {
  c.register(T.Logger, { useClass: F.Logger }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Config, { useClass: F.Config }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Repo, { useClass: F.Repo }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Service, { useClass: F.Service }, { lifecycle: Lifecycle.Singleton })
  c.register(T.TransientService, { useClass: F.TransientService }, { lifecycle: Lifecycle.Transient })
  // ContainerScoped — cached in the child container; clearInstances() actually disposes it
  c.register(T.ScopedService, { useClass: F.ScopedService }, { lifecycle: Lifecycle.ContainerScoped })
  c.register(T.Wide4, { useClass: F.Wide4 }, { lifecycle: Lifecycle.Transient })
  c.register(T.Dep0, { useClass: F.Dep0 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep1, { useClass: F.Dep1 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep2, { useClass: F.Dep2 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep3, { useClass: F.Dep3 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep4, { useClass: F.Dep4 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep5, { useClass: F.Dep5 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep6, { useClass: F.Dep6 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep7, { useClass: F.Dep7 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep8, { useClass: F.Dep8 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Dep9, { useClass: F.Dep9 }, { lifecycle: Lifecycle.Singleton })
  c.register(T.Wide10, { useClass: F.Wide10 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L0, { useClass: F.L0 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L1, { useClass: F.L1 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L2, { useClass: F.L2 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L3, { useClass: F.L3 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L4, { useClass: F.L4 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L5, { useClass: F.L5 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L6, { useClass: F.L6 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L7, { useClass: F.L7 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L8, { useClass: F.L8 }, { lifecycle: Lifecycle.Transient })
  c.register(T.L9, { useClass: F.L9 }, { lifecycle: Lifecycle.Transient })
  // Lazy — factory provider; each thunk invocation resolves the logger anew
  c.register(T.LazyLogger, { useFactory: (dep) => () => dep.resolve(T.Logger) })
  c.register(T.LazyConsumer, { useClass: F.LazyConsumer }, { lifecycle: Lifecycle.Singleton })
  return c
}

const root = configure(rootContainer.createChildContainer())

export function buildRoot(): Resolver {
  return {
    resolveService: () => root.resolve(T.Service),
    resolveTransient: () => root.resolve(T.TransientService),
    resolveDeep: () => root.resolve(T.L9),
    resolveWide4: () => root.resolve(T.Wide4),
    resolveWide10: () => root.resolve(T.Wide10),
    buildAndResolve: () => configure(rootContainer.createChildContainer()).resolve(T.Service),
    scopedResolveAndDispose: () => {
      const s = root.createChildContainer()
      const v = s.resolve(T.ScopedService)
      s.clearInstances()
      return v
    },
    resolveLazy: () => (root.resolve(T.LazyConsumer) as F.LazyConsumer).use()
  }
}
