import {describe, it, expectTypeOf} from 'vitest'
import {
  Container,
  type DependenciesMap,
  type Lazy,
  type LazySpec,
  type Module,
  type ScopeInputMap,
  type Spec,
  type SpecMap,
  type WithRequirements
} from '../src/Container'

/*
 * ────────────────────────────────────────────────────────────────────────────
 * Phase 4 — Type-level tests (fluent API)
 *
 * Run via `pnpm run test:types` (vitest --typecheck).
 * Vitest enforces @ts-expect-error: if the marked line has NO TS error, the
 * test fails. So these comments simultaneously verify negative cases
 * (must not compile) and positive cases (must compile).
 * ────────────────────────────────────────────────────────────────────────────
 */

interface Logger {
  log(msg: string): void
}
interface UserRepo {
  find(id: string): {id: string}
}
interface UserService {
  run(): string
}

class L implements Logger {
  log(_m: string) {}
}
class UserRepoImpl implements UserRepo {
  find(_id: string) {
    return {id: 'x'}
  }
}
class UserServiceImpl implements UserService {
  constructor(private readonly repo: UserRepo, private readonly logger: Logger) {}
  run() {
    this.logger.log('run')
    return this.repo.find('x').id
  }
}

describe('Phase 4 — fluent: T accumulation while chaining', () => {
  it('every register* narrows the container type', () => {
    const c = new Container()
      .registerValue('config', {port: 8080})
      .registerClass('logger', L, [])

    expectTypeOf(c.get('config')).toEqualTypeOf<{readonly port: 8080}>()
    expectTypeOf(c.get('logger')).toEqualTypeOf<L>()
  })

  it('use() passes the accumulated T both inwards and outwards', () => {
    const c = new Container()
      .registerValue('a', 1 as const)
      .use((inner) => {
        expectTypeOf(inner.get('a')).toEqualTypeOf<1>()
        return inner.registerValue('b', 'x' as const)
      })

    expectTypeOf(c.get('a')).toEqualTypeOf<1>()
    expectTypeOf(c.get('b')).toEqualTypeOf<'x'>()
  })
})

describe('Phase 4 — Container.Resolve', () => {
  it('extracts the accumulated T from a built container', () => {
    const c = new Container()
      .registerValue('a', 1)
      .registerClass('logger', L, [])
    type Deps = Container.Resolve<typeof c>

    expectTypeOf<Deps['a']>().toEqualTypeOf<1>()
    expectTypeOf<Deps['logger']>().toEqualTypeOf<L>()
  })
})

describe('Phase 4 — Container.ResolveUnwrapped & UnwrappedValue', () => {
  it('ResolveUnwrapped unwraps Lazy<T> entries to T, leaves the rest unchanged', () => {
    const c = new Container()
      .registerValue('a', 1 as const)
      .registerClass('clock', L, [], 'transient', 'clockLazy')
    type Flat = Container.ResolveUnwrapped<typeof c>

    expectTypeOf<Flat['a']>().toEqualTypeOf<1>()
    expectTypeOf<Flat['clock']>().toEqualTypeOf<L>()
    // Lazy<L> → L
    expectTypeOf<Flat['clockLazy']>().toEqualTypeOf<L>()
  })

  it('ResolveUnwrapped does not unwrap an ordinary service with a get() method', () => {
    class Store {
      get(): string {
        return 'value'
      }
    }
    const c = new Container().registerClass('store', Store, [])
    type Flat = Container.ResolveUnwrapped<typeof c>

    expectTypeOf<Flat['store']>().toEqualTypeOf<Store>()
  })

  it('UnwrappedValue<C, K> equals the unwrapped service type for that key', () => {
    const c = new Container()
      .registerClass('clock', L, [], 'transient', 'clockLazy')

    expectTypeOf<Container.UnwrappedValue<typeof c, 'clock'>>().toEqualTypeOf<L>()
    expectTypeOf<Container.UnwrappedValue<typeof c, 'clockLazy'>>().toEqualTypeOf<L>()
  })

  it('UnwrappedValue rejects unknown keys', () => {
    const c = new Container().registerClass('logger', L, [])
    // @ts-expect-error — 'missing' is not in keyof Resolve<C>
    type _ = Container.UnwrappedValue<typeof c, 'missing'>
    void (null as unknown as _)
  })
})

describe('Phase 4 — unknown-key type safety', () => {
  it('get() with an unknown key is a TS error', () => {
    const c = new Container().registerClass('logger', L, [])

    // @ts-expect-error — get requires exactly keyof T
    c.get('unknownKey')
  })
})

describe('Phase 4 — DepsOf validation', () => {
  it('correct order and dep types — compiles', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])
    // Correct order: [UserRepo, Logger] ↔ ['userRepo', 'logger']
    c.registerClass('userService', UserServiceImpl, ['userRepo', 'logger'])
  })

  it('wrong order — TS error', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — order is swapped: first parameter is UserRepo but 'logger' was passed
    c.registerClass('userService', UserServiceImpl, ['logger', 'userRepo'])
  })

  it('not enough elements — TS error', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — missing the second key
    c.registerClass('userService', UserServiceImpl, ['userRepo'])
  })

  it('extra element — TS error', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — extra 'logger' (UserServiceImpl's ctor takes only 2 args)
    c.registerClass('userService', UserServiceImpl, ['userRepo', 'logger', 'logger'])
  })

  it('non-existent key in deps — TS error', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — 'nonExistent' is not registered
    c.registerClass('userService', UserServiceImpl, ['userRepo', 'nonExistent'])
  })
})

