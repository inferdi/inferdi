import { createContainer, asClass, asFunction, InjectionMode, type AwilixContainer } from 'awilix'
import {
  Logger, Config, Repo, Service, TransientService, ScopedService,
  Wide4, Wide10, Dep0, Dep1, Dep2, Dep3, Dep4, Dep5, Dep6, Dep7, Dep8, Dep9,
  L0, L1, L2, L3, L4, L5, L6, L7, L8, L9,
  LazyConsumer
} from '../fixtures/plain.js'
import type { ColdGraph, Resolver, ScopeHandle } from './types.js'

type Cradle = Record<string, any>
type Container = AwilixContainer<Cradle>

function configureProxy(): Container {
  const container: Container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY })
  container.register({
    logger: asClass(Logger).singleton(),
    config: asClass(Config).singleton(),
    repo: asFunction(({ logger, config }) => new Repo(logger, config)).singleton(),
    service: asFunction(({ repo, logger }) => new Service(repo, logger)).singleton(),
    transientService: asFunction(({ repo, logger }) => new TransientService(repo, logger)).transient(),
    scoped: asFunction(({ logger }) => new ScopedService(logger)).scoped().disposer((value) => value.dispose()),
    wide4: asFunction(({ logger, config, repo, service }) =>
      new Wide4(logger, config, repo, service)).transient(),
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
    lazyLogger: asFunction((cradle) => () => cradle.logger).singleton(),
    lazyConsumer: asFunction(({ lazyLogger }) => new LazyConsumer(lazyLogger)).singleton()
  })
  return container
}

function configureClassic(): Container {
  const container: Container = createContainer<Cradle>({ injectionMode: InjectionMode.CLASSIC })
  container.register({
    logger: asClass(Logger).singleton(),
    config: asClass(Config).singleton(),
    repo: asClass(Repo).singleton(),
    service: asClass(Service).singleton(),
    transientService: asClass(TransientService).transient(),
    scoped: asClass(ScopedService).scoped().disposer((value) => value.dispose()),
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
    lazyLogger: asFunction(() => () => container.cradle.logger).singleton(),
    lazyConsumer: asFunction(() => new LazyConsumer(container.cradle.lazyLogger)).singleton()
  })
  return container
}

function coldGraph(configure: () => Container): ColdGraph {
  const container = configure()

  return {
    resolveService: () => container.cradle.service,
    release: () => container.dispose()
  }
}

export function buildRootProxy(): Resolver {
  return makeResolver(configureProxy(), configureProxy)
}

export function buildRootClassic(): Resolver {
  return makeResolver(configureClassic(), configureClassic)
}

function makeResolver(root: Container, configure: () => Container): Resolver {
  return {
    teardown: 'async',
    release: () => root.dispose(),
    resolveLogger: () => root.cradle.logger,
    resolveConfig: () => root.cradle.config,
    resolveRepo: () => root.cradle.repo,
    resolveService: () => root.cradle.service,
    resolveTransient: () => root.cradle.transientService,
    resolveDeep: () => root.cradle.l9,
    resolveWide4: () => root.cradle.wide4,
    resolveWide10: () => root.cradle.wide10,
    registerGraph: () => coldGraph(configure),
    createColdGraph: () => coldGraph(configure),
    createScope: (): ScopeHandle => {
      const scope = root.createScope()

      return {
        resolve: () => scope.cradle.scoped,
        release: () => scope.dispose(),
        disposeAsync: () => scope.dispose()
      }
    },
    resolveLazy: () => (root.cradle.lazyConsumer as LazyConsumer).use()
  }
}
