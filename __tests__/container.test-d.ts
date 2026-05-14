import {describe, it, expectTypeOf} from 'vitest'
import {Container, type Lazy, type Module, type Spec, type SpecMap} from '../src/Container'

// ────────────────────────────────────────────────────────────────────────────
// Phase 4 — Type-level tests (fluent API)
//
// Run via `npm run test:types` (vitest --typecheck).
// Vitest enforces @ts-expect-error: if the marked line has NO TS error, the
// test fails. So these comments simultaneously verify negative cases
// (must not compile) and positive cases (must compile).
// ────────────────────────────────────────────────────────────────────────────

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

    expectTypeOf(c.get('config')).toEqualTypeOf<{port: number}>()
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

    expectTypeOf<Deps['a']>().toEqualTypeOf<number>()
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
})

describe('Phase 4 — documented limitation: ambiguous deps', () => {
  it('two keys with identical structural type — TS does not distinguish them (by design)', () => {
    // This is a limitation, not a bug: DepsOf uses structural assignability,
    // so if two services share the same runtime type, TS will accept either
    // in either position. Branding solves this (see di-stydy.md).

    class Holder {
      constructor(public readonly master: Logger, public readonly slave: Logger) {}
    }

    const c = new Container()
      .registerClass('master', L, [])
      .registerClass('slave', L, [])

    // NOT @ts-expect-error — TS passes it, even though the order is "logically" swapped.
    // This is a documented limitation.
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
    const SYM: unique symbol = Symbol('x') as unique symbol
    const c = new Container().registerValue(SYM, 42 as const)
    expectTypeOf(c.get(SYM)).toEqualTypeOf<42>()
  })

  it('mixing string and symbol keys — both reachable with precise types', () => {
    const SYM: unique symbol = Symbol('s') as unique symbol
    const c = new Container()
      .registerValue('a', 1 as const)
      .registerValue(SYM, 'x' as const)
    expectTypeOf(c.get('a')).toEqualTypeOf<1>()
    expectTypeOf(c.get(SYM)).toEqualTypeOf<'x'>()
  })

  it('re-registering the same unique symbol — TS error via Exclude<K, keyof T>', () => {
    const SYM: unique symbol = Symbol('s') as unique symbol
    const c = new Container().registerValue(SYM, 1)
    // @ts-expect-error — duplicate symbol key
    c.registerValue(SYM, 2)
  })

  it('lazyKey: symbol — companion appears in T with the right type', () => {
    const SVC: unique symbol = Symbol('svc') as unique symbol
    const SVC_LAZY: unique symbol = Symbol('svcLazy') as unique symbol
    const c = new Container().registerClass(SVC, L, [], 'singleton', SVC_LAZY)
    expectTypeOf(c.get(SVC_LAZY)).toEqualTypeOf<Lazy<L>>()
  })

  it('Module<TIn, TOut> with symbol keys', () => {
    const CFG: unique symbol = Symbol('cfg') as unique symbol
    const MAILER: unique symbol = Symbol('mailer') as unique symbol
    // v3: Module<TIn, TOut> uses the Spec-shaped DependenciesMap directly.
    // Wrap flat `{ key: ServiceType }` maps in `SpecMap<...>` to default each
    // entry to singleton.
    const m: Module<SpecMap<Record<typeof CFG, {env: string}>>, SpecMap<Record<typeof MAILER, L>>> =
      (c) => c.registerClass(MAILER, L, [])
    void m
  })

  it('DepsOf accepts symbol-typed deps and validates order', () => {
    const LOG: unique symbol = Symbol('logger') as unique symbol
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
    const DB: unique symbol = Symbol('db') as unique symbol
    class Db {}
    const c = new Container().registerClass(DB, Db, [])
    c.override(DB, new Db())
  })
})

// ────────────────────────────────────────────────────────────────────────────
// v3.0 — Compile-time lifetime guard (Variant C)
//
// `AllowedDeps<T, Kind>` filters the visible keyspace inside a registration so
// that singleton consumers cannot inject scoped/transient deps. The runtime
// guard in get() still fires for `as`-cast bypasses; these tests cover the
// TypeScript-level coverage.
// ────────────────────────────────────────────────────────────────────────────

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

  it('singleton class CAN depend on a Lazy<scoped> companion', () => {
    // Lazy companions are detected structurally via `Lazy<unknown>`; the runtime
    // wrapper is `transient`, but the compile-time filter lets it through.
    class HolderLazy {
      constructor(public readonly d: Lazy<Dep>) {}
    }
    new Container()
      .registerClass('dep', Dep, [], 'scoped', 'depLazy')
      .registerClass('holder', HolderLazy, ['depLazy'], 'singleton')
  })

  it('scoped class can depend on a scoped class', () => {
    new Container()
      .registerClass('dep', Dep, [], 'scoped')
      .registerClass('consumer', Consumer, ['dep'], 'scoped')
  })

  it('scoped class can depend on a transient class', () => {
    // Per runtime semantics: scoped/transient targets accept any kind of dep.
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
      // singletonDep is visible — singleton deps are legal for a singleton target.
      const ok = c.get('singletonDep')
      void ok
      // @ts-expect-error — scopedDep is filtered out of the narrowed container's keys.
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
    expectTypeOf<Flat['cfg']>().toEqualTypeOf<{port: number}>()
  })
})

describe('Phase 4 — async-factory inference', () => {
  it('async factory: get() returns Promise<V>; no implicit Awaited unwrap', () => {
    // The container caches the factory's return value verbatim. An async factory
    // produces `Promise<V>` — `get()` returns that same Promise, callers await.
    const c = new Container().registerFactory('db', async () => new L())
    expectTypeOf(c.get('db')).toEqualTypeOf<Promise<L>>()
  })
})