describe('Phase 4 — duplicate key guard', () => {
  it('re-registering the same key — TS error', () => {
    const c = new Container().registerValue('x', 1)

    // @ts-expect-error — 'x' is already registered, Exclude<K, keyof T> = never
    c.registerValue('x', 2)
  })

  it('duplicate via registerClass — also a TS error', () => {
    const c = new Container().registerClass('logger', L, [])

    // @ts-expect-error — 'logger' is already registered
    c.registerClass('logger', L, [])
  })

  it('duplicate via registerFactory — also a TS error', () => {
    const c = new Container().registerValue('config', {port: 8080})

    // @ts-expect-error — 'config' is already registered
    c.registerFactory('config', () => ({port: 9000}))
  })

  it('lazyKey companion is considered taken after registration', () => {
    const c = new Container().registerClass('foo', L, [], 'singleton', 'fooLazy')

    // @ts-expect-error — fooLazy was already added by the lazyKey companion
    c.registerValue('fooLazy', {get: () => new L()})
  })
})

describe('Phase 4 — Lazy companion via lazyKey', () => {
  it('lazyKey adds the companion under the requested key with type Lazy<V>', () => {
    const c = new Container().registerClass('foo', L, [], 'singleton', 'fooLazy')

    expectTypeOf(c.get('fooLazy')).toEqualTypeOf<Lazy<L>>()
  })

  it('omitting lazyKey does NOT add a companion key', () => {
    const c = new Container().registerClass('foo', L, [])

    // @ts-expect-error — without lazyKey the fooLazy key is not in the map
    c.get('fooLazy')
  })

  it('lazyKey cannot equal the primary key', () => {
    // @ts-expect-error — Exclude<LK, keyof T | K> rejects key === lazyKey
    new Container().registerClass('foo', L, [], 'singleton', 'foo')
  })

  it('lazyKey cannot collide with an already-registered key', () => {
    const c = new Container().registerValue('busy', 1)
    // @ts-expect-error — lazyKey conflicts with the already-registered 'busy'
    c.registerClass('svc', L, [], 'singleton', 'busy')
  })

  it('registerFactory adds the requested companion with type Lazy<V>', () => {
    const c = new Container().registerFactory('foo', () => new L(), 'singleton', 'fooLazy')

    expectTypeOf(c.get('fooLazy')).toEqualTypeOf<Lazy<L>>()
  })

  it('registerFactory supports the default singleton kind with a lazyKey', () => {
    const c = new Container().registerFactory('foo', () => new L(), undefined, 'fooLazy')

    expectTypeOf(c.get('foo')).toEqualTypeOf<L>()
    expectTypeOf(c.get('fooLazy')).toEqualTypeOf<Lazy<L>>()
  })

  it('registerFactory lazyKey cannot equal or collide with another key', () => {
    // @ts-expect-error — primary and companion keys must differ
    new Container().registerFactory('foo', () => new L(), 'singleton', 'foo')

    const c = new Container().registerValue('busy', 1)
    // @ts-expect-error — lazyKey conflicts with the already-registered 'busy'
    c.registerFactory('foo', () => new L(), 'singleton', 'busy')
  })

  it('registerFactory lazyKey companion is considered taken', () => {
    const c = new Container().registerFactory('foo', () => new L(), 'singleton', 'fooLazy')

    // @ts-expect-error — fooLazy was already added by the lazyKey companion
    c.registerValue('fooLazy', {get: () => new L()})
  })
})

describe('Phase 4 — documented limitation: ambiguous deps', () => {
  it('two keys with identical structural type — TS does not distinguish them (by design)', () => {
    /*
     * This is a limitation, not a bug: DepsOf uses structural assignability,
     * so if two services share the same runtime type, TS will accept either
     * in either position. Branding solves this (see di-stydy.md)
     */

    class Holder {
      constructor(public readonly master: Logger, public readonly slave: Logger) {}
    }

    const c = new Container()
      .registerClass('master', L, [])
      .registerClass('slave', L, [])

    /*
     * NOT @ts-expect-error — TS passes it, even though the order is "logically" swapped.
     * This is a documented limitation
     */
    c.registerClass('holder', Holder, ['slave', 'master'])
  })
})

describe('Phase 4 — Lazy type inference', () => {
  it('Lazy<T>.get() returns T', () => {
    const wrapper: Lazy<Logger> = {get: () => ({log: () => {}} as Logger)}
    expectTypeOf(wrapper.get()).toEqualTypeOf<Logger>()
  })
})

