import {describe, it, expectTypeOf} from 'vitest'
import {
  Container,
  type AsyncSpec,
  type DependenciesMap,
  type Lazy,
  type Module,
  type SpecMap
} from '../src/Container'

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

    const readonlyDeps = ['remoteDb'] as const
    c.registerClass('readonlyRepository', Repository, readonlyDeps)

    const sync = new Container().registerValue('db', new Database())
    const mutableSyncDeps: ['db'] = ['db']
    sync.registerClass('syncRepository', Repository, mutableSyncDeps)
  })

  it('rejects duplicate async keys and an async lazy companion form', () => {
    const c = new Container().registerAsyncFactory('db', async () => new Database(), [])

    // @ts-expect-error — duplicate keys remain forbidden
    c.registerAsyncFactory('db', async () => new Database(), [])
    // @ts-expect-error — registerAsyncFactory has no lazyKey overload
    new Container().registerAsyncFactory('other', async () => new Database(), [], 'singleton', 'otherLazy')
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

  it('classifies mixed sync/async union dependencies conservatively', () => {
    const c = new Container()
      .registerValue('localDb', new Database())
      .registerAsyncFactory('remoteDb', async () => new Database(), [])
    const dbKey = 'localDb' as 'localDb' | 'remoteDb'
    const c2 = c.registerClass('repository', Repository, [dbKey])

    expectTypeOf(c2.getAsync('repository')).toEqualTypeOf<Promise<Repository>>()
    // @ts-expect-error — the union may select remoteDb
    c2.get('repository')
    // @ts-expect-error — a potentially async class cannot expose synchronous Lazy
    c.registerClass('lazyRepository', Repository, [dbKey], 'singleton', 'repositoryLazy')
  })

  it('rejects lazyKey when a class has an async dependency', () => {
    const c = new Container().registerAsyncFactory('db', async () => new Database(), [])

    // @ts-expect-error — Lazy<T>.get() cannot represent an async target
    c.registerClass('repository', Repository, ['db'], 'singleton', 'repositoryLazy')
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
    c.registerFactory('badDeps', ['db'], (resolver) => resolver.has('db'))

    const mixed = 'config' as 'config' | 'db'
    // @ts-expect-error — mixed dependency unions are rejected as a whole
    c.registerFactory('badMixedDeps', [mixed], (resolver) => resolver.has(mixed))
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
