import {describe, it, expect} from 'vitest'
import {Container, type DependenciesMap, type Lazy} from '../src/Container'
import {
  AppConfig,
  ConsoleLogger,
  Service,
  TrackableAsync,
} from './helpers'

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — Functional
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 1 — Functional', () => {
  describe('registerClass', () => {
    it('resolves a class with zero arity', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.get('logger')).toBeInstanceOf(ConsoleLogger)
    })

    it('passes dependencies to the constructor in declared order', () => {
      const c = new Container()
        .registerClass('logger', ConsoleLogger, [])
        .registerClass('service', Service, ['logger'])

      const svc = c.get('service')

      expect(svc).toBeInstanceOf(Service)
      expect(svc.logger).toBe(c.get('logger'))
    })
  })

  // Arity unrolling in Container.registerClass — separate branches for len === 0..7
  // and the tail (len >= 8) via Reflect.construct. len === 0 and 1 are already
  // covered above (ConsoleLogger / Service); here we cover 2..7 and the tail.
  describe('arity unrolling — all JIT-optimization branches', () => {
    it('len === 2: both args are passed in the right order', () => {
      class Two {
        constructor(public a: number, public b: string) {}
      }
      const c = new Container()
        .registerValue('n', 1)
        .registerValue('s', 'x')
        .registerClass('two', Two, ['n', 's'])

      const inst = c.get('two')
      expect(inst.a).toBe(1)
      expect(inst.b).toBe('x')
    })

    it('len === 3', () => {
      class Three {
        constructor(public a: number, public b: string, public c: boolean) {}
      }
      const c = new Container()
        .registerValue('n', 1)
        .registerValue('s', 'x')
        .registerValue('bo', true)
        .registerClass('three', Three, ['n', 's', 'bo'])

      const inst = c.get('three')
      expect([inst.a, inst.b, inst.c]).toEqual([1, 'x', true])
    })

    it('len === 4', () => {
      class Four {
        constructor(
          public a: number,
          public b: string,
          public c: boolean,
          public d: number,
        ) {}
      }
      const c = new Container()
        .registerValue('n1', 1)
        .registerValue('s', 'x')
        .registerValue('bo', true)
        .registerValue('n2', 2)
        .registerClass('four', Four, ['n1', 's', 'bo', 'n2'])

      const inst = c.get('four')
      expect([inst.a, inst.b, inst.c, inst.d]).toEqual([1, 'x', true, 2])
    })

    it('len === 5: tail branch via Reflect.construct', () => {
      class Five {
        constructor(
          public a: number,
          public b: number,
          public c: number,
          public d: number,
          public e: number,
        ) {}
      }
      const c = new Container()
        .registerValue('a', 1)
        .registerValue('b', 2)
        .registerValue('c', 3)
        .registerValue('d', 4)
        .registerValue('e', 5)
        .registerClass('five', Five, ['a', 'b', 'c', 'd', 'e'])

      const inst = c.get('five')
      expect([inst.a, inst.b, inst.c, inst.d, inst.e]).toEqual([1, 2, 3, 4, 5])
    })

    it('len === 6: explicitly unrolled arity 6', () => {
      class Six {
        constructor(
          public a: number,
          public b: number,
          public c: number,
          public d: number,
          public e: number,
          public f: number,
        ) {}
      }
      const c = new Container()
        .registerValue('a', 1)
        .registerValue('b', 2)
        .registerValue('c', 3)
        .registerValue('d', 4)
        .registerValue('e', 5)
        .registerValue('f', 6)
        .registerClass('six', Six, ['a', 'b', 'c', 'd', 'e', 'f'])

      const inst = c.get('six')
      expect([inst.a, inst.b, inst.c, inst.d, inst.e, inst.f]).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('len === 7: explicitly unrolled arity 7', () => {
      class Seven {
        constructor(
          public a: number,
          public b: number,
          public c: number,
          public d: number,
          public e: number,
          public f: number,
          public g: number,
        ) {}
      }
      const c = new Container()
        .registerValue('a', 1)
        .registerValue('b', 2)
        .registerValue('c', 3)
        .registerValue('d', 4)
        .registerValue('e', 5)
        .registerValue('f', 6)
        .registerValue('g', 7)
        .registerClass('seven', Seven, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])

      const inst = c.get('seven')
      expect([inst.a, inst.b, inst.c, inst.d, inst.e, inst.f, inst.g]).toEqual([1, 2, 3, 4, 5, 6, 7])
    })

    it('len === 8: tail branch with higher arity using Reflect.construct', () => {
      class Eight {
        constructor(
          public a: number,
          public b: number,
          public c: number,
          public d: number,
          public e: number,
          public f: number,
          public g: number,
          public h: number,
        ) {}
      }
      const c = new Container()
        .registerValue('a', 1)
        .registerValue('b', 2)
        .registerValue('c', 3)
        .registerValue('d', 4)
        .registerValue('e', 5)
        .registerValue('f', 6)
        .registerValue('g', 7)
        .registerValue('h', 8)
        .registerClass('eight', Eight, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])

      const inst = c.get('eight')
      expect([inst.a, inst.b, inst.c, inst.d, inst.e, inst.f, inst.g, inst.h]).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })
  })

  describe('registerFactory', () => {
    it('factory receives the container and its result is reachable via get', () => {
      const c = new Container().registerFactory('config', () => ({port: 3000}))

      expect(c.get('config')).toEqual({port: 3000})
    })

    it('factory sees previously registered dependencies', () => {
      const c = new Container()
        .registerValue('base', 21)
        .registerFactory('doubled', (ctx) => ctx.get('base') * 2)

      expect(c.get('doubled')).toBe(42)
    })
  })

  describe('registerValue', () => {
    it('returns the same value by reference', () => {
      const cfg = new AppConfig(9000)
      const c = new Container().registerValue('config', cfg)

      expect(c.get('config')).toBe(cfg)
    })

    it('value is reachable immediately through the cache (fast path)', () => {
      const value = {marker: Symbol('v')}
      const c = new Container().registerValue('v', value)

      expect(c.get('v')).toBe(value)
    })

    it('explicit undefined value: cache.has fallback returns it (rare path)', () => {
      // Anti-pattern, but supported for correctness: registering `undefined` makes the
      // first `Map.get` return undefined, falling through to the `Map.has` branch
      // in get(). The branch is not on the hot path — guarded only for completeness.
      const c = new Container().registerValue('explicit', undefined as unknown)

      expect(c.get('explicit')).toBeUndefined()
    })
  })

  describe('unknown keys', () => {
    it('get() throws "Key ... not found"', () => {
      const c = new Container().registerValue('known', 'x')
      // @ts-expect-error — trying to resolve an unregistered key
      expect(() => c.get('unknown')).toThrow(/Key "unknown" not found/)
    })

    it('missing key inside a live scope chain — still "Key not found", not a disposed message', () => {
      // The error path walks every ancestor checking _disposed. With a fully live chain
      // it must complete the walk and fall through to the regular "Key not found" throw.
      const root = new Container().registerValue('known', 1)
      const child = root.createScope()

      // @ts-expect-error — missing key from a child of a live root
      expect(() => child.get('unknown')).toThrow(/Key "unknown" not found/)
    })
  })

  describe('cycle detection', () => {
    it('A→B→C→A: throws with the chain in the message', () => {
      class A {
        constructor(public b: B) {}
      }
      class B {
        constructor(public c: C) {}
      }
      class C {
        constructor(public a: A) {}
      }

      // Registering recursive classes in fluent style is impossible without casts
      // because 'b' is needed by 'a' but registered later. We use a pre-declared
      // type via Container<{}> + an explicit cast to Container with a known shape —
      // we are testing the runtime cycle-detection behavior specifically.
      const c = new Container() as Container<{a: A; b: B; cc: C}>
      c.registerClass('a' as never, A, ['b' as never])
      c.registerClass('b' as never, B, ['cc' as never])
      c.registerClass('cc' as never, C, ['a' as never])

      expect(() => c.get('a')).toThrow(/Circular dependency detected: a -> b -> cc -> a/)
    })

    it('self-recursion A→A is also caught', () => {
      class A {
        constructor(_a: A) {}
      }
      const c = new Container() as Container<{a: A}>
      c.registerClass('a' as never, A, ['a' as never])

      expect(() => c.get('a')).toThrow(/Circular dependency detected: a -> a/)
    })

    it('the message contains a hint about Lazy', () => {
      class A {
        constructor(_a: A) {}
      }
      const c = new Container() as Container<{a: A}>
      c.registerClass('a' as never, A, ['a' as never])

      expect(() => c.get('a')).toThrow(/Lazy<T>/)
    })

    it('after a cycle exception the container stays valid (finally clears `resolving`)', () => {
      class A {
        constructor(_a: A) {}
      }
      const c = new Container().registerValue('other', {ok: true}) as unknown as Container<{
        a: A
        other: {ok: true}
      }>
      c.registerClass('a' as never, A, ['a' as never])

      expect(() => c.get('a')).toThrow()
      // second resolve should still surface same error (not "already resolving")
      expect(() => c.get('a')).toThrow(/Circular/)
      // pulling a broken key does not corrupt other keys
      expect(c.get('other').ok).toBe(true)
    })
  })

  describe('symbol keys', () => {
    it('registerValue with a local Symbol() — resolve via get()', () => {
      const KEY = Symbol('config')
      const c = new Container().registerValue(KEY, {port: 3000})
      expect(c.get(KEY)).toEqual({port: 3000})
    })

    it('registerClass with a symbol key — deps mixing string + symbol', () => {
      const LOG = Symbol('logger')
      const c = new Container()
        .registerClass(LOG, ConsoleLogger, [])
        .registerClass('service', Service, [LOG])
      expect(c.get('service').logger).toBe(c.get(LOG))
    })

    it('registerFactory with a symbol key reads another symbol-keyed dep', () => {
      const N = Symbol('n')
      const D = Symbol('doubled')
      const c = new Container()
        .registerValue(N, 21)
        .registerFactory(D, (ctx) => ctx.get(N) * 2)
      expect(c.get(D)).toBe(42)
    })

    it('Symbol.for shares identity across registration sites', () => {
      const c = new Container().registerValue(Symbol.for('shared'), 'a')
      expect(c.get(Symbol.for('shared'))).toBe('a')
    })

    it('local Symbol() is unique — re-creating yields a different key', () => {
      const a = Symbol('x')
      const b = Symbol('x')
      const c = new Container().registerValue(a, 1) as Container<Record<symbol, number>>
      expect(() => c.get(b)).toThrow(/Key "Symbol\(x\)" not found/)
    })

    it('error message formats a missing symbol as Symbol(desc)', () => {
      const SYM = Symbol('missing')
      const c = new Container() as Container<Record<symbol, never>>
      expect(() => c.get(SYM)).toThrow(/Key "Symbol\(missing\)" not found/)
    })

    it('cycle detection: chain renders symbol keys', () => {
      const A = Symbol('A')
      const B = Symbol('B')
      class CA { constructor(_b: unknown) {} }
      class CB { constructor(_a: unknown) {} }
      const c = new Container() as Container<Record<symbol, unknown>>
      c.registerClass(A as never, CA, [B as never])
      c.registerClass(B as never, CB, [A as never])
      expect(() => c.get(A)).toThrow(/Symbol\(A\) -> Symbol\(B\) -> Symbol\(A\)/)
    })

    it('lifetime guard formats symbol parent and child', () => {
      const SCOPED = Symbol('scoped')
      const SINGLE = Symbol('singleton')
      class Dep {}
      class Svc { constructor(_d: Dep) {} }
      const c = new Container()
        .registerClass(SCOPED, Dep, [], 'scoped')
        .registerClass(SINGLE, Svc, [SCOPED], 'singleton')
      expect(() => c.get(SINGLE)).toThrow(
        /Singleton "Symbol\(singleton\)" cannot depend on scoped "Symbol\(scoped\)"/,
      )
    })

    it('lazyKey accepts a symbol — companion is registered under that key', () => {
      const SVC = Symbol('svc')
      const SVC_LAZY = Symbol('svcLazy')
      class Svc {}
      const c = new Container().registerClass(SVC, Svc, [], 'singleton', SVC_LAZY)
      const wrapper = c.get(SVC_LAZY)
      expect(wrapper.get()).toBe(c.get(SVC))
    })

    it('lazyKey accepts a string companion for a symbol-keyed service (mixed)', () => {
      const SVC = Symbol('svc')
      class Svc {}
      const c = new Container().registerClass(SVC, Svc, [], 'singleton', 'svcLazy')
      expect(c.get('svcLazy').get()).toBe(c.get(SVC))
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 — Lifetimes & Scopes
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Lifetimes', () => {
  describe('singleton (default)', () => {
    it('multiple get() return the same instance', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.get('logger')).toBe(c.get('logger'))
    })

    it('singleton also works with registerFactory', () => {
      let calls = 0
      const c = new Container().registerFactory('obj', () => ({n: ++calls}), 'singleton')

      expect(c.get('obj')).toBe(c.get('obj'))
      expect(calls).toBe(1)
    })
  })

  describe('transient', () => {
    it('multiple get() return new instances', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [], 'transient')

      const a = c.get('logger')
      const b = c.get('logger')

      expect(a).not.toBe(b)
      expect(a).toBeInstanceOf(ConsoleLogger)
      expect(b).toBeInstanceOf(ConsoleLogger)
    })

    it('transient — every factory is called fresh', () => {
      let calls = 0
      const c = new Container().registerFactory('obj', () => ({n: ++calls}), 'transient')

      c.get('obj')
      c.get('obj')
      c.get('obj')

      expect(calls).toBe(3)
    })
  })

  describe('scoped', () => {
    it('within one scope — one instance', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [], 'scoped')

      const scope = c.createScope()

      expect(scope.get('logger')).toBe(scope.get('logger'))
    })

    it('different scopes — different instances', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [], 'scoped')

      const s1 = c.createScope()
      const s2 = c.createScope()

      expect(s1.get('logger')).not.toBe(s2.get('logger'))
    })
  })

  describe('scope hierarchy', () => {
    it('a dependency not found locally is resolved from the parent', () => {
      const root = new Container().registerClass('logger', ConsoleLogger, [])

      const child = root.createScope()

      // child has no local registration — walk-up finds it on root
      expect(child.get('logger')).toBe(root.get('logger'))
    })

    it('singleton requested from a child is instantiated on the owner (root)', () => {
      const root = new Container()
        .registerClass('logger', ConsoleLogger, [])
        .registerClass('service', Service, ['logger'])

      const child = root.createScope()

      // The instance must be shared: same between root and child
      expect(child.get('service')).toBe(root.get('service'))
      // The logger is shared too (resolved in the owner = root context)
      expect(child.get('service').logger).toBe(root.get('logger'))
    })

    it('child-owned singleton lives on the child, not on root', () => {
      const root = new Container()
      const child = root.createScope().registerClass('childOnly', ConsoleLogger, [], 'singleton')

      const inst = child.get('childOnly')
      expect(inst).toBeInstanceOf(ConsoleLogger)
      // root does not see the child-only registration
      // @ts-expect-error — childOnly is not in root's type
      expect(() => root.get('childOnly')).toThrow(/Key "childOnly" not found/)
    })

    it('scoped on root: every child scope has its own instance', () => {
      const root = new Container().registerClass('logger', ConsoleLogger, [], 'scoped')

      const s1 = root.createScope()
      const s2 = root.createScope()

      expect(s1.get('logger')).not.toBe(s2.get('logger'))
    })

    it('walk-up: key resolves across a 3-level parent chain', () => {
      // Isolated test for the full chain walk in get(): registration on root,
      // access from l3 (3 levels of parent links).
      const root = new Container().registerValue('depth', 0)
      const l1 = root.createScope()
      const l2 = l1.createScope()
      const l3 = l2.createScope()

      // .get() walks up 3 levels and finds the registration on root
      expect(l3.get('depth')).toBe(0)
      // Any intermediate level returns the same value
      expect(l1.get('depth')).toBe(0)
      expect(l2.get('depth')).toBe(0)
    })
  })

  describe('lifetime leak guard', () => {
    it('singleton → scoped: throws', () => {
      const c = new Container()
        .registerClass('scoped', ConsoleLogger, [], 'scoped')
        .registerClass('singleton', Service, ['scoped'], 'singleton')

      expect(() => c.get('singleton')).toThrow(
        /Singleton "singleton" cannot depend on scoped "scoped"/,
      )
    })

    it('singleton → transient: throws', () => {
      const c = new Container()
        .registerClass('transient', ConsoleLogger, [], 'transient')
        .registerClass('singleton', Service, ['transient'], 'singleton')

      expect(() => c.get('singleton')).toThrow(
        /Singleton "singleton" cannot depend on transient "transient"/,
      )
    })

    it('scoped → scoped: OK (both short-lived within one scope)', () => {
      const c = new Container()
        .registerClass('a', ConsoleLogger, [], 'scoped')
        .registerClass('b', Service, ['a'], 'scoped')

      const scope = c.createScope()
      expect(() => scope.get('b')).not.toThrow()
    })

    it('scoped → transient: OK (grey area, allowed)', () => {
      const c = new Container()
        .registerClass('a', ConsoleLogger, [], 'transient')
        .registerClass('b', Service, ['a'], 'scoped')

      const scope = c.createScope()
      expect(() => scope.get('b')).not.toThrow()
    })

    it('after a leak error, finally correctly clears the singletonStack', () => {
      const c = new Container()
        .registerClass('scoped', ConsoleLogger, [], 'scoped')
        .registerClass('singleton', Service, ['scoped'], 'singleton')
        .registerValue('other', {ok: true})

      expect(() => c.get('singleton')).toThrow()
      // singletonStack must be cleared — a subsequent scoped resolve in a different
      // container of the same tree must not glitch (indirectly — `other` is reachable).
      expect(c.get('other').ok).toBe(true)
    })
  })

  describe('Lazy injection', () => {
    it('lazy wrapper does not instantiate the target before the first .get()', () => {
      let created = 0
      class DbClass extends TrackableAsync {
        constructor() {
          super()
          created++
        }
      }
      const c = new Container().registerClass('db', DbClass, [], 'singleton', 'dbLazy')

      const wrapper = c.get('dbLazy')
      expect(created).toBe(0) // wrapper acquired, but the instance has not been created
      expect(wrapper).toHaveProperty('get')

      const real = wrapper.get()
      expect(created).toBe(1)
      expect(real).toBeInstanceOf(DbClass)
    })

    it('lazy.get() is idempotent: the same singleton', () => {
      const c = new Container().registerClass('db', TrackableAsync, [], 'singleton', 'dbLazy')

      const wrapper = c.get('dbLazy')
      expect(wrapper.get()).toBe(wrapper.get())
      expect(wrapper.get()).toBe(c.get('db'))
    })

    it('Lazy<scoped|transient> companion does NOT legalize injection into a singleton (v4)', () => {
      class Holder {
        constructor(public readonly leakyLazy: { readonly get: () => ConsoleLogger }) {}
      }
      // The `as never` bypass mimics an `as`-cast escape past the AllowedDeps
      // compile-time filter; the runtime guard still catches the leak.
      const c = new Container()
        .registerClass('leaky', ConsoleLogger, [], 'scoped', 'leakyLazy')
        .registerClass('holder', Holder, ['leakyLazy' as never], 'singleton')

      expect(() => c.get('holder')).toThrow(
        /Singleton "holder" cannot depend on transient "leakyLazy"/,
      )
    })

    it('Lazy<singleton> companion legalizes deferred singleton↔singleton injection', () => {
      class Holder {
        constructor(public readonly cfgLazy: { readonly get: () => ConsoleLogger }) {}
      }
      const c = new Container()
        .registerClass('cfg', ConsoleLogger, [], 'singleton', 'cfgLazy')
        .registerClass('holder', Holder, ['cfgLazy'], 'singleton')

      const holder = c.get('holder')

      // The wrapper resolves to the singleton instance, and the resolution is idempotent.
      expect(holder.cfgLazy.get()).toBe(c.get('cfg'))
      expect(holder.cfgLazy.get()).toBe(holder.cfgLazy.get())
    })

    // ────────── Captured scope: the key invariant ─────────
    it('Lazy obtained in scopeA resolves the target through scopeA — even if .get() is called later', () => {
      const root = new Container().registerClass('svc', ConsoleLogger, [], 'scoped', 'svcLazy')

      const a = root.createScope()
      const b = root.createScope()

      const lazyFromA = a.get('svcLazy')
      const lazyFromB = b.get('svcLazy')

      const instA = lazyFromA.get()
      const instB = lazyFromB.get()

      // 1. Each wrapper resolves through its OWN scope → different instances
      expect(instA).not.toBe(instB)

      // 2. lazyFromA.get() returns the same instance as a.get('svc')
      expect(instA).toBe(a.get('svc'))

      // 3. lazyFromA.get() does NOT match b.get('svc') — captured scope, not dynamic
      expect(instA).not.toBe(b.get('svc'))

      // 4. repeated .get() is idempotent within a single scope
      expect(lazyFromA.get()).toBe(instA)
    })

    it('Lazy.get() after dispose of the captured scope → throws "Container is disposed"', async () => {
      const root = new Container().registerClass('svc', ConsoleLogger, [], 'scoped', 'svcLazy')

      const scope = root.createScope()
      const wrapper = scope.get('svcLazy')
      await scope.dispose()

      expect(() => wrapper.get()).toThrow(/Container is disposed/)
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Sanity: T accumulation while chaining + auto-Lazy
// ────────────────────────────────────────────────────────────────────────────
describe('fluent shape', () => {
  it('registerClass + registerFactory + registerValue in a chain — compiles and resolves', () => {
    const c = new Container()
      .registerClass('logger', ConsoleLogger, [])
      .registerFactory('config', () => new AppConfig(8080))
      .registerClass('db', TrackableAsync, [], 'singleton', 'dbLazy')
      .registerClass('service', Service, ['logger'])

    expect(c.get('logger')).toBeInstanceOf(ConsoleLogger)
    expect(c.get('config').port).toBe(8080)
    expect(c.get('db')).toBeInstanceOf(TrackableAsync)
    expect(c.get('service').run()).toBe('ok')
    // auto-Lazy: dbLazy is inferred automatically without explicit declaration
    expect(c.get('dbLazy').get()).toBe(c.get('db'))
  })
})

// ────────────────────────────────────────────────────────────────────────────
// .use() — runtime test (the type contract is already checked in container.test-d.ts).
// Covers Container.use(): runtime delegation to a module function and T accumulation.
// ────────────────────────────────────────────────────────────────────────────
describe('use() — runtime', () => {
  it('inline function receives the container and returns an extended one', () => {
    const c = new Container()
      .registerValue('base', 21)
      .use((inner) => inner.registerFactory('doubled', (ctx) => ctx.get('base') * 2))

    expect(c.get('base')).toBe(21)
    expect(c.get('doubled')).toBe(42)
  })

  it('use can read config and decide what to register (branching)', () => {
    type Mode = 'A' | 'B'
    const env: Mode = 'A'
    const c = new Container()
      .registerValue('mode', env)
      .use((inner) =>
        inner.get('mode') === 'A'
          ? inner.registerValue('out', 'alpha' as const)
          : inner.registerValue('out', 'beta' as const),
      )

    expect(c.get('out')).toBe('alpha')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Regression suite for the get() refactor — lookup cache + helper-based
// singleton resolution. Each test guards an invariant from the implementation
// plan that could quietly break under future refactors.
// ────────────────────────────────────────────────────────────────────────────

describe('get() refactor — invariants under lookup cache + shared helper', () => {
  describe('owned-on-owner invariant', () => {
    it('singleton resolved from a child is disposed by the owner, not by the child', async () => {
      const root = new Container().registerClass('db', TrackableAsync, [])
      const child = root.createScope()

      const inst = child.get('db')
      expect(inst.asyncDisposeCalls).toBe(0)

      await child.dispose()
      // child does not own the singleton — it lives on root
      expect(inst.asyncDisposeCalls).toBe(0)

      await root.dispose()
      expect(inst.asyncDisposeCalls).toBe(1)
    })
  })

  describe('singleton dependencies resolve through the owner scope', () => {
    it('child override of a key does NOT leak into a singleton owned by the parent', () => {
      class Holder {
        constructor(public readonly cfg: AppConfig) {}
      }
      const root = new Container()
        .registerValue('cfg', new AppConfig(8000))
        .registerClass('holder', Holder, ['cfg'])

      const child = (root.createScope() as unknown as { registerValue: (k: string, v: unknown) => unknown })
      // Bypass the compile-time re-registration guard to model a feature-module
      // test that re-registers a key in a child scope on purpose.
      child.registerValue('cfg', new AppConfig(9999))

      const holder = (child as unknown as { get: (k: string) => Holder }).get('holder')
      // Singleton's factory ran on root, so it sees root's cfg, not child's.
      expect(holder.cfg.port).toBe(8000)
    })
  })

  describe('scoped lifetime under shared parent registration', () => {
    it('two child scopes get distinct instances of a parent-registered scoped service', () => {
      class Box { public value = 0 }
      const root = new Container().registerClass('box', Box, [], 'scoped')

      const a = root.createScope()
      const b = root.createScope()

      const ax = a.get('box')
      const ay = a.get('box')
      const bx = b.get('box')

      expect(ax).toBe(ay)         // stable within one scope
      expect(ax).not.toBe(bx)     // distinct across sibling scopes
    })
  })

  describe('lookup cache invalidation via version snapshot', () => {
    it('re-registering on the owner after a child resolve is observed on the next get', () => {
      const root = new Container().registerValue('a', 1)
      const child = root.createScope()

      expect(child.get('a')).toBe(1)

      // Bypass compile-time re-registration guard to model a runtime override
      // (lazy modules / test fixtures / hot-reload scenarios).
      ;(root as unknown as { registerValue: (k: string, v: unknown) => unknown })
        .registerValue('a', 2)

      expect(child.get('a')).toBe(2)
    })

    it('re-registering on the owner is observed from a grandchild scope (3-level chain)', () => {
      const root = new Container().registerValue('a', 'first')
      const child = root.createScope()
      const grand = child.createScope()

      expect(grand.get('a')).toBe('first')

      ;(root as unknown as { registerValue: (k: string, v: unknown) => unknown })
        .registerValue('a', 'second')

      expect(grand.get('a')).toBe('second')
    })

    it('a nearer ancestor registration invalidates a cached farther owner', () => {
      const root = new Container().registerValue('a', 'root')
      const middle = root.createScope()
      const leaf = middle.createScope()

      expect(leaf.get('a')).toBe('root')

      ;(middle as unknown as { registerValue: (k: string, v: unknown) => unknown })
        .registerValue('a', 'middle')

      expect(leaf.get('a')).toBe('middle')
    })

    it('disposing an intermediate ancestor invalidates a cached farther owner', async () => {
      const root = new Container().registerValue('a', 'root')
      const middle = root.createScope()
      const leaf = middle.createScope()

      expect(leaf.get('a')).toBe('root')

      await middle.dispose()

      expect(() => leaf.get('a')).toThrowError(/Ancestor container is disposed/)
    })

    it('registering an unrelated key on the owner does not affect cached resolution of other keys', () => {
      const root = new Container().registerValue('a', 'A')
      const child = root.createScope()

      // First resolve — populates child.lookupCache with entry for 'a'
      expect(child.get('a')).toBe('A')

      // Bump the tree mutation epoch via a brand-new key. The cached entry for
      // 'a' will miss the version compare on next access, fall back to walk-up,
      // and find the same registration — correct even though tree-wide
      // invalidation is deliberately over-eager for cold mutations.
      ;(root as unknown as { registerValue: (k: string, v: unknown) => unknown })
        .registerValue('b', 'B')

      expect(child.get('a')).toBe('A')
      expect((child as unknown as { get: (k: string) => string }).get('b')).toBe('B')
    })

    it('child override after a parent-resolve clears the child lookupCache', () => {
      const root = new Container().registerValue('a', 'parent')
      const child = root.createScope()

      // Child reaches into parent — caches { owner: root, reg, version }
      expect(child.get('a')).toBe('parent')

      // Override locally on child — must invalidate child.lookupCache so the
      // next resolve sees the local registration.
      ;(child as unknown as { registerValue: (k: string, v: unknown) => unknown })
        .registerValue('a', 'child')

      expect(child.get('a')).toBe('child')
    })
  })

  describe('cycle detection coexistence with lookup cache', () => {
    it('a successful resolve does not let a later cycle escape the detector', () => {
      const c = new Container()
        .registerValue('safe', 42)
        .registerFactory('a', (ctx) => ctx.get('b' as never))
        .registerFactory('b', (ctx) => ctx.get('a' as never))

      // First, a clean resolve — fully exercises the helper + cache writes.
      expect(c.get('safe')).toBe(42)

      // Now the cycle must still throw — `resolving` is shared and lives outside
      // any caching path.
      expect(() => c.get('a' as never)).toThrowError(/Circular dependency/)

      // After the throw, the container is still healthy.
      expect(c.get('safe')).toBe(42)
    })

    it('transient ↔ transient cycle is caught (resolving.add must run for every kind)', () => {
      const c = new Container()
        .registerFactory('x', (ctx) => ctx.get('y' as never), 'transient')
        .registerFactory('y', (ctx) => ctx.get('x' as never), 'transient')

      expect(() => c.get('x' as never)).toThrowError(/Circular dependency/)
    })
  })

  describe('lifetime guard remains active across repeated cold resolves', () => {
    it('singleton → scoped throws on every fresh scope, not just the first', () => {
      class Bad {
        constructor(public readonly s: { value: number }) {}
      }
      const root = new Container()
        .registerFactory('shortLived', () => ({value: 1}), 'scoped')
        .registerClass('bad', Bad, ['shortLived'])

      const a = root.createScope()
      const b = root.createScope()

      expect(() => a.get('bad')).toThrowError(/Singleton .* cannot depend on scoped/)
      expect(() => b.get('bad')).toThrowError(/Singleton .* cannot depend on scoped/)
    })
  })

  describe('local fast-path does not skip walk-up for missing local keys', () => {
    it('child without a local registration resolves correctly through the parent', () => {
      const root = new Container().registerValue('shared', 'from-root')
      const child = root.createScope()

      expect(child.get('shared')).toBe('from-root')
      // Repeat to exercise the cached path.
      expect(child.get('shared')).toBe('from-root')
    })
  })

  describe('lookup cache invalidation across all register* methods', () => {
    it('registerClass on a scope with a populated lookupCache clears the cache', () => {
      const root = new Container().registerValue('x', 'parent')
      const child = root.createScope()

      // Populate child.lookupCache
      expect(child.get('x')).toBe('parent')

      class Local { public hello = 'world' }
      ;(child as unknown as { registerClass: (k: string, c: typeof Local, d: readonly never[]) => unknown })
        .registerClass('local', Local, [])

      expect((child as unknown as { get: (k: string) => Local }).get('local').hello).toBe('world')
    })

    it('registerFactory on a scope with a populated lookupCache clears the cache', () => {
      const root = new Container().registerValue('x', 'parent')
      const child = root.createScope()

      expect(child.get('x')).toBe('parent')

      ;(child as unknown as { registerFactory: (k: string, f: () => unknown) => unknown })
        .registerFactory('built', () => 'fresh')

      expect((child as unknown as { get: (k: string) => string }).get('built')).toBe('fresh')
    })
  })

  describe('delegated resolve of explicit undefined and disposed owners', () => {
    it('singleton owned by parent stored as explicit undefined: child resolves it through cache.has fallback', () => {
      const root = new Container().registerValue('maybe', undefined)
      const child = root.createScope()

      // First child.get drives the lookupCache miss → walk-up → cache entry.
      expect(child.get('maybe')).toBeUndefined()

      // Second child.get drives the LOOKUP CACHE HIT path into the helper, where
      // target.cache.get returns undefined and target.cache.has(key) === true is
      // the only way to distinguish "registered as undefined" from "miss".
      expect(child.get('maybe')).toBeUndefined()
    })

    it('singleton resolved from child after the owner is disposed reports the disposed ancestor', async () => {
      const root = new Container().registerClass('svc', AppConfig as never, [] as never)
      const child = root.createScope()

      // Populate child.lookupCache by resolving once while root is still alive.
      child.get('svc')

      await root.dispose()

      expect(() => child.get('svc')).toThrowError(/Ancestor container is disposed/)
    })
  })
  describe('owned array de-duplication', () => {
    it('does not push the same instance twice if it is returned by multiple registrations', () => {
      const instance = { dispose: () => {} }
      
      // Registering the exact same instance under two keys
      const c = new Container()
        .registerFactory('a', () => instance)
        .registerFactory('b', () => instance)
        
      c.get('a') // pushes instance to target.owned
      c.get('b') // hits the !target.owned.includes(instance) branch, evaluates to false
      
      // Cast to inspect private field to ensure it was only added once
      expect((c as unknown as { owned: unknown[] }).owned.length).toBe(1)
    })
  })

  describe('explicit undefined from factory', () => {
    it('caches UNDEFINED_MARKER when a factory returns undefined', () => {
      let calls = 0
      const c = new Container().registerFactory('nil', () => {
        calls++
        return undefined
      })

      // First call executes the factory and hits the `instance === undefined` branch
      expect(c.get('nil')).toBeUndefined()
      // Second call reads from cache, proving it was cached properly
      expect(c.get('nil')).toBeUndefined()

      expect(calls).toBe(1)
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 7 — Test Overrides (.override())
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 7 — Test Overrides', () => {
  it('replaces a registered class with a mock value before first resolve', () => {
    class MockLogger extends ConsoleLogger {}
    const c = new Container()
      .registerClass('logger', ConsoleLogger, [])
    const mock = new MockLogger()

    c.override('logger', mock)

    expect(c.get('logger')).toBe(mock)
  })

  it('returns `this` for fluent chaining', () => {
    const c = new Container().registerClass('logger', ConsoleLogger, [])
    expect(c.override('logger', new ConsoleLogger())).toBe(c)
  })

  it('override on a child scope does not affect the parent', () => {
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const child = root.createScope()
    const mock = new ConsoleLogger()

    child.override('logger', mock)

    expect(child.get('logger')).toBe(mock)
    expect(root.get('logger')).not.toBe(mock)
    expect(root.get('logger')).toBeInstanceOf(ConsoleLogger)
  })

  it('parent override propagates to a child via walk-up', () => {
    const root = new Container().registerClass('cfg', AppConfig, [])
    const child = root.createScope()
    const mock = new AppConfig(9999)

    root.override('cfg', mock)

    expect(child.get('cfg')).toBe(mock)
    expect(root.get('cfg')).toBe(mock)
  })

  it('throws if the key has already been resolved', () => {
    const c = new Container().registerClass('db', TrackableAsync, [])

    c.get('db')

    expect(() => c.override('db', new TrackableAsync())).toThrowError(
      /Cannot override "db" because it has already been resolved/,
    )
  })

  it('throws on a second override (the first override populates the cache)', () => {
    const c = new Container().registerClass('logger', ConsoleLogger, [])

    c.override('logger', new ConsoleLogger())

    expect(() => c.override('logger', new ConsoleLogger())).toThrowError(
      /Cannot override "logger" because it has already been resolved/,
    )
  })

  it('throws on a disposed container', async () => {
    const c = new Container().registerClass('logger', ConsoleLogger, [])
    await c.dispose()

    expect(() => c.override('logger', new ConsoleLogger())).toThrowError(
      /Cannot override on a disposed container \(key: "logger"\)/,
    )
  })

  it('accepts symbol keys', () => {
    const DB = Symbol('db')
    const c = new Container().registerClass(DB, TrackableAsync, [])
    const mock = new TrackableAsync()

    c.override(DB, mock)

    expect(c.get(DB)).toBe(mock)
  })

  it('override value is externally owned — not disposed by the container', async () => {
    const c = new Container().registerClass('db', TrackableAsync, [])
    const mock = new TrackableAsync()

    c.override('db', mock)
    expect(c.get('db')).toBe(mock)

    await c.dispose()

    expect(mock.asyncDisposeCalls).toBe(0)
  })

  it('clears the child lookupCache when an override is applied to the child', () => {
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const child = root.createScope()

    // Walk-up populates child.lookupCache with entry { owner: root, ... }.
    // Singleton lives on root, so child.cache stays empty for this key.
    expect(child.get('logger')).toBeInstanceOf(ConsoleLogger)

    const mock = new ConsoleLogger()
    child.override('logger', mock)

    expect(child.get('logger')).toBe(mock)
    expect(root.get('logger')).not.toBe(mock)
  })

  it('cannot override a registerValue-seeded key (it is in cache from registration)', () => {
    const c = new Container().registerValue('flag', 'on' as string)

    expect(() => c.override('flag', 'off')).toThrowError(
      /Cannot override "flag" because it has already been resolved/,
    )
  })

  it('handles override(key, undefined) via UNDEFINED_MARKER on a non-seeded key', () => {
    const c = new Container().registerFactory<'maybe', string | undefined>(
      'maybe',
      () => 'real',
    )

    c.override('maybe', undefined)

    expect(c.get('maybe')).toBeUndefined()
  })

  // ────────────────────────────────────────────────────────────────────────
  // v3 — override walk-up + kind preservation
  // ────────────────────────────────────────────────────────────────────────

  it('override preserves kind when the original is local (singleton)', () => {
    const c = new Container().registerClass('logger', ConsoleLogger, [], 'singleton')
    const mock = new ConsoleLogger()
    c.override('logger', mock)

    expect(c.get('logger')).toBe(mock)
    // Local registration: same kind preserved
    const reg = (c as unknown as { regs: Map<string, { kind: string }> }).regs.get('logger')
    expect(reg?.kind).toBe('singleton')
  })

  it('override preserves kind when the original is local (scoped)', () => {
    const c = new Container().registerClass('reqCtx', ConsoleLogger, [], 'scoped')
    const mock = new ConsoleLogger()
    c.override('reqCtx', mock)

    const reg = (c as unknown as { regs: Map<string, { kind: string }> }).regs.get('reqCtx')
    expect(reg?.kind).toBe('scoped')
  })

  it('override on child reads kind from parent registration via walk-up', () => {
    const root = new Container().registerClass('reqCtx', ConsoleLogger, [], 'scoped')
    const child = root.createScope()
    const mock = new ConsoleLogger()

    child.override('reqCtx', mock)

    // Override is local on child; parent untouched
    expect(child.get('reqCtx')).toBe(mock)
    expect(root.get('reqCtx')).not.toBe(mock)

    // Child got the kind from parent's registration
    const childReg = (child as unknown as { regs: Map<string, { kind: string }> }).regs.get('reqCtx')
    expect(childReg?.kind).toBe('scoped')
  })

  it('override walks across multiple parent levels (grandparent)', () => {
    const root = new Container().registerClass('shared', ConsoleLogger, [], 'singleton')
    const mid = root.createScope()
    const leaf = mid.createScope()
    const mock = new ConsoleLogger()

    leaf.override('shared', mock)

    expect(leaf.get('shared')).toBe(mock)
    const leafReg = (leaf as unknown as { regs: Map<string, { kind: string }> }).regs.get('shared')
    expect(leafReg?.kind).toBe('singleton')
  })

  it('override throws when key is not registered anywhere in the chain', () => {
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const child = root.createScope()

    expect(() =>
      // @ts-expect-error — 'missing' is not in T
      child.override('missing', new ConsoleLogger())
    ).toThrowError(/Cannot override "missing": key is not registered/)
  })

  it('scoped override on child preserves scoped semantics — distinct instances per scope', () => {
    const root = new Container().registerClass('reqCtx', ConsoleLogger, [], 'scoped')
    const sibling = root.createScope()
    const child = root.createScope()
    const mock = new ConsoleLogger()

    child.override('reqCtx', mock)

    // child uses the mock
    expect(child.get('reqCtx')).toBe(mock)
    // sibling untouched by child's override and gets a fresh scoped instance from root
    expect(sibling.get('reqCtx')).not.toBe(mock)
    expect(sibling.get('reqCtx')).toBeInstanceOf(ConsoleLogger)
    // sibling is stable within its own scope
    expect(sibling.get('reqCtx')).toBe(sibling.get('reqCtx'))
  })

  it('scoped override remains externally owned when resolved from a descendant', async () => {
    const root = new Container().registerClass('reqCtx', TrackableAsync, [], 'scoped')
    const child = root.createScope()
    const grandchild = child.createScope()
    const mock = new TrackableAsync()

    child.override('reqCtx', mock)

    expect(grandchild.get('reqCtx')).toBe(mock)

    await grandchild.dispose()

    expect(mock.asyncDisposeCalls).toBe(0)
  })

  it('overrides a Lazy<T> companion key — UnwrappedValue types the inner mock', () => {
    class Clock {
      now() { return 0 }
    }
    const builder = new Container()
      .registerClass('clock', Clock, [], 'transient', 'clockLazy')

    // Container.UnwrappedValue<typeof builder, 'clockLazy'> resolves to Clock,
    // not Lazy<Clock> — the wrapper is added at the call site below.
    const clockMock: Container.UnwrappedValue<typeof builder, 'clockLazy'> = {
      now: () => 42,
    }

    builder.override('clockLazy', {get: () => clockMock})

    expect(builder.get('clockLazy').get().now()).toBe(42)
  })

  it('override on a Lazy<singleton> companion preserves the lazy-exempt flag across scope walk-up', () => {
    // The override on root pre-seeds root.cache, so a same-container resolve
    // never reaches the lifetime guard. The walk-up path is what actually
    // exercises the regs entry: a singleton consumer registered on a child
    // scope resolves the companion through root.regs (cache miss on scope,
    // walk-up to root.regs hit). If override stripped `lazy: true`, the
    // strict-mode lifetime guard would reject the transient lookup inside
    // an active singleton stack — see `tikets/override-strips-lazy-flag.md`.
    class Logger { info(_msg: string) {} }
    class App { constructor(public readonly loggerLazy: Lazy<Logger>) {} }
    const mock: Logger = {info: () => {}}

    const root = new Container()
      .registerClass('logger', Logger, [], 'singleton', 'loggerLazy')

    root.override('loggerLazy', {get: () => mock})

    const scope = root
      .createScope()
      .registerClass('app', App, ['loggerLazy'], 'singleton')

    expect(() => scope.get('app')).not.toThrow()
    expect(scope.get('app').loggerLazy.get()).toBe(mock)
  })

  it('override on a Lazy<scoped> companion preserves the lifetime-guard rejection across scope walk-up', () => {
    // Symmetric to the previous test: for a Lazy<scoped> companion the
    // original registration carries `lazy: false`, and override must copy
    // that — otherwise an `as`-cast bypass plus override would silently let
    // a scoped target slip into a singleton through the walk-up path.
    class Req {}
    class Holder { constructor(public readonly reqLazy: {readonly get: () => Req}) {} }

    const root = new Container()
      .registerClass('req', Req, [], 'scoped', 'reqLazy')

    root.override('reqLazy', {get: () => new Req()})

    const scope = root
      .createScope()
      .registerClass('holder', Holder, ['reqLazy' as never], 'singleton')

    expect(() => scope.get('holder')).toThrow(
      /Singleton "holder" cannot depend on transient "reqLazy"/,
    )
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 9 — strict: false (opt-out runtime guards)
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 9 — strict: false', () => {
  it('transient resolution skips the cycle bookkeeping (no try/finally)', () => {
    let calls = 0
    const c = new Container({strict: false})
      .registerFactory('counter', () => ({n: ++calls}), 'transient')
    expect(c.get('counter').n).toBe(1)
    expect(c.get('counter').n).toBe(2)
    expect(calls).toBe(2)
  })

  it('singleton resolution caches and returns the same instance', () => {
    const c = new Container({strict: false})
      .registerClass('logger', ConsoleLogger, [])
    const a = c.get('logger')
    const b = c.get('logger')
    expect(a).toBe(b)
    expect(a).toBeInstanceOf(ConsoleLogger)
  })

  it('scoped resolution honours scope isolation under strict:false', () => {
    const root = new Container({strict: false})
      .registerClass('logger', ConsoleLogger, [], 'scoped')
    const a = root.createScope()
    const b = root.createScope()
    expect(a.get('logger')).toBe(a.get('logger'))
    expect(a.get('logger')).not.toBe(b.get('logger'))
  })

  it('singleton delegated from a child scope hits the cached path on owner', () => {
    const root = new Container({strict: false}).registerClass('logger', ConsoleLogger, [])
    const child = root.createScope()
    const fromChild = child.get('logger')
    expect(fromChild).toBeInstanceOf(ConsoleLogger)
    // Cached on root — second resolve from child returns the same instance.
    expect(child.get('logger')).toBe(fromChild)
    expect(root.get('logger')).toBe(fromChild)
  })

  it('createScope inherits the strict flag', () => {
    const root = new Container({strict: false})
    const child = root.createScope()
    expect((child as unknown as {strict: boolean}).strict).toBe(false)

    const strictRoot = new Container()
    const strictChild = strictRoot.createScope()
    expect((strictChild as unknown as {strict: boolean}).strict).toBe(true)
  })

  it('skips the lifetime guard — singleton may depend on a scoped service', () => {
    // Compile-time guard would normally reject this. We bypass via `as never`
    // to model an `as`-cast escape; in strict mode this would throw at runtime,
    // in strict:false it silently constructs the singleton with the scoped dep.
    class Holder {
      constructor(public readonly cfg: AppConfig) {}
    }
    const c = new Container({strict: false})
      .registerClass('cfg', AppConfig, [], 'scoped')
      .registerClass('holder', Holder, ['cfg' as never], 'singleton')

    const holder = c.get('holder')
    expect(holder).toBeInstanceOf(Holder)
    expect(holder.cfg).toBeInstanceOf(AppConfig)
  })

  it('skips local-transient lifetime guard inside a singleton', () => {
    class Trans { public stamp = Math.random() }
    class Svc { constructor(public readonly dep: Trans) {} }
    const c = new Container({strict: false})
      .registerClass('trans', Trans, [], 'transient')
      .registerClass('svc', Svc, ['trans' as never], 'singleton')

    expect(c.get('svc').dep).toBeInstanceOf(Trans)
  })

  it('transient self-cycle: stack overflows instead of throwing Circular dependency', () => {
    class A { constructor(_a: A) {} }
    const c = new Container({strict: false}) as Container<{a: {type: A; kind: 'transient'}}>
    c.registerClass('a' as never, A, ['a' as never], 'transient')
    expect(() => c.get('a')).toThrowError(RangeError)
  })

  it('factory returning undefined: non-transient caches via UNDEFINED_MARKER under strict:false', () => {
    let calls = 0
    const c = new Container({strict: false})
      .registerFactory('nil', () => { calls++; return undefined }, 'singleton')

    expect(c.get('nil')).toBeUndefined()
    expect(c.get('nil')).toBeUndefined()
    expect(calls).toBe(1)
  })

  it('transient registered on parent, resolved from child — no caching under strict:false', () => {
    let calls = 0
    const root = new Container({strict: false})
      .registerFactory('counter', () => ({n: ++calls}), 'transient')
    const child = root.createScope()
    // child has no local registration for 'counter'; the resolve goes through
    // the parent walk-up into resolveWithOwnerAndReg with reg.kind === 'transient'.
    // strict:false branch must NOT cache the result.
    expect(child.get('counter').n).toBe(1)
    expect(child.get('counter').n).toBe(2)
    expect(calls).toBe(2)
  })

  it('owned de-duplication still applies under strict:false', () => {
    const shared = {dispose: () => {}}
    const c = new Container({strict: false})
      .registerFactory('a', () => shared)
      .registerFactory('b', () => shared)
    c.get('a')
    c.get('b')
    expect((c as unknown as {owned: unknown[]}).owned.length).toBe(1)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 10 — has
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 10 — has', () => {
  it('returns true for a locally registered key', () => {
    const c = new Container().registerValue('x', 1)
    expect(c.has('x')).toBe(true)
  })

  it('returns true for a key registered on an ancestor (walk-up)', () => {
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const child = root.createScope()
    expect(child.has('logger')).toBe(true)
  })

  it('walks across multiple intermediate scopes to find the key', () => {
    // root → middle → leaf; key lives on root, both middle and leaf are pass-through.
    // Exercises the `cur = cur.parent` advance step inside the walk-up loop.
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const middle = root.createScope()
    const leaf = middle.createScope()
    expect(leaf.has('logger')).toBe(true)
  })

  it('returns false when no scope in the chain holds the key', () => {
    const root = new Container().registerValue('known', 1)
    const middle = root.createScope()
    const leaf = middle.createScope()
    expect(leaf.has('missing')).toBe(false)
  })

  it('returns false for an unregistered key — does not throw', () => {
    const c = new Container().registerValue('known', 1)
    expect(c.has('nope')).toBe(false)
  })

  it('returns false after the container has been disposed', async () => {
    const c = new Container().registerValue('x', 1)
    await c.dispose()
    expect(c.has('x')).toBe(false)
  })

  it('returns false on a disposed scope even when root still holds the key', async () => {
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const scope = root.createScope()
    await scope.dispose()
    expect(scope.has('logger')).toBe(false)
    // The root is still live.
    expect(root.has('logger')).toBe(true)
  })

  it('does not resolve the key — get() afterwards still cleanly creates the instance', () => {
    const root = new Container().registerClass('logger', ConsoleLogger, [])
    const child = root.createScope()

    expect(child.has('logger')).toBe(true)
    // has() must not populate `owned` on either container.
    expect((root as unknown as {owned: unknown[]}).owned).toHaveLength(0)
    expect((child as unknown as {owned: unknown[]}).owned).toHaveLength(0)

    // get() resolves correctly and the instance is owned by the root (singleton).
    const inst = child.get('logger')
    expect((root as unknown as {owned: unknown[]}).owned).toContain(inst)
    expect((child as unknown as {owned: unknown[]}).owned).toHaveLength(0)
  })

  it('returns true for registerValue with an explicit undefined value', () => {
    const c = new Container().registerValue('maybe', undefined)
    expect(c.has('maybe')).toBe(true)
  })
})

// Suppress unused warnings for imports used only in type tests.
void ({} as DependenciesMap)