describe('Phase 4 — dispose types', () => {
  it('dispose() returns Promise<void>', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c.dispose()).toEqualTypeOf<Promise<void>>()
  })

  it('disposed — readonly boolean', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c.disposed).toEqualTypeOf<boolean>()
  })

  it('[Symbol.asyncDispose] — () => Promise<void>', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c[Symbol.asyncDispose]).returns.toEqualTypeOf<Promise<void>>()
  })

  it('[Symbol.dispose] — () => void', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c[Symbol.dispose]).returns.toEqualTypeOf<void>()
  })
})

describe('Phase 4 — symbol keys', () => {
  it('registerValue with a symbol — get returns precise type', () => {
    const SYM = Symbol('x')
    const c = new Container().registerValue(SYM, 42 as const)
    expectTypeOf(c.get(SYM)).toEqualTypeOf<42>()
  })

  it('mixing string and symbol keys — both reachable with precise types', () => {
    const SYM = Symbol('s')
    const c = new Container()
      .registerValue('a', 1 as const)
      .registerValue(SYM, 'x' as const)
    expectTypeOf(c.get('a')).toEqualTypeOf<1>()
    expectTypeOf(c.get(SYM)).toEqualTypeOf<'x'>()
  })

  it('re-registering the same unique symbol — TS error via Exclude<K, keyof T>', () => {
    const SYM = Symbol('s')
    const c = new Container().registerValue(SYM, 1)
    // @ts-expect-error — duplicate symbol key
    c.registerValue(SYM, 2)
  })

  it('lazyKey: symbol — companion appears in T with the right type', () => {
    const SVC = Symbol('svc')
    const SVC_LAZY = Symbol('svcLazy')
    const c = new Container().registerClass(SVC, L, [], 'singleton', SVC_LAZY)
    expectTypeOf(c.get(SVC_LAZY)).toEqualTypeOf<Lazy<L>>()
  })

  it('registerFactory lazyKey accepts mixed symbol and string keys', () => {
    const SVC = Symbol('svc')
    const c = new Container().registerFactory(SVC, () => new L(), 'singleton', 'svcLazy')
    expectTypeOf(c.get('svcLazy')).toEqualTypeOf<Lazy<L>>()
  })

  it('Module<TIn, TOut> with symbol keys', () => {
    const CFG = Symbol('cfg')
    const MAILER = Symbol('mailer')
    /*
     * v3: Module<TIn, TOut> uses the Spec-shaped DependenciesMap directly.
     * Wrap flat `{ key: ServiceType }` maps in `SpecMap<...>` to default each
     * entry to singleton
     */
    const m: Module<SpecMap<Record<typeof CFG, {env: string}>>, SpecMap<Record<typeof MAILER, L>>> =
      (c) => c.registerClass(MAILER, L, [])
    void m
  })

  it('DepsOf accepts symbol-typed deps and validates order', () => {
    const LOG = Symbol('logger')
    class R {}
    class S { constructor(_r: R, _l: L) {} }
    const c = new Container()
      .registerClass(LOG, L, [])
      .registerClass('repo', R, [])
    c.registerClass('svc', S, ['repo', LOG])
  })
})

describe('Phase 4 — override types', () => {
  it('positive: known key, exact type compiles', () => {
    const c = new Container().registerClass('logger', L, [])
    c.override('logger', new L())
  })

  it('return type is `this` — preserves the container type for chaining', () => {
    const c = new Container().registerValue('n', 1 as number)
    expectTypeOf(c.override('n', 2)).toEqualTypeOf<typeof c>()
  })

  it('@ts-expect-error: unknown key — must be keyof T', () => {
    const c = new Container().registerClass('logger', L, [])
    // @ts-expect-error — 'missing' is not a key of T
    c.override('missing', new L())
  })

  it('@ts-expect-error: value of a wrong primitive type', () => {
    const c = new Container().registerClass('logger', L, [])
    // @ts-expect-error — number is not assignable to L
    c.override('logger', 42)
  })

  it('@ts-expect-error: structurally incompatible class', () => {
    const c = new Container().registerClass('logger', L, [])
    class Other { other = true }
    // @ts-expect-error — Other lacks `log(msg: string)`
    c.override('logger', new Other())
  })

  it('positive: subclass is assignable to the registered type', () => {
    class SubL extends L { extra = 1 }
    const c = new Container().registerClass('logger', L, [])
    c.override('logger', new SubL())
  })

  it('positive: symbol key', () => {
    const DB = Symbol('db')
    class Db {}
    const c = new Container().registerClass(DB, Db, [])
    c.override(DB, new Db())
  })
})

/*
 * ────────────────────────────────────────────────────────────────────────────
 * v3.0 — Compile-time lifetime guard (Variant C)
 *
 * `AllowedDeps<T, Kind>` filters the visible keyspace inside a registration so
 * that singleton consumers cannot inject scoped/transient deps. The runtime
 * guard in get() still fires for `as`-cast bypasses; these tests cover the
 * TypeScript-level coverage.
 * ────────────────────────────────────────────────────────────────────────────
 */

