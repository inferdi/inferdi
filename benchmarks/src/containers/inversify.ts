import 'reflect-metadata'
import { Container } from 'inversify'
import * as F from '../fixtures/inversify.js'
import type { Resolver } from './types.js'

const T = F.TOKENS

function configureRoot() {
  const c = new Container()
  c.bind(T.Logger).to(F.Logger).inSingletonScope()
  c.bind(T.Config).to(F.Config).inSingletonScope()
  c.bind(T.Repo).to(F.Repo).inSingletonScope()
  c.bind(T.Service).to(F.Service).inSingletonScope()
  c.bind(T.TransientService).to(F.TransientService).inTransientScope()
  c.bind(T.Wide4).to(F.Wide4).inTransientScope()
  c.bind(T.Dep0).to(F.Dep0).inSingletonScope()
  c.bind(T.Dep1).to(F.Dep1).inSingletonScope()
  c.bind(T.Dep2).to(F.Dep2).inSingletonScope()
  c.bind(T.Dep3).to(F.Dep3).inSingletonScope()
  c.bind(T.Dep4).to(F.Dep4).inSingletonScope()
  c.bind(T.Dep5).to(F.Dep5).inSingletonScope()
  c.bind(T.Dep6).to(F.Dep6).inSingletonScope()
  c.bind(T.Dep7).to(F.Dep7).inSingletonScope()
  c.bind(T.Dep8).to(F.Dep8).inSingletonScope()
  c.bind(T.Dep9).to(F.Dep9).inSingletonScope()
  c.bind(T.Wide10).to(F.Wide10).inTransientScope()
  c.bind(T.L0).to(F.L0).inTransientScope()
  c.bind(T.L1).to(F.L1).inTransientScope()
  c.bind(T.L2).to(F.L2).inTransientScope()
  c.bind(T.L3).to(F.L3).inTransientScope()
  c.bind(T.L4).to(F.L4).inTransientScope()
  c.bind(T.L5).to(F.L5).inTransientScope()
  c.bind(T.L6).to(F.L6).inTransientScope()
  c.bind(T.L7).to(F.L7).inTransientScope()
  c.bind(T.L8).to(F.L8).inTransientScope()
  c.bind(T.L9).to(F.L9).inTransientScope()
  // Lazy: a thunk via toDynamicValue. Every lazy() call hits container.get()
  c.bind<() => F.Logger>(T.LazyLogger).toDynamicValue(({ get }) => () => get(T.Logger)).inSingletonScope()
  c.bind(T.LazyConsumer).to(F.LazyConsumer).inSingletonScope()
  return c
}

export function buildRoot(): Resolver {
  const root = configureRoot()

  return {
    resolveService: () => root.get(T.Service),
    resolveTransient: () => root.get(T.TransientService),
    resolveDeep: () => root.get(T.L9),
    resolveWide4: () => root.get(T.Wide4),
    resolveWide10: () => root.get(T.Wide10),
    buildAndResolve: () => configureRoot().get(T.Service),
    scopedResolveAndDispose: () => {
      // Inversify v8 has no native scope lifecycle — a local bind in the child gives honest semantics
      const s = new Container({ parent: root })
      s.bind(T.ScopedService).to(F.ScopedService).inSingletonScope()
      const v = s.get(T.ScopedService)
      // No cleanup — the child is not tracked by the parent, GC will collect it
      return v
    },
    resolveLazy: () => (root.get(T.LazyConsumer) as F.LazyConsumer).use()
  }
}
