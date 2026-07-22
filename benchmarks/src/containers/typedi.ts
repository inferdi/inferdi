import 'reflect-metadata'
import { Container } from 'typedi'
import * as F from '../fixtures/typedi.js'
import type { Resolver } from './types.js'

/*
 * Lazy: a thunk; each call resolves Logger from the global container.
 * Registered once globally (statically) so LazyConsumer can inject it via @Inject(LAZY_LOGGER_TOKEN)
 */
Container.set({
  id: F.LAZY_LOGGER_TOKEN,
  factory: () => () => Container.get(F.Logger)
})

const SCOPE_ID = 'scope-test'
const BUILD_ID = 'build-test'

export function buildRoot(): Resolver {
  return {
    resolveService: () => Container.get(F.TypedDIService),
    resolveTransient: () => Container.get(F.TransientService),
    resolveDeep: () => Container.get(F.L9),
    resolveWide4: () => Container.get(F.Wide4),
    resolveWide10: () => Container.get(F.Wide10),
    buildAndResolve: () => {
      /*
       * Fresh child container per iteration. After reset, the next iteration gets a "clean" instance.
       * The cost for TypeDI is only child creation + first resolve (see README, fairness note)
       */
      const c = Container.of(BUILD_ID)
      const v = c.get(F.TypedDIService)
      Container.reset(BUILD_ID)
      return v
    },
    scopedResolveAndDispose: () => {
      /*
       * Static id + reset — zero allocations, fresh-after-reset semantics.
       * ScopedService has no @Service() — Container.of(id).set() actually creates a scope-local instance
       */
      const c = Container.of(SCOPE_ID)
      c.set({ id: 'scoped', type: F.ScopedService })
      const v = c.get<F.ScopedService>('scoped')
      Container.reset(SCOPE_ID)
      return v
    },
    resolveLazy: () => Container.get(F.LazyConsumer).use()
  }
}