describe('Phase 8 — compile-time lifetime guard', () => {
  class Dep {
    public readonly mark = 'dep'
  }
  class Consumer {
    constructor(public readonly d: Dep) {}
  }

  it('singleton class can depend on a singleton class', () => {
    new Container()
      .registerClass('dep', Dep, [], 'singleton')
      .registerClass('consumer', Consumer, ['dep'], 'singleton')
  })

  it('singleton class cannot depend on a scoped class', () => {
    const c = new Container().registerClass('dep', Dep, [], 'scoped')
    // @ts-expect-error — 'dep' is scoped; AllowedDeps excludes it from the singleton's deps tuple
    c.registerClass('consumer', Consumer, ['dep'], 'singleton')
  })

  it('singleton class cannot depend on a transient class', () => {
    const c = new Container().registerClass('dep', Dep, [], 'transient')
    // @ts-expect-error — 'dep' is transient; AllowedDeps excludes it
    c.registerClass('consumer', Consumer, ['dep'], 'singleton')
  })

  it('singleton class CAN depend on a Lazy<singleton> companion', () => {
    /*
     * LazySpec<V, 'singleton'> passes the AllowedDeps<T, 'singleton'> filter:
     * a singleton may legally defer its dependency on another singleton via
     * a lazy wrapper (useful for breaking init-time cycles between singletons)
     */
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    new Container()
      .registerClass('dep', Dep, [], 'singleton', 'depLazy')
      .registerClass('holder', HolderLazy, ['depLazy'], 'singleton')
  })

  it('singleton class CAN depend on a factory-created Lazy<singleton> companion', () => {
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    new Container()
      .registerFactory('dep', () => new Dep(), 'singleton', 'depLazy')
      .registerClass('holder', HolderLazy, ['depLazy'], 'singleton')
  })

  it('singleton class CANNOT depend on a Lazy<scoped> companion', () => {
    // v4: Lazy preserves the target's lifetime — Lazy<scoped> is not singleton-safe
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    const c = new Container().registerClass('dep', Dep, [], 'scoped', 'depLazy')
    // @ts-expect-error — LazySpec<Dep, 'scoped'> is excluded by AllowedDeps<T, 'singleton'>
    c.registerClass('holder', HolderLazy, ['depLazy'], 'singleton')
  })

  it('singleton class CANNOT depend on a factory-created Lazy<scoped> companion', () => {
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    const c = new Container().registerFactory('dep', () => new Dep(), 'scoped', 'depLazy')
    // @ts-expect-error — the factory companion preserves the scoped target lifetime
    c.registerClass('holder', HolderLazy, ['depLazy'], 'singleton')
  })

  it('singleton class CANNOT depend on a Lazy<transient> companion', () => {
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    const c = new Container().registerClass('dep', Dep, [], 'transient', 'depLazy')
    // @ts-expect-error — LazySpec<Dep, 'transient'> is excluded by AllowedDeps<T, 'singleton'>
    c.registerClass('holder', HolderLazy, ['depLazy'], 'singleton')
  })

  it('scoped class CAN depend on a Lazy<scoped> companion', () => {
    /*
     * Non-singleton consumers are not filtered by AllowedDeps — any companion
     * (or direct dep) is legal. This preserves the v3 ergonomics for
     * scoped↔scoped cycle-breaking inside a request scope
     */
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    new Container()
      .registerClass('dep', Dep, [], 'scoped', 'depLazy')
      .registerClass('holder', HolderLazy, ['depLazy'], 'scoped')
  })

  it('scoped class can depend on a scoped class', () => {
    new Container()
      .registerClass('dep', Dep, [], 'scoped')
      .registerClass('consumer', Consumer, ['dep'], 'scoped')
  })

  it('scoped class can depend on a transient class', () => {
    // Per runtime semantics: scoped/transient targets accept any kind of dep
    new Container()
      .registerClass('dep', Dep, [], 'transient')
      .registerClass('consumer', Consumer, ['dep'], 'scoped')
  })

  it('transient class can depend on a scoped class', () => {
    new Container()
      .registerClass('dep', Dep, [], 'scoped')
      .registerClass('consumer', Consumer, ['dep'], 'transient')
  })

  it('singleton factory `c` is narrowed to AllowedDeps<T, "singleton">', () => {
    const c = new Container()
      .registerClass('singletonDep', Dep, [], 'singleton')
      .registerClass('scopedDep', Dep, [], 'scoped')

    c.registerFactory('built', (c) => {
      // singletonDep is visible — singleton deps are legal for a singleton target
      const ok = c.get('singletonDep')
      void ok
      // @ts-expect-error — scopedDep is filtered out of the narrowed container's keys
      c.get('scopedDep')
      return new Dep()
    }, 'singleton')
  })

  it('scoped factory `c` is NOT narrowed (any dep is legal)', () => {
    const c = new Container()
      .registerClass('singletonDep', Dep, [], 'singleton')
      .registerClass('scopedDep', Dep, [], 'scoped')
      .registerClass('transientDep', Dep, [], 'transient')

    c.registerFactory('built', (c) => {
      const a = c.get('singletonDep')
      const b = c.get('scopedDep')
      const x = c.get('transientDep')
      void a; void b; void x
      return new Dep()
    }, 'scoped')
  })

  it('registerValue values count as singleton — legal in singleton factories', () => {
    const c = new Container().registerValue('cfg', {port: 8080})
    c.registerFactory('built', (c) => {
      const v = c.get('cfg')
      return v.port
    }, 'singleton')
  })

  it('an explicit non-singleton generic requires the matching runtime kind', () => {
    if (false) {
      // @ts-expect-error — the type-level kind cannot differ from the omitted runtime default
      new Container().registerClass<'dep', Dep, [], 'scoped'>('dep', Dep, [])
      // @ts-expect-error — the type-level kind cannot differ from the omitted runtime default
      new Container().registerFactory<'dep', Dep, 'scoped'>('dep', () => new Dep())
    }

    new Container().registerClass<'dep', Dep, [], 'scoped'>('dep', Dep, [], 'scoped')
    new Container().registerFactory<'dep', Dep, 'scoped'>('dep', () => new Dep(), 'scoped')
  })
})

