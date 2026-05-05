import {describe, it, expect} from 'vitest'
import {inspect} from 'node:util'
import {Container, type DependenciesMap} from '../src/Container'
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

  // Arity unrolling in Container.registerClass — separate branches for len === 0..4
  // and the tail (len >= 5) via Reflect.construct. len === 0 and 1 are already
  // covered above (ConsoleLogger / Service); here we cover 2, 3, 4 and the tail.
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

    it('len === 6: tail branch with higher arity (stability)', () => {
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
  })

  describe('cradle', () => {
    it('cradle.key === get("key")', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.cradle.logger).toBe(c.get('logger'))
    })

    it('cradle ignores Symbol-key access', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      const anyCradle = c.cradle as unknown as Record<symbol, unknown>
      expect(anyCradle[Symbol.iterator]).toBeUndefined()
      expect(anyCradle[Symbol.toStringTag]).toBeUndefined()
      expect(anyCradle[Symbol.toPrimitive]).toBeUndefined()
    })

    it('util.inspect(cradle) does not throw (the main motivator for Symbol-ignore)', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(() => inspect(c.cradle)).not.toThrow()
    })

    it('cradle is memoized: repeated access returns the same Proxy', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.cradle).toBe(c.cradle)
    })

    it('cradle on a disposed container throws immediately, not on the next level', async () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])
      await c.dispose()

      expect(() => c.cradle).toThrow(/Container is disposed/)
    })

    it('cradle with a numeric key resolves (runtime: string)', () => {
      const c = new Container().registerValue('404', 'Not Found')

      // In JS, p[404] arrives at the Proxy trap as the string '404'.
      expect((c.cradle as Record<string, string>)[404]).toBe('Not Found')
    })
  })

  describe('unknown keys', () => {
    it('get() throws "Key ... not found"', () => {
      const c = new Container().registerValue('known', 'x')
      // @ts-expect-error — trying to resolve an unregistered key
      expect(() => c.get('unknown')).toThrow(/Key "unknown" not found/)
    })

    it('cradle.unknownKey returns undefined (soft mode)', () => {
      // Soft mode is required: otherwise any protocol probe (then/toJSON/...)
      // would crash the app. The hard throw stays in c.get().
      const c = new Container<Record<string, unknown>>()
      expect((c.cradle as Record<string, unknown>).unknownKey).toBeUndefined()
    })

    it('cradle.then returns undefined — Promise.resolve(cradle) does not crash', async () => {
      const c = new Container().registerValue('foo', 1)

      // Without the has-check in Proxy this await would crash, because
      // Promise.resolve(cradle) reads Get('then'), and 'then' is not registered.
      const adopted = await Promise.resolve(c.cradle)

      // Resolve would adopt a thenable if .then were a function.
      // Here .then === undefined → resolve returned the proxy itself.
      expect(adopted.foo).toBe(1)
    })

    it('cradle supports common protocol probes: toJSON, toString, valueOf', () => {
      const c = new Container().registerValue('foo', 1)
      const cr = c.cradle as Record<string, unknown>

      // All these keys are accessed by JSON.stringify, console.log, +cradle, etc.
      // Soft mode returns undefined, not throw.
      expect(cr.toJSON).toBeUndefined()
      expect(cr.toString).toBeUndefined()
      expect(cr.valueOf).toBeUndefined()
      expect(cr.then).toBeUndefined()
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

    it('hasKey walk: key resolves across a 3-level parent chain', () => {
      // Isolated test for the full chain walk in Container.hasKey() and in
      // get()'s walk-up: registration on root, access from l3 (3 levels of parent links).
      const root = new Container().registerValue('depth', 0)
      const l1 = root.createScope()
      const l2 = l1.createScope()
      const l3 = l2.createScope()

      // .get() walks up 3 levels and finds the registration on root
      expect(l3.get('depth')).toBe(0)
      // cradle proxies through hasKey() → also a walk-up
      expect(l3.cradle.depth).toBe(0)
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
      const c = new Container().registerClass('db', DbClass, [], 'singleton', true)

      const wrapper = c.get('dbLazy')
      expect(created).toBe(0) // wrapper acquired, but the instance has not been created
      expect(wrapper).toHaveProperty('get')

      const real = wrapper.get()
      expect(created).toBe(1)
      expect(real).toBeInstanceOf(DbClass)
    })

    it('lazy.get() is idempotent: the same singleton', () => {
      const c = new Container().registerClass('db', TrackableAsync, [], 'singleton', true)

      const wrapper = c.get('dbLazy')
      expect(wrapper.get()).toBe(wrapper.get())
      expect(wrapper.get()).toBe(c.get('db'))
    })

    it('lazy: true legalizes injecting short-lived into a singleton', () => {
      class Holder {
        constructor(public readonly leakyLazy: { readonly get: () => ConsoleLogger }) {}
      }
      const c = new Container()
        .registerClass('leaky', ConsoleLogger, [], 'scoped', true)
        .registerClass('holder', Holder, ['leakyLazy'], 'singleton')

      // Without the lazy escape this would fail: Singleton "holder" cannot depend on scoped "leaky".
      expect(() => c.get('holder')).not.toThrow()
    })

    // ────────── Captured scope: the key invariant ─────────
    it('Lazy obtained in scopeA resolves the target through scopeA — even if .get() is called later', () => {
      const root = new Container().registerClass('svc', ConsoleLogger, [], 'scoped', true)

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
      const root = new Container().registerClass('svc', ConsoleLogger, [], 'scoped', true)

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
      .registerClass('db', TrackableAsync, [], 'singleton', true)
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

// Suppress unused warnings for imports used only in type tests.
void ({} as DependenciesMap)
