import {describe, it, expectTypeOf} from 'vitest'
import {Container, type Lazy, type Module} from '../src/Container'

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
    const m: Module<Record<typeof CFG, {env: string}>, Record<typeof MAILER, L>> =
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