describe('Phase 8 — Spec / SpecMap helpers', () => {
  it('SpecMap defaults entries to singleton', () => {
    type M = SpecMap<{logger: L; cfg: {port: number}}>
    expectTypeOf<M['logger']>().toEqualTypeOf<Spec<L, 'singleton'>>()
    expectTypeOf<M['cfg']>().toEqualTypeOf<Spec<{port: number}, 'singleton'>>()
  })

  it('SpecMap with explicit kind sets every entry to that kind', () => {
    type M = SpecMap<{req: {id: string}}, 'scoped'>
    expectTypeOf<M['req']>().toEqualTypeOf<Spec<{id: string}, 'scoped'>>()
  })

  it('Container.Resolve unwraps Spec back to a flat shape', () => {
    const builder = new Container()
      .registerValue('cfg', {port: 8080})
      .registerClass('logger', L, [])
    type Flat = Container.Resolve<typeof builder>
    expectTypeOf<Flat['logger']>().toEqualTypeOf<L>()
    expectTypeOf<Flat['cfg']>().toEqualTypeOf<{readonly port: 8080}>()
  })
})

describe('Phase 4 — async-factory inference', () => {
  it('async factory: get() returns Promise<V>; no implicit Awaited unwrap', () => {
    /*
     * The container caches the factory's return value verbatim. An async factory
     * produces `Promise<V>` — `get()` returns that same Promise, callers await
     */
    const c = new Container().registerFactory('db', async () => new L())
    expectTypeOf(c.get('db')).toEqualTypeOf<Promise<L>>()
  })
})

describe('Phase 4 — has type-guard', () => {
  it('has() narrows the key type inside the truthy branch', () => {
    const c = new Container().registerClass('logger', L, [])
    const k = 'logger' as string

    if (c.has(k)) {
      // Inside the branch k is narrowed to keyof T, so get() type-checks
      expectTypeOf(c.get(k)).toEqualTypeOf<L>()
    }
  })

  it('has() accepts arbitrary string | symbol without TS error', () => {
    const c = new Container().registerClass('logger', L, [])
    // Dynamic key — no compile error, runtime returns false
    const ok: boolean = c.has('anyDynamicKey')
    void ok
  })

  it('has() returns boolean (a type-guard, not assignment)', () => {
    const c = new Container().registerClass('logger', L, [])
    expectTypeOf(c.has('logger')).toEqualTypeOf<boolean>()
  })
})

describe('Phase 4 — Container.Providers', () => {
  it('Providers<C> maps each registered key to a zero-arg thunk returning the service', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('repo', UserRepoImpl, [])
    type P = Container.Providers<typeof c>

    expectTypeOf<P['logger']>().toEqualTypeOf<() => L>()
    expectTypeOf<P['repo']>().toEqualTypeOf<() => UserRepoImpl>()
  })

  it('Providers<C> preserves Lazy<V> wrapper shape for lazy-companion keys', () => {
    const c = new Container()
      .registerClass('clock', L, [], 'transient', 'clockLazy')
    type P = Container.Providers<typeof c>

    expectTypeOf<P['clock']>().toEqualTypeOf<() => L>()
    /*
     * The companion's provider returns the Lazy<L> wrapper, not L directly —
     * matches the registered shape
     */
    expectTypeOf<P['clockLazy']>().toEqualTypeOf<() => Lazy<L>>()
  })

  it('Providers<C> rejects an extraneous key', () => {
    const c = new Container().registerClass('logger', L, [])
    const _bad: Container.Providers<typeof c> = {
      logger: () => new L(),
      // @ts-expect-error — 'extra' is not in keyof T
      extra: () => new L()
    }
    void _bad
  })

  it('Providers<C> rejects a missing key', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('repo', UserRepoImpl, [])
    // @ts-expect-error — 'repo' is required
    const _bad: Container.Providers<typeof c> = {
      logger: () => new L()
    }
    void _bad
  })

  it('Providers<C> resolves to never for non-Container types', () => {
    expectTypeOf<Container.Providers<string>>().toEqualTypeOf<never>()
  })
})

