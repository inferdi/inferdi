import { createContainer, asClass, asFunction, InjectionMode, type AwilixContainer } from 'awilix'

/*
 * Awilix's cradle is typed via the generic parameter AwilixContainer<T>.
 * We register 30+ keys for benchmarks; describing the exact shape is not worth it — use Record<string, any>
 */
type Cradle = Record<string, any>
type Container = AwilixContainer<Cradle>
import {
  Logger, Config, Repo, Service, TransientService, ScopedService,
  Wide4, Wide10, Dep0, Dep1, Dep2, Dep3, Dep4, Dep5, Dep6, Dep7, Dep8, Dep9,
  L0, L1, L2, L3, L4, L5, L6, L7, L8, L9,
  LazyConsumer
} from '../fixtures/plain.js'
import type { Resolver } from './types.js'

/*
 * PROXY mode: the factory receives the cradle proxy as its first argument.
 * asClass(Cls) in PROXY would call new Cls(cradle) — a positional constructor would get the proxy
 * in the first parameter and `undefined` for the rest → silent graph corruption. We use asFunction wrappers
 */
function configureProxy(): Container {
  const c: Container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY })
  c.register({
    logger: asClass(Logger).singleton(),
    config: asClass(Config).singleton(),
    repo: asFunction(({ logger, config }) => new Repo(logger, config)).singleton(),
    service: asFunction(({ repo, logger }) => new Service(repo, logger)).singleton(),
    transientService: asFunction(({ repo, logger }) => new TransientService(repo, logger)).transient(),
    scoped: asFunction(({ logger }) => new ScopedService(logger)).scoped(),
    wide4: asFunction(({ logger, config, repo, service }) => new Wide4(logger, config, repo, service)).transient(),
    dep0: asClass(Dep0).singleton(),
    dep1: asClass(Dep1).singleton(),
    dep2: asClass(Dep2).singleton(),
    dep3: asClass(Dep3).singleton(),
    dep4: asClass(Dep4).singleton(),
    dep5: asClass(Dep5).singleton(),
    dep6: asClass(Dep6).singleton(),
    dep7: asClass(Dep7).singleton(),
    dep8: asClass(Dep8).singleton(),
    dep9: asClass(Dep9).singleton(),
    wide10: asFunction(({ dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9 }) =>
      new Wide10(dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9)).transient(),
    l0: asClass(L0).transient(),
    l1: asFunction(({ l0 }) => new L1(l0)).transient(),
    l2: asFunction(({ l1 }) => new L2(l1)).transient(),
    l3: asFunction(({ l2 }) => new L3(l2)).transient(),
    l4: asFunction(({ l3 }) => new L4(l3)).transient(),
    l5: asFunction(({ l4 }) => new L5(l4)).transient(),
    l6: asFunction(({ l5 }) => new L6(l5)).transient(),
    l7: asFunction(({ l6 }) => new L7(l6)).transient(),
    l8: asFunction(({ l7 }) => new L8(l7)).transient(),
    l9: asFunction(({ l8 }) => new L9(l8)).transient(),
    // Lazy via a cradle-bound closure (deferred resolve)
    lazyLogger: asFunction((cradle) => () => cradle.logger).singleton(),
    lazyConsumer: asFunction(({ lazyLogger }) => new LazyConsumer(lazyLogger)).singleton()
  })
  return c
}

/*
 * CLASSIC mode: Awilix parses the constructor source with a regex and resolves by parameter name.
 * asClass(Cls) → new Cls(...resolved positional dependencies) — compatible with plain TS classes
 */
function configureClassic(): Container {
  const c: Container = createContainer<Cradle>({ injectionMode: InjectionMode.CLASSIC })
  c.register({
    logger: asClass(Logger).singleton(),
    config: asClass(Config).singleton(),
    repo: asClass(Repo).singleton(),
    service: asClass(Service).singleton(),
    transientService: asClass(TransientService).transient(),
    scoped: asClass(ScopedService).scoped(),
    wide4: asClass(Wide4).transient(),
    dep0: asClass(Dep0).singleton(),
    dep1: asClass(Dep1).singleton(),
    dep2: asClass(Dep2).singleton(),
    dep3: asClass(Dep3).singleton(),
    dep4: asClass(Dep4).singleton(),
    dep5: asClass(Dep5).singleton(),
    dep6: asClass(Dep6).singleton(),
    dep7: asClass(Dep7).singleton(),
    dep8: asClass(Dep8).singleton(),
    dep9: asClass(Dep9).singleton(),
    wide10: asClass(Wide10).transient(),
    l0: asClass(L0).transient(),
    l1: asClass(L1).transient(),
    l2: asClass(L2).transient(),
    l3: asClass(L3).transient(),
    l4: asClass(L4).transient(),
    l5: asClass(L5).transient(),
    l6: asClass(L6).transient(),
    l7: asClass(L7).transient(),
    l8: asClass(L8).transient(),
    l9: asClass(L9).transient(),
    // Lazy in CLASSIC: a 0-arg factory closing over `container` — there is no native deferred mode
    lazyLogger: asFunction(() => () => c.cradle.logger).singleton(),
    lazyConsumer: asFunction(() => new LazyConsumer(c.cradle.lazyLogger)).singleton()
  })
  return c
}

export function buildRootProxy(): Resolver {
  const root = configureProxy()
  return makeResolver(root, configureProxy)
}

export function buildRootClassic(): Resolver {
  const root = configureClassic()
  return makeResolver(root, configureClassic)
}

function makeResolver(root: Container, fresh: () => Container): Resolver {
  return {
    resolveService: () => root.cradle.service,
    resolveTransient: () => root.cradle.transientService,
    resolveDeep: () => root.cradle.l9,
    resolveWide4: () => root.cradle.wide4,
    resolveWide10: () => root.cradle.wide10,
    buildAndResolve: () => fresh().cradle.service,
    scopedResolveAndDispose: () => {
      const s = root.createScope()
      const v = s.cradle.scoped
      // No cleanup — root does not track scopes. dispose() is async-only, not allowed in bench
      return v
    },
    resolveLazy: () => (root.cradle.lazyConsumer as LazyConsumer).use()
  }
}
