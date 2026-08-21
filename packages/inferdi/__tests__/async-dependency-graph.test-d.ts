import {describe, it, expectTypeOf} from 'vitest'
import {
  Container,
  type AsyncLazy,
  type AsyncLazySpec,
  type AsyncSpec,
  type DependenciesMap,
  type Lazy,
  type LazySpec,
  type Module,
  type Spec,
  type WithRequirements,
  type SpecMap
} from '../src/Container'
import {
  type AsyncLazy as PublicAsyncLazy,
  type AsyncLazySpec as PublicAsyncLazySpec,
  type LazySpec as PublicLazySpec
} from '../src/index'
// @ts-expect-error — the type-only companion discriminant is not a public export
import type {lazyMode} from '../src/index'

class Config {
  public readonly url = 'postgres://localhost/app'
}

class Database {
  public readonly connected = true
}

class Repository {
  constructor(public readonly db: Database) {}
}

class Service {
  constructor(public readonly repository: Repository) {}
}

interface AssimilatedService {
  readonly assimilated: number
}

class ThenableService implements PromiseLike<AssimilatedService> {
  constructor(public readonly seed: number) {}

  public then<TResult1 = AssimilatedService, TResult2 = never>(
    onfulfilled?: ((value: AssimilatedService) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({assimilated: this.seed}).then(onfulfilled, onrejected)
  }
}

class AssimilatedConsumer {
  constructor(public readonly service: AssimilatedService) {}
}

class ThenableConsumer {
  constructor(public readonly service: ThenableService) {}
}

class Pair {
  constructor(
    public readonly first: Database,
    public readonly second: Database
  ) {}
}

class RepositoryService {
  constructor(public readonly repository: Repository) {}
}

class AsyncLazyConsumer {
  constructor(public readonly dbLazy: AsyncLazy<Database>) {}
}

class MixedLazyConsumer {
  constructor(
    public readonly dbLazy: Lazy<Database> | AsyncLazy<Database>
  ) {}
}

class SyncLazyConsumer {
  constructor(public readonly dbLazy: Lazy<Database>) {}
}

type GraphOf<C> = C extends Container<infer T> ? T : never

type Assignable<A, B> = [A] extends [B] ? true : false

type ExplicitMixedGraph = {
  database: Spec<Database, 'singleton'> | AsyncSpec<Database, 'singleton'>
}

declare const explicitMixedContainer: Container<ExplicitMixedGraph>

type UnwrapGraph = {
  sync: LazySpec<Database, 'singleton'>
  async: AsyncLazySpec<Database, 'singleton'>
  mixed: LazySpec<Database, 'singleton'> | AsyncLazySpec<Database, 'singleton'>
  promisedSync: LazySpec<Promise<Database>, 'singleton'>
  unmanagedSync: Spec<Lazy<Database>, 'transient'>
  unmanagedAsync: Spec<AsyncLazy<Database>, 'transient'>
}

declare const unwrapContainer: Container<UnwrapGraph>

type UnsafeCompanionGraph = {
  targetKindUnion: LazySpec<Database, 'singleton' | 'scoped'>
  managedUnmanagedUnion:
    LazySpec<Database, 'singleton'> |
    Spec<Lazy<Database>, 'transient'>
}

declare const unsafeCompanionContainer: Container<UnsafeCompanionGraph>

describe('async dependency graph types', () => {
  it('infers final service types for value, Promise, PromiseLike, and union results', () => {
    const maybeAsync = (): Database | Promise<Database> => new Database()
    const c = new Container()
      .registerAsyncFactory('value', () => new Database(), [])
      .registerAsyncFactory('promise', async () => new Database(), [])
      .registerAsyncFactory(
        'thenable',
        (): PromiseLike<Database> => Promise.resolve(new Database()),
        []
      )
      .registerAsyncFactory('union', maybeAsync, [])

    expectTypeOf(c.getAsync('value')).toEqualTypeOf<Promise<Database>>()
    expectTypeOf(c.getAsync('promise')).toEqualTypeOf<Promise<Database>>()
    expectTypeOf(c.getAsync('thenable')).toEqualTypeOf<Promise<Database>>()
    expectTypeOf(c.getAsync('union')).toEqualTypeOf<Promise<Database>>()

    type Resolved = Container.Resolve<typeof c>
    type ResolvedUnwrapped = Container.ResolveUnwrapped<typeof c>
    type Providers = Container.Providers<typeof c>
    expectTypeOf<Resolved['promise']>().toEqualTypeOf<Database>()
    expectTypeOf<ResolvedUnwrapped['promise']>().toEqualTypeOf<Database>()
    expectTypeOf<Providers['promise']>().toEqualTypeOf<() => Database>()
  })

  it('keeps Promise-valued sync registrations distinct from AsyncSpec', () => {
    const c = new Container()
      .registerFactory('legacy', () => Promise.resolve(new Database()))
      .registerAsyncFactory(
        'service',
        (legacy: Promise<Database>) => legacy,
        ['legacy']
      )

    expectTypeOf(c.get('legacy')).toEqualTypeOf<Promise<Database>>()
    expectTypeOf(c.getAsync('legacy')).toEqualTypeOf<Promise<Database>>()
    expectTypeOf(c.getAsync('service')).toEqualTypeOf<Promise<Database>>()
  })

  it('rejects async keys and mixed unions from get()', () => {
    const c = new Container()
      .registerValue('config', new Config())
      .registerValue('other', 1)
      .registerAsyncFactory('db', async () => new Database(), [])

    // @ts-expect-error — declarative async keys require getAsync()
    c.get('db')

    const mixed = 'config' as 'config' | 'db'
    // @ts-expect-error — the runtime union may select an async key
    c.get(mixed)

    const sync = 'config' as 'config' | 'other'
    expectTypeOf(c.get(sync)).toEqualTypeOf<Config | 1>()

    // @ts-expect-error — unknown keys are not ready registrations
    c.getAsync('missing')
  })

  it('checks async factory dependencies by position and arity', () => {
    const c = new Container()
      .registerValue('config', new Config())
      .registerValue('db', new Database())

    c.registerAsyncFactory(
      'repository',
      (config: Config, db: Database) => ({config, db}),
      ['config', 'db']
    )

    // @ts-expect-error — positional dependency order is wrong
    c.registerAsyncFactory('wrongOrder', (_config: Config, _db: Database) => 1, ['db', 'config'])
    // @ts-expect-error — one dependency is missing
    c.registerAsyncFactory('missing', (_config: Config, _db: Database) => 1, ['config'])
    // @ts-expect-error — one dependency is extra
    c.registerAsyncFactory('extra', (_config: Config) => 1, ['config', 'db'])
    // @ts-expect-error — dependency type is incompatible
    c.registerAsyncFactory('incompatible', (_db: Database) => 1, ['config'])
  })

  it('requires readonly tuples wherever async positions are classified', () => {
    const c = new Container()
      .registerValue('localDb', new Database())
      .registerAsyncFactory('remoteDb', async () => new Database(), [])
    const mutableFactoryDeps: ['localDb'] = ['localDb']
    const mutableClassDeps: ['remoteDb'] = ['remoteDb']
    const mutableUnionDeps: ['localDb' | 'remoteDb'] = ['localDb']

    // @ts-expect-error — async factories retain their classified dependency tuple
    c.registerAsyncFactory('factory', (db: Database) => db, mutableFactoryDeps)
    // @ts-expect-error — async classes retain their classified dependency tuple
    c.registerClass('repository', Repository, mutableClassDeps)
    // @ts-expect-error — a union that may select an async key must also be readonly
    c.registerClass('unionRepository', Repository, mutableUnionDeps)
    // @ts-expect-error — async lazy-class overloads retain the classified tuple
    c.registerClass('lazyRepository', Repository, mutableClassDeps, 'singleton', 'repositoryLazy')
    // @ts-expect-error — mixed lazy-class overloads retain the classified tuple
    c.registerClass('lazyUnionRepository', Repository, mutableUnionDeps, 'singleton', 'unionRepositoryLazy')

    const readonlyDeps = ['remoteDb'] as const
    c.registerClass('readonlyRepository', Repository, readonlyDeps)
    c.registerClass(
      'readonlyLazyRepository',
      Repository,
      readonlyDeps,
      'singleton',
      'readonlyRepositoryLazy'
    )

    const sync = new Container().registerValue('db', new Database())
    const mutableSyncDeps: ['db'] = ['db']
    sync.registerClass('syncRepository', Repository, mutableSyncDeps)
  })

  it('rejects duplicate async keys and lazy-key collisions', () => {
    const c = new Container().registerAsyncFactory('db', async () => new Database(), [])

    // @ts-expect-error — duplicate keys remain forbidden
    c.registerAsyncFactory('db', async () => new Database(), [])
    // @ts-expect-error — the companion cannot reuse its target key
    new Container().registerAsyncFactory('other', async () => new Database(), [], 'singleton', 'other')
    // @ts-expect-error — the companion cannot reuse an existing registration
    c.registerAsyncFactory('other', async () => new Database(), [], 'singleton', 'db')
  })

  it('preserves lifetime filtering for async factories', () => {
    const c = new Container()
      .registerClass('scopedDb', Database, [], 'scoped')
      .registerClass('transientDb', Database, [], 'transient')

    // @ts-expect-error — a singleton cannot depend on scoped state
    c.registerAsyncFactory('badScoped', (db: Database) => db, ['scopedDb'])
    // @ts-expect-error — a singleton cannot depend on transient state
    c.registerAsyncFactory('badTransient', (db: Database) => db, ['transientDb'])

    c.registerAsyncFactory('scopedOk', (db: Database) => db, ['scopedDb'], 'scoped')
    c.registerAsyncFactory('transientOk', (db: Database) => db, ['transientDb'], 'transient')

    const lazy = new Container()
      .registerClass('db', Database, [], 'singleton', 'dbLazy')
    lazy.registerAsyncFactory(
      'lazyOk',
      (db: Lazy<Database>) => db.get(),
      ['dbLazy']
    )
  })

  it('propagates async status transitively through classes', () => {
    const c = new Container()
      .registerAsyncFactory('db', async () => new Database(), [])
      .registerClass('repository', Repository, ['db'])
      .registerClass('service', Service, ['repository'])

    expectTypeOf(c.getAsync('repository')).toEqualTypeOf<Promise<Repository>>()
    expectTypeOf(c.getAsync('service')).toEqualTypeOf<Promise<Service>>()
    // @ts-expect-error — async status propagated from db
    c.get('repository')
    // @ts-expect-error — async status propagated through repository
    c.get('service')

    c.registerAsyncFactory('asyncFactoryConsumer', (db: Database) => db, ['db'])
  })

  it('models Promise assimilation for async and mixed thenable classes', () => {
    const sync = new Container()
      .registerValue('seed', 1)
      .registerClass(
        'service',
        ThenableService,
        ['seed'],
        'singleton',
        'serviceLazy'
      )

    expectTypeOf(sync.get('service')).toEqualTypeOf<ThenableService>()
    expectTypeOf(sync.getAsync('service')).toEqualTypeOf<Promise<AssimilatedService>>()
    expectTypeOf(sync.get('serviceLazy')).toEqualTypeOf<Lazy<ThenableService>>()

    const async = new Container()
      .registerAsyncFactory('seed', async () => 1, [])
      .registerClass(
        'service',
        ThenableService,
        ['seed'],
        'singleton',
        'serviceLazy'
      )
      .registerClass('consumer', AssimilatedConsumer, ['service'])

    expectTypeOf(async.getAsync('service')).toEqualTypeOf<Promise<AssimilatedService>>()
    expectTypeOf(async.getAsync('consumer')).toEqualTypeOf<Promise<AssimilatedConsumer>>()
    expectTypeOf(async.get('serviceLazy')).toEqualTypeOf<AsyncLazy<AssimilatedService>>()
    // @ts-expect-error — downstream classes receive the assimilated value
    async.registerClass('invalidConsumer', ThenableConsumer, ['service'])

    type AsyncResolved = Container.Resolve<typeof async>
    type AsyncUnwrapped = Container.ResolveUnwrapped<typeof async>
    expectTypeOf<AsyncResolved['service']>().toEqualTypeOf<AssimilatedService>()
    expectTypeOf<AsyncResolved['serviceLazy']>()
      .toEqualTypeOf<AsyncLazy<AssimilatedService>>()
    expectTypeOf<AsyncUnwrapped['service']>().toEqualTypeOf<AssimilatedService>()
    expectTypeOf<AsyncUnwrapped['serviceLazy']>().toEqualTypeOf<AssimilatedService>()
    expectTypeOf<Container.UnwrappedValue<typeof async, 'service'>>()
      .toEqualTypeOf<AssimilatedService>()
    expectTypeOf<Container.UnwrappedValue<typeof async, 'serviceLazy'>>()
      .toEqualTypeOf<AssimilatedService>()

    const mixedBase = new Container()
      .registerValue('localSeed', 1)
      .registerAsyncFactory('remoteSeed', async () => 2, [])
    const seedKey = 'localSeed' as 'localSeed' | 'remoteSeed'
    const mixed = mixedBase.registerClass(
      'service',
      ThenableService,
      [seedKey],
      'singleton',
      'serviceLazy'
    )

    expectTypeOf(mixed.getAsync('service')).toEqualTypeOf<Promise<AssimilatedService>>()
    expectTypeOf(mixed.get('serviceLazy')).toEqualTypeOf<
      Lazy<ThenableService> | AsyncLazy<AssimilatedService>
    >()
    // @ts-expect-error — the mixed key may select the async registration
    mixed.get('service')

    type MixedResolved = Container.Resolve<typeof mixed>
    type MixedUnwrapped = Container.ResolveUnwrapped<typeof mixed>
    expectTypeOf<MixedResolved['service']>()
      .toEqualTypeOf<ThenableService | AssimilatedService>()
    expectTypeOf<MixedUnwrapped['serviceLazy']>()
      .toEqualTypeOf<ThenableService | AssimilatedService>()
    expectTypeOf<Container.UnwrappedValue<typeof mixed, 'serviceLazy'>>()
      .toEqualTypeOf<ThenableService | AssimilatedService>()
  })

  it('classifies mixed sync/async union dependencies conservatively', () => {
    const c = new Container()
      .registerValue('localDb', new Database())
      .registerAsyncFactory('remoteDb', async () => new Database(), [])
    const dbKey = 'localDb' as 'localDb' | 'remoteDb'
    const c2 = c.registerClass('repository', Repository, [dbKey])

    expectTypeOf(c2.getAsync('repository')).toEqualTypeOf<Promise<Repository>>()
    // @ts-expect-error — the union may select remoteDb
    c2.get('repository')
    const lazy = c.registerClass(
      'lazyRepository',
      Repository,
      [dbKey],
      'singleton',
      'repositoryLazy'
    )
    expectTypeOf(lazy.get('repositoryLazy')).toEqualTypeOf<
      Lazy<Repository> | AsyncLazy<Repository>
    >()
  })

  it('creates AsyncLazy when a class has an async dependency', () => {
    const c = new Container().registerAsyncFactory('db', async () => new Database(), [])
    const lazy = c.registerClass(
      'repository',
      Repository,
      ['db'],
      'singleton',
      'repositoryLazy'
    )

    expectTypeOf(lazy.get('repositoryLazy')).toEqualTypeOf<AsyncLazy<Repository>>()
    // @ts-expect-error — async-propagated class remains unavailable through get()
    lazy.get('repository')
  })

  it('keeps sync factories away from async keys', () => {
    const c = new Container()
      .registerValue('config', new Config())
      .registerAsyncFactory('db', async () => new Database(), [])

    c.registerFactory('badResolver', (resolver) => {
      // @ts-expect-error — the resolver is sync-only
      return resolver.get('db')
    })

    // @ts-expect-error — deps-aware sync factories reject async dependency tuples
    c.registerFactory('badDeps', (resolver) => resolver.has('db'), ['db'])

    const mixed = 'config' as 'config' | 'db'
    // @ts-expect-error — mixed dependency unions are rejected as a whole
    c.registerFactory('badMixedDeps', (resolver) => resolver.has(mixed), [mixed])
  })

  it('accepts a ready override and rejects a Promise override', () => {
    const c = new Container().registerAsyncFactory('db', async () => new Database(), [])

    c.override('db', new Database())
    // @ts-expect-error — AsyncSpec stores the final Database type
    c.override('db', Promise.resolve(new Database()))
  })

  it('preserves scope-input requirements through async factories and classes', () => {
    class RequestContext {
      public readonly requestId = 'request'
    }
    class Session {
      constructor(public readonly request: RequestContext) {}
    }
    class RequestService {
      constructor(public readonly session: Session) {}
    }

    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .registerAsyncFactory(
        'session',
        async (request: RequestContext) => new Session(request),
        ['request'],
        'scoped'
      )
      .registerClass('service', RequestService, ['session'], 'scoped')

    // @ts-expect-error — request is not provided on root
    void root.getAsync('service').catch(() => {})

    const dynamic = '' as string
    if (root.has(dynamic)) {
      // @ts-expect-error — has() does not provide missing scope inputs
      void root.getAsync(dynamic).catch(() => {})
    }

    const request = new RequestContext()
    const scope = root.createScope({request})
    const nested = scope.createScope()
    expectTypeOf(scope.getAsync('service')).toEqualTypeOf<Promise<RequestService>>()
    expectTypeOf(nested.getAsync('service')).toEqualTypeOf<Promise<RequestService>>()

    if (scope.has(dynamic)) {
      scope.getAsync(dynamic)
      // @ts-expect-error — the narrowed key may still be async
      scope.get(dynamic)
    }
  })

  it('keeps dynamic has() narrowing ready-aware and sync-aware', () => {
    const c = new Container()
      .registerValue('config', new Config())
      .registerAsyncFactory('db', async () => new Database(), [])
    const dynamic = '' as string

    if (c.has(dynamic)) {
      c.getAsync(dynamic)
      // @ts-expect-error — the registered key may be async
      c.get(dynamic)
    }

    if (c.has(dynamic) && dynamic === 'config') {
      c.get(dynamic)
    }
  })

  it('exposes separate ready-key helpers for sync and async-capable resolvers', () => {
    function resolveSync<
      T extends DependenciesMap,
      K extends Container.SyncReadyKeys<Container<T>>
    >(container: Container<T>, key: K): T[K]['type'] {
      return container.get(key)
    }

    function resolveAny<
      T extends DependenciesMap,
      K extends Container.ReadyKeys<Container<T>>
    >(container: Container<T>, key: K): Promise<Awaited<T[K]['type']>> {
      return container.getAsync(key)
    }

    const c = new Container()
      .registerValue('config', new Config())
      .registerAsyncFactory('db', async () => new Database(), [])

    expectTypeOf(resolveSync(c, 'config')).toEqualTypeOf<Config>()
    // @ts-expect-error — SyncReadyKeys excludes declarative async keys
    resolveSync(c, 'db')
    expectTypeOf(resolveAny(c, 'db')).toEqualTypeOf<Promise<Database>>()
  })

  it('supports modules and string, symbol, broad, and union keys', () => {
    type Base = SpecMap<{config: Config}>
    type Added = {db: AsyncSpec<Database>}
    const addDatabase: Module<Base, Added> = (c) =>
      c.registerAsyncFactory('db', async (_config: Config) => new Database(), ['config'])
    void addDatabase

    const symbolKey = Symbol('db')
    const symbolContainer = new Container()
      .registerAsyncFactory(symbolKey, async () => new Database(), [])
    expectTypeOf(symbolContainer.getAsync(symbolKey)).toEqualTypeOf<Promise<Database>>()

    const broad = '' as string
    new Container().registerAsyncFactory(broad, async () => new Database(), [])

    const union = 'a' as 'a' | 'b'
    const unionContainer = new Container()
      .registerAsyncFactory(union, async () => new Database(), [])
    expectTypeOf(unionContainer.getAsync(union)).toEqualTypeOf<Promise<Database>>()
  })
})

describe('AsyncLazy type model', () => {
  it('classifies every dependency position before aggregating class state', () => {
    const base = new Container()
      .registerValue('localDb', new Database())
      .registerAsyncFactory('remoteDb', async () => new Database(), [])
      .registerAsyncFactory('backupDb', async () => new Database(), [])
    const mixedKey: 'localDb' | 'remoteDb' = Math.random() > 0.5
      ? 'localDb'
      : 'remoteDb'
    const asyncKey: 'remoteDb' | 'backupDb' = Math.random() > 0.5
      ? 'remoteDb'
      : 'backupDb'

    const sync = base.registerClass(
      'syncRepository',
      Repository,
      ['localDb'],
      'singleton',
      'syncRepositoryLazy'
    )
    expectTypeOf(sync.get('syncRepositoryLazy')).toEqualTypeOf<Lazy<Repository>>()

    const async = base.registerClass(
      'asyncRepository',
      Repository,
      ['remoteDb'],
      'singleton',
      'asyncRepositoryLazy'
    )
    expectTypeOf(async.get('asyncRepositoryLazy')).toEqualTypeOf<AsyncLazy<Repository>>()

    const mixed = base.registerClass(
      'mixedRepository',
      Repository,
      [mixedKey],
      'singleton',
      'mixedRepositoryLazy'
    )
    expectTypeOf(mixed.get('mixedRepositoryLazy')).toEqualTypeOf<
      Lazy<Repository> | AsyncLazy<Repository>
    >()

    const explicitMixed = explicitMixedContainer.registerClass(
      'repository',
      Repository,
      ['database'],
      'singleton',
      'repositoryLazy'
    )
    expectTypeOf(explicitMixed.get('repositoryLazy')).toEqualTypeOf<
      Lazy<Repository> | AsyncLazy<Repository>
    >()

    const allAsync = base.registerClass(
      'allAsyncRepository',
      Repository,
      [asyncKey],
      'singleton',
      'allAsyncRepositoryLazy'
    )
    expectTypeOf(allAsync.get('allAsyncRepositoryLazy')).toEqualTypeOf<
      AsyncLazy<Repository>
    >()

    const asyncWins = base.registerClass(
      'pair',
      Pair,
      [mixedKey, 'remoteDb'],
      'singleton',
      'pairLazy'
    )
    expectTypeOf(asyncWins.get('pairLazy')).toEqualTypeOf<AsyncLazy<Pair>>()

    const severalMixed = base.registerClass(
      'mixedPair',
      Pair,
      [mixedKey, mixedKey],
      'singleton',
      'mixedPairLazy'
    )
    expectTypeOf(severalMixed.get('mixedPairLazy')).toEqualTypeOf<
      Lazy<Pair> | AsyncLazy<Pair>
    >()

    const downstream = mixed.registerClass(
      'service',
      RepositoryService,
      ['mixedRepository'],
      'singleton',
      'serviceLazy'
    )
    expectTypeOf(downstream.get('serviceLazy')).toEqualTypeOf<
      Lazy<RepositoryService> | AsyncLazy<RepositoryService>
    >()
  })

  it('brands managed companions and keeps sync/async modes incompatible', () => {
    type StructuralSync = {
      readonly type: Lazy<Database>
      readonly lifetime: 'transient'
      readonly lazyOf: 'singleton'
    }
    type StructuralAsync = {
      readonly type: AsyncLazy<Database>
      readonly lifetime: 'transient'
      readonly lazyOf: 'singleton'
    }

    expectTypeOf<Assignable<StructuralSync, LazySpec<Database, 'singleton'>>>()
      .toEqualTypeOf<false>()
    expectTypeOf<Assignable<StructuralAsync, AsyncLazySpec<Database, 'singleton'>>>()
      .toEqualTypeOf<false>()
    expectTypeOf<Assignable<LazySpec<Database, 'singleton'>, StructuralSync>>()
      .toEqualTypeOf<true>()
    expectTypeOf<Assignable<AsyncLazySpec<Database, 'singleton'>, StructuralAsync>>()
      .toEqualTypeOf<true>()
    expectTypeOf<
      Assignable<LazySpec<Promise<Database>, 'singleton'>, AsyncLazySpec<Database, 'singleton'>>
    >().toEqualTypeOf<false>()
    expectTypeOf<
      Assignable<AsyncLazySpec<Database, 'singleton'>, LazySpec<Promise<Database>, 'singleton'>>
    >().toEqualTypeOf<false>()

    expectTypeOf<PublicAsyncLazy<Database>>().toEqualTypeOf<AsyncLazy<Database>>()
    expectTypeOf<PublicAsyncLazySpec<Database, 'singleton'>>()
      .toEqualTypeOf<AsyncLazySpec<Database, 'singleton'>>()
    expectTypeOf<PublicLazySpec<Database, 'singleton'>>()
      .toEqualTypeOf<LazySpec<Database, 'singleton'>>()
  })

  it('unwraps managed companions distributively and preserves unmanaged wrappers', () => {
    type Flat = Container.ResolveUnwrapped<typeof unwrapContainer>

    expectTypeOf<Flat['sync']>().toEqualTypeOf<Database>()
    expectTypeOf<Flat['async']>().toEqualTypeOf<Database>()
    expectTypeOf<Flat['mixed']>().toEqualTypeOf<Database>()
    expectTypeOf<Flat['promisedSync']>().toEqualTypeOf<Promise<Database>>()
    expectTypeOf<Flat['unmanagedSync']>().toEqualTypeOf<Lazy<Database>>()
    expectTypeOf<Flat['unmanagedAsync']>().toEqualTypeOf<AsyncLazy<Database>>()
  })

  it('keeps Promise-valued registerFactory companions synchronous', () => {
    const c = new Container().registerFactory(
      'legacy',
      async () => new Database(),
      'singleton',
      'legacyLazy'
    )

    expectTypeOf(c.get('legacyLazy')).toEqualTypeOf<Lazy<Promise<Database>>>()
    expectTypeOf<Container.ResolveUnwrapped<typeof c>['legacyLazy']>()
      .toEqualTypeOf<Promise<Database>>()
  })

  it('does not propagate async state through an AsyncLazy dependency', () => {
    const c = new Container()
      .registerAsyncFactory(
        'database',
        async () => new Database(),
        [],
        undefined,
        'databaseLazy'
      )
      .registerClass('consumer', AsyncLazyConsumer, ['databaseLazy'])

    expectTypeOf(c.get('consumer')).toEqualTypeOf<AsyncLazyConsumer>()
    expectTypeOf<
      Assignable<GraphOf<typeof c>['consumer'], AsyncSpec<AsyncLazyConsumer>>
    >().toEqualTypeOf<false>()
  })

  it('applies singleton lifetime rules to the complete companion entry', () => {
    const singleton = new Container()
      .registerClass('syncDb', Database, [], 'singleton', 'syncDbLazy')
      .registerAsyncFactory(
        'asyncDb',
        async () => new Database(),
        [],
        'singleton',
        'asyncDbLazy'
      )

    singleton.registerClass('syncConsumer', SyncLazyConsumer, ['syncDbLazy'])
    singleton.registerClass('asyncConsumer', AsyncLazyConsumer, ['asyncDbLazy'])

    const short = new Container()
      .registerClass('scopedDb', Database, [], 'scoped', 'scopedDbLazy')
      .registerAsyncFactory(
        'transientDb',
        async () => new Database(),
        [],
        'transient',
        'transientDbLazy'
      )

    // @ts-expect-error — singleton consumers cannot inject a scoped target companion
    short.registerClass('badScoped', SyncLazyConsumer, ['scopedDbLazy'])
    // @ts-expect-error — singleton consumers cannot inject a transient async target companion
    short.registerClass('badTransient', AsyncLazyConsumer, ['transientDbLazy'])

    const localOrRemote: 'localDb' | 'remoteDb' = Math.random() > 0.5
      ? 'localDb'
      : 'remoteDb'
    const mixedSingleton = new Container()
      .registerValue('localDb', new Database())
      .registerAsyncFactory('remoteDb', async () => new Database(), [])
      .registerClass(
        'database',
        Repository,
        [localOrRemote],
        'singleton',
        'databaseLazy'
      )
    class MixedRepositoryConsumer {
      constructor(
        readonly lazy: Lazy<Repository> | AsyncLazy<Repository>
      ) {}
    }
    mixedSingleton.registerClass(
      'mixedConsumer',
      MixedRepositoryConsumer,
      ['databaseLazy']
    )

    const targetKind: 'singleton' | 'scoped' = Math.random() > 0.5
      ? 'singleton'
      : 'scoped'
    const possibleScoped = new Container()
      .registerClass('db', Database, [], targetKind, 'dbLazy')
    // @ts-expect-error — a possibly scoped target is not singleton-safe
    possibleScoped.registerClass('bad', SyncLazyConsumer, ['dbLazy'])

    // @ts-expect-error — explicit target-lifetime unions are checked as a whole
    unsafeCompanionContainer.registerClass('badKind', SyncLazyConsumer, ['targetKindUnion'])
    // @ts-expect-error — a managed/unmanaged union is not singleton-safe
    unsafeCompanionContainer.registerClass('badUnion', SyncLazyConsumer, ['managedUnmanagedUnion'])
  })

  it('preserves shared requirements and brands through createScope', () => {
    interface RequestContext {
      readonly requestId: string
    }
    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .registerFactory(
        'localDb',
        (c) => {
          c.get('request')
          return new Database()
        },
        ['request'],
        'scoped'
      )
      .registerAsyncFactory(
        'remoteDb',
        async (_request: RequestContext) => new Database(),
        ['request'],
        'scoped'
      )
    const databaseKey: 'localDb' | 'remoteDb' = Math.random() > 0.5
      ? 'localDb'
      : 'remoteDb'
    const withCompanion = root.registerClass(
      'repository',
      Repository,
      [databaseKey],
      'scoped',
      'repositoryLazy'
    )
    type ExpectedRoot = WithRequirements<
      LazySpec<Repository, 'scoped'> | AsyncLazySpec<Repository, 'scoped'>,
      'request'
    >

    expectTypeOf<GraphOf<typeof withCompanion>['repositoryLazy']>()
      .toEqualTypeOf<ExpectedRoot>()
    // @ts-expect-error — both companion branches require the scope input
    withCompanion.get('repositoryLazy')

    const scope = withCompanion.createScope({
      request: {requestId: 'request'}
    })
    expectTypeOf<GraphOf<typeof scope>['repositoryLazy']>().toEqualTypeOf<
      LazySpec<Repository, 'scoped'> | AsyncLazySpec<Repository, 'scoped'>
    >()
    expectTypeOf(scope.get('repositoryLazy')).toEqualTypeOf<
      Lazy<Repository> | AsyncLazy<Repository>
    >()
  })

  it('keeps Providers, modules, and named declarations compatible', () => {
    const c = new Container().registerAsyncFactory(
      'database',
      async () => new Database(),
      [],
      undefined,
      'databaseLazy'
    )
    type Providers = Container.Providers<typeof c>
    expectTypeOf<Providers['database']>().toEqualTypeOf<() => Database>()
    expectTypeOf<Providers['databaseLazy']>().toEqualTypeOf<
      () => AsyncLazy<Database>
    >()

    type Added = {
      database: AsyncSpec<Database, 'singleton'>
      databaseLazy: AsyncLazySpec<Database, 'singleton'>
    }
    const module: Module<Record<never, never>, Added> = (container) =>
      container.registerAsyncFactory(
        'database',
        async () => new Database(),
        [],
        undefined,
        'databaseLazy'
      )

    function consumeNamed(container: Container<Added>): void {
      expectTypeOf(container.get('databaseLazy')).toEqualTypeOf<
        AsyncLazy<Database>
      >()
      expectTypeOf(container.getAsync('database')).toEqualTypeOf<
        Promise<Database>
      >()
    }

    void module
    void consumeNamed
  })
})