describe('scope inputs — declarations and provision', () => {
  interface RequestContext {
    readonly requestId: string
  }

  interface AuthContext {
    readonly userId: string
  }

  const INPUT = Symbol('input')
  const request = {requestId: 'request'} satisfies RequestContext
  const auth = {userId: 'user'} satisfies AuthContext

  it('accepts finite required string and symbol declarations', () => {
    new Container()
      .declareScopeInputs<{
        request: RequestContext
        '0': string
        [INPUT]: AuthContext
        optionalValue: AuthContext | undefined
      }>()
  })

  it('accepts unions with the same key set and different values', () => {
    type Context =
      | {context: RequestContext}
      | {context: AuthContext}

    expectTypeOf<ScopeInputMap<Context>>().not.toEqualTypeOf<never>()
  })

  it('rejects invalid declaration maps', () => {
    // @ts-expect-error — numeric keys are not scope-input keys
    new Container().declareScopeInputs<{0: RequestContext}>()
    // @ts-expect-error — __proto__ is excluded from declarations
    new Container().declareScopeInputs<{'__proto__': RequestContext}>()
    // @ts-expect-error — optional declaration keys are not allowed
    new Container().declareScopeInputs<{request?: RequestContext}>()
    // @ts-expect-error — broad string index signatures are not finite
    new Container().declareScopeInputs<Record<string, RequestContext>>()
    // @ts-expect-error — broad symbol index signatures are not finite
    new Container().declareScopeInputs<Record<symbol, RequestContext>>()
    // @ts-expect-error — union variants must have the same key set
    new Container().declareScopeInputs<
      {request: RequestContext} | {auth: AuthContext}
    >()
  })

  it('rejects repeated declarations and collisions with graph keys', () => {
    const declared = new Container()
      .declareScopeInputs<{request: RequestContext}>()

    // @ts-expect-error — request is already declared
    declared.declareScopeInputs<{request: RequestContext}>()

    const registered = new Container().registerValue('request', request)
    // @ts-expect-error — request already exists as a registration
    registered.declareScopeInputs<{request: RequestContext}>()

    // @ts-expect-error — input keys participate in the duplicate-key guard
    declared.registerValue('request', request)
    // @ts-expect-error — input keys participate in the class duplicate-key guard
    declared.registerClass('request', L, [])
    // @ts-expect-error — input keys participate in the factory duplicate-key guard
    declared.registerFactory('request', () => request)
    // @ts-expect-error — a lazy companion cannot collide with an input
    declared.registerClass('logger', L, [], 'singleton', 'request')
  })

  it('provides only required keys and preserves the parent type-state', () => {
    const root = new Container()
      .declareScopeInputs<{
        request: RequestContext
        auth: AuthContext
      }>()

    // @ts-expect-error — root inputs are not ready
    root.get('request')

    const requestScope = root.createScope({request})
    expectTypeOf(requestScope.get('request')).toEqualTypeOf<RequestContext>()
    // @ts-expect-error — auth has not been provided
    requestScope.get('auth')
    // @ts-expect-error — child refinement does not mutate the parent type-state
    root.get('request')

    const authScope = requestScope.createScope({auth})
    expectTypeOf(authScope.get('request')).toEqualTypeOf<RequestContext>()
    expectTypeOf(authScope.get('auth')).toEqualTypeOf<AuthContext>()

    // @ts-expect-error — ready inputs cannot be provided again
    authScope.createScope({request})
    // @ts-expect-error — unknown keys are rejected
    requestScope.createScope({unknown: true})
    // @ts-expect-error — input values must match the declared slot type
    root.createScope({request: {requestId: 42}})
  })

  it('accepts an empty record without changing type-state', () => {
    const root = new Container().declareScopeInputs<{request: RequestContext}>()
    const scope = root.createScope({})

    // @ts-expect-error — an empty record provides no input
    scope.get('request')
  })

  it('counts only properties required in every invocation-record branch', () => {
    const root = new Container()
      .declareScopeInputs<{
        request: RequestContext
        auth: AuthContext
      }>()

    const optional: {request: RequestContext; auth?: AuthContext} = {request}
    const optionalScope = root.createScope(optional)
    optionalScope.get('request')
    // @ts-expect-error — optional auth does not open the slot
    optionalScope.get('auth')

    const union: {request: RequestContext} | {request: RequestContext; auth: AuthContext} =
      Math.random() > 0.5 ? {request} : {request, auth}
    const unionScope = root.createScope(union)
    unionScope.get('request')
    // @ts-expect-error — auth is not required in every union branch
    unionScope.get('auth')
  })

  it('treats a required undefined value as provided', () => {
    const root = new Container()
      .declareScopeInputs<{auth: AuthContext | undefined}>()
    const scope = root.createScope({auth: undefined})

    expectTypeOf(scope.get('auth')).toEqualTypeOf<AuthContext | undefined>()
  })

  it('rejects extra keys in variables and union branches', () => {
    const root = new Container().declareScopeInputs<{request: RequestContext}>()
    const extra = {request, extra: true}

    // @ts-expect-error — exactness applies to pre-typed variables
    root.createScope(extra)

    const union: {request: RequestContext} | {request: RequestContext; extra: true} =
      Math.random() > 0.5 ? {request} : {request, extra: true}
    // @ts-expect-error — extra is present in one union branch
    root.createScope(union)
  })

  it('allows declarations on an existing child without providing the value', () => {
    const requestScope = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .createScope({request})
    const declaredChild = requestScope
      .declareScopeInputs<{auth: AuthContext}>()

    // @ts-expect-error — declaration alone does not seed the receiver cache
    declaredChild.get('auth')
    expectTypeOf(
      declaredChild.createScope({auth}).get('auth')
    ).toEqualTypeOf<AuthContext>()
  })

  it('keeps ordinary Spec and LazySpec identity on the no-requirement path', () => {
    expectTypeOf<
      WithRequirements<Spec<L, 'singleton'>, never>
    >().toEqualTypeOf<Spec<L, 'singleton'>>()
    expectTypeOf<
      WithRequirements<LazySpec<L, 'scoped'>, never>
    >().toEqualTypeOf<LazySpec<L, 'scoped'>>()
  })
})

describe('scope inputs — requirement propagation', () => {
  interface RequestContext {
    readonly requestId: string
  }

  interface AuthContext {
    readonly userId: string
  }

  class PublicService {
    constructor(readonly request: RequestContext) {}
  }

  class AccountService {
    constructor(
      readonly request: RequestContext,
      readonly auth: AuthContext
    ) {}
  }

  class Controller {
    constructor(
      readonly account: AccountService,
      readonly logger: L
    ) {}
  }

  class AuthService {
    constructor(readonly auth: AuthContext) {}
  }

  class Dashboard {
    constructor(
      readonly publicService: PublicService,
      readonly authService: AuthService
    ) {}
  }

  const request = {requestId: 'request'} satisfies RequestContext
  const auth = {userId: 'user'} satisfies AuthContext

  it('propagates requirements through linear and multi-input graphs', () => {
    const root = new Container()
      .declareScopeInputs<{
        request: RequestContext
        auth: AuthContext
      }>()
      .registerClass('logger', L, [])
      .registerClass('publicService', PublicService, ['request'], 'scoped')
      .registerClass('authService', AuthService, ['auth'], 'scoped')
      .registerClass(
        'accountService',
        AccountService,
        ['request', 'auth'],
        'scoped'
      )
      .registerClass(
        'dashboard',
        Dashboard,
        ['publicService', 'authService'],
        'scoped'
      )
      .registerClass(
        'controller',
        Controller,
        ['accountService', 'logger'],
        'scoped'
      )

    // @ts-expect-error — request is blocked on root
    root.get('publicService')
    // @ts-expect-error — request and auth are blocked on root
    root.get('controller')

    const publicScope = root.createScope({request})
    expectTypeOf(publicScope.get('publicService')).toEqualTypeOf<PublicService>()
    // @ts-expect-error — accountService transitively requires auth
    publicScope.get('accountService')
    // @ts-expect-error — controller inherits accountService requirements
    publicScope.get('controller')
    // @ts-expect-error — the diamond still requires auth through authService
    publicScope.get('dashboard')

    const authenticatedScope = publicScope.createScope({auth})
    expectTypeOf(authenticatedScope.get('accountService')).toEqualTypeOf<AccountService>()
    expectTypeOf(authenticatedScope.get('controller')).toEqualTypeOf<Controller>()
    expectTypeOf(authenticatedScope.get('dashboard')).toEqualTypeOf<Dashboard>()
  })

  it('propagates requirements to class lazy companions', () => {
    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .registerClass(
        'publicService',
        PublicService,
        ['request'],
        'scoped',
        'publicServiceLazy'
      )

    // @ts-expect-error — the companion is blocked with its target
    root.get('publicServiceLazy')

    const scope = root.createScope({request})
    expectTypeOf(scope.get('publicServiceLazy')).toEqualTypeOf<Lazy<PublicService>>()
  })

  it('prevents singletons from selecting scope inputs', () => {
    const root = new Container().declareScopeInputs<{request: RequestContext}>()

    // @ts-expect-error — a singleton class cannot depend on a scoped input
    root.registerClass('publicService', PublicService, ['request'])
    // @ts-expect-error — a default singleton deps-aware factory cannot select it
    root.registerFactory('requestId', ['request'], (c) => c.get('request').requestId)
  })

  it('gives deps-aware factories a resolver-only selection view', () => {
    const root = new Container()
      .registerValue('logger', new L())
      .registerValue('other', 1 as const)

    const built = root.registerFactory('message', ['logger'], (c) => {
      expectTypeOf(c.get('logger')).toEqualTypeOf<L>()
      expectTypeOf(c.has('other')).toEqualTypeOf<boolean>()
      // @ts-expect-error — an unlisted ready dependency is hidden
      c.get('other')
      // @ts-expect-error — the resolver cannot mutate the graph
      c.registerValue('x', 1)
      // @ts-expect-error — the resolver cannot create scopes
      c.createScope()
      // @ts-expect-error — the resolver has no disposal API
      c.dispose()
      return 'message' as const
    })

    expectTypeOf(built.get('message')).toEqualTypeOf<'message'>()
    // @ts-expect-error — duplicate-key guards still apply to the result key
    built.registerValue('message', 'other')

    const transientRoot = root.registerClass('transient', L, [], 'transient')
    // @ts-expect-error — the default singleton overload keeps the lifetime filter
    transientRoot.registerFactory('invalid', ['transient'], () => 'invalid')
  })

  it('propagates scoped factory requirements to result and lazy companion', () => {
    const root = new Container()
      .declareScopeInputs<{auth: AuthContext}>()
      .registerFactory(
        'userId',
        ['auth'],
        (c) => c.get('auth').userId,
        'scoped',
        'userIdLazy'
      )

    // @ts-expect-error — factory result requires auth
    root.get('userId')
    // @ts-expect-error — lazy companion carries the same requirement
    root.get('userIdLazy')

    const scope = root.createScope({auth})
    expectTypeOf(scope.get('userId')).toEqualTypeOf<string>()
    expectTypeOf(scope.get('userIdLazy')).toEqualTypeOf<Lazy<string>>()
  })

  it('keeps blocked dependencies hidden from callback-only factories', () => {
    const root = new Container().declareScopeInputs<{auth: AuthContext}>()

    root.registerFactory('userId', (c) => {
      // @ts-expect-error — callback-only factories cannot declare the input edge
      c.get('auth')
      return 'unknown'
    }, 'scoped')

    const requirementFree = root.registerFactory(
      'constant',
      () => 'constant' as const,
      'scoped'
    )
    expectTypeOf(
      requirementFree.createScope().get('constant')
    ).toEqualTypeOf<'constant'>()
  })

  it('supports strict child registration followed by refinement', () => {
    const requestScope = new Container()
      .declareScopeInputs<{
        request: RequestContext
        auth: AuthContext
      }>()
      .createScope({request})
    const extended = requestScope.registerClass(
      'accountService',
      AccountService,
      ['request', 'auth'],
      'scoped'
    )

    // @ts-expect-error — the new service remains blocked until refinement
    extended.get('accountService')
    expectTypeOf(
      extended.createScope({auth}).get('accountService')
    ).toEqualTypeOf<AccountService>()
  })
})

describe('scope inputs — helpers and compatibility', () => {
  interface RequestContext {
    readonly requestId: string
  }

  class Handler {
    constructor(readonly request: RequestContext) {}
  }

  it('exposes Container.ReadyKeys for generic resolvers', () => {
    function legacyResolve<
      T extends DependenciesMap,
      K extends keyof T
    >(container: Container<T>, key: K) {
      // @ts-expect-error — keyof T may include a blocked entry
      return container.get(key)
    }

    function resolveReady<
      T extends DependenciesMap,
      K extends Container.ReadyKeys<Container<T>>
    >(container: Container<T>, key: K): T[K]['type'] {
      return container.get(key)
    }

    const ordinary = new Container().registerValue('answer', 42 as const)
    expectTypeOf(resolveReady(ordinary, 'answer')).toEqualTypeOf<42>()
    void legacyResolve
  })

  it('keeps has-to-get narrowing for ordinary graphs but not partial scopes', () => {
    const key = 'value' as string | symbol
    const ordinary = new Container().registerValue('value', 1)

    if (ordinary.has(key)) {
      ordinary.get(key)
    }

    const partial = new Container()
      .declareScopeInputs<{request: RequestContext}>()

    if (partial.has(key)) {
      // @ts-expect-error — a registration probe does not prove readiness
      partial.get(key)
    }
  })

  it('excludes scope inputs from override and Providers', () => {
    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .registerValue('logger', new L())

    // @ts-expect-error — inputs are external values, not registrations
    root.override('request', {requestId: 'request'})

    type Providers = Container.Providers<typeof root>
    expectTypeOf<keyof Providers>().toEqualTypeOf<'logger'>()
    expectTypeOf<Providers['logger']>().toEqualTypeOf<() => L>()
  })

  it('keeps full-graph extraction helpers', () => {
    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .registerClass('handler', Handler, ['request'], 'scoped')

    type Resolved = Container.Resolve<typeof root>
    type Unwrapped = Container.ResolveUnwrapped<typeof root>
    expectTypeOf<Resolved['request']>().toEqualTypeOf<RequestContext>()
    expectTypeOf<Resolved['handler']>().toEqualTypeOf<Handler>()
    expectTypeOf<Unwrapped['request']>().toEqualTypeOf<RequestContext>()
  })

  it('supports named modules with public scope-input helpers', () => {
    type Inputs = ScopeInputMap<{request: RequestContext}>
    type Output = {
      handler: WithRequirements<Spec<Handler, 'scoped'>, 'request'>
    }
    const module: Module<Inputs, Output> = (c) => c.registerClass(
      'handler',
      Handler,
      ['request'],
      'scoped'
    )

    const root = new Container()
      .declareScopeInputs<{request: RequestContext}>()
      .use(module)
    const scope = root.createScope({request: {requestId: 'request'}})
    expectTypeOf(scope.get('handler')).toEqualTypeOf<Handler>()
  })
})
