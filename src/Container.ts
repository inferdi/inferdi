// Polyfill for Symbol.dispose / Symbol.asyncDispose for environments where these
// well-known symbols are not yet defined (Node <20.4). Symbol.for ensures cross-realm
// consistency: any other code reading Symbol.dispose after this module is loaded
// observes the same registry symbol, so `using` / `await using` interop is preserved.
// On Node 20.4+ the well-known symbol already exists and the ??= is a no-op.
// v8-ignore: the right-hand side never executes on modern Node (target audience),
// so coverage cannot reach it without dropping support for older runtimes.
/* v8 ignore next 2 */
;(Symbol as { dispose?: symbol }).dispose ??= Symbol.for('Symbol.dispose')
;(Symbol as { asyncDispose?: symbol }).asyncDispose ??= Symbol.for('Symbol.asyncDispose')

const UNDEFINED_MARKER = Symbol('UNDEFINED_MARKER')

/**
 * A deferred reference to a value of type `T`. Calling `.get()` resolves the
 * underlying value on demand, without capturing the instance at construction time.
 *
 * Produced when you register a service with a non-empty `lazyKey` — the
 * container additionally registers a sibling key of the user's choice typed as
 * `Lazy<T>`. Inject the lazy companion when a long-lived consumer needs a
 * fresh per-access view of a short-lived service.
 *
 * @example
 * ```ts
 * import { Container, type Lazy } from '@inferdi/inferdi'
 *
 * class Audit {
 *   constructor(private readonly clockLazy: Lazy<Clock>) {}
 *   record() { this.clockLazy.get().now() }
 * }
 * ```
 */
export type Lazy<T> = { readonly get: () => T }

/**
 * Upper bound for the type-level "registry" carried by a {@link Container} —
 * a string-or-symbol-keyed map of registered service types. Used as the
 * constraint on `Container<T>` and on the `TIn` / `TOut` parameters of
 * {@link Module}.
 *
 * The fluent `register*` methods accumulate the map for you, so you rarely
 * need to write this type by hand — `Container.Resolve<typeof builder>`
 * extracts the final shape after the chain.
 */
export type DependenciesMap = Record<string | symbol, unknown>

type NoKeyOverlap<A, B> = keyof A & keyof B extends never
  ? B
  : `Error: module tries to override existing keys: ${string & keyof A & keyof B}`

/**
 * A reusable registration unit for {@link Container.use}. Takes a container
 * carrying the keys `TIn` and returns it widened by the keys in `TOut`.
 *
 * `Module<TIn, TOut>` requires the container's `T` at the `.use()` call site
 * to match `TIn` **exactly**. For one-shot grouping inside a fluent chain,
 * prefer inline lambdas in `.use((c) => c.registerXyz(...))` — TypeScript
 * infers the container's full `T` at the call site, so registrations work
 * without re-listing prior keys. The named `Module<TIn, TOut>` type is most
 * useful for fixture builders that always start from a known base shape.
 *
 * @template TIn  - Required input keys (the container's T at the use-site).
 * @template TOut - Keys this module adds.
 *
 * @example
 * ```ts
 * import { Container, type Module } from '@inferdi/inferdi'
 *
 * const fixtureMailer: Module<{ config: { env: string } }, { mailer: Mailer }> =
 *   (c) => {
 *     const { env } = c.get('config')
 *     return env === 'test'
 *       ? c.registerClass('mailer', MockMailer, [])
 *       : c.registerClass('mailer', RealMailer, [])
 *   }
 *
 * new Container()
 *   .registerValue('config', { env: 'test' })
 *   .use(fixtureMailer)
 * ```
 */
export type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & NoKeyOverlap<TIn, TOut>>

type RegistrationKind = 'singleton' | 'transient' | 'scoped'

interface Registration<T extends DependenciesMap, K extends keyof T> {
  readonly kind: RegistrationKind
  readonly fn: (container: Container<T>) => T[K]
  // Marker for the lazy wrapper. Lazy<T> is registered as transient, but it is safe
  // to inject into a singleton: fn does NOT call c.get(key) immediately — it returns
  // a closure { get } that defers the resolve until the actual access. The instance
  // is not captured.
  // WARNING: if you ever change the lazy implementation — preserve this invariant,
  // otherwise the lifetime check below will start letting real leaks slip through.
  readonly lazy?: boolean
}

// Snapshot of "where does this key live" cached on the resolving container.
// Stored only after a successful walk-up (this.parent → ... → owner.regs.get(key) hit).
// `ownerRegsVersion` is the value of `owner.regsVersion` at the moment of caching;
// on a cache hit we compare it against `cached.owner.regsVersion` to invalidate
// stale entries when an ancestor (or the owner itself) re-registered the key.
// This is the lightweight alternative to recursively walking children on register*.
interface LookupEntry<T extends DependenciesMap, K extends keyof T = keyof T> {
  readonly owner: Container<T>
  readonly reg: Registration<T, K>
  readonly ownerRegsVersion: number
}

// Projects the constructor parameter types onto the allowed DI-map keys.
// Prevents passing a deps key whose value is not assignable to the corresponding argument.
type DepsOf<T extends DependenciesMap, A extends readonly unknown[]> = {
  readonly [I in keyof A]: Extract<
    keyof T,
    {
      [K in keyof T]: unknown extends A[I] ? never : T[K] extends A[I] ? K : never
    }[keyof T]
  >
}

// Instances that the container knows how to close on dispose.
// Probe order: Symbol.asyncDispose → Symbol.dispose → plain .dispose().
interface DisposableLike {
  [Symbol.dispose]?: () => void
  [Symbol.asyncDispose]?: () => PromiseLike<void>
  dispose?: () => void | PromiseLike<void>
}

/**
 * A type-safe, fluent dependency-injection container with scopes, lazy
 * injection, lifetime guards, and explicit resource management.
 *
 * Each `register*` call returns a new `Container` whose type parameter `T` is
 * widened with the new key — letting `.get(key)` return the precisely typed
 * service. A fresh container starts empty (`T = Record<never, never>`), so
 * `.get('anything')` is rejected at compile time until the key is registered.
 *
 * **Lifetimes**
 * - `singleton` (default) — one instance per owning container.
 * - `scoped` — one instance per `createScope()` child.
 * - `transient` — a new instance for every `.get()`. Caller-owned, never disposed.
 *
 * **Resource management.** `Container` itself implements `Symbol.dispose` and
 * `Symbol.asyncDispose`, so it composes with `using` / `await using`. Owned
 * instances are torn down in reverse-creation (LIFO) order; multiple disposer
 * failures are surfaced as a single `AggregateError`.
 *
 * @template T - The map of registered keys to service types. Accumulates
 *               automatically through the fluent `register*` methods.
 *
 * @example
 * ```ts
 * import { Container } from '@inferdi/inferdi'
 *
 * class Logger { log(msg: string) { console.log(msg) } }
 * class UserRepo { constructor(private readonly logger: Logger) {} }
 *
 * const c = new Container()
 *   .registerClass('logger', Logger, [])
 *   .registerClass('userRepo', UserRepo, ['logger'])
 *
 * c.get('userRepo')  // ← typed as UserRepo
 * ```
 */
export class Container<T extends DependenciesMap = Record<never, never>> {

  /** @internal */
  private readonly regs = new Map<keyof T, Registration<T, keyof T>>()
  /** @internal */
  private readonly cache = new Map<keyof T, unknown>()
  // Bumped on every register* on this container. Read by descendants' lookupCache
  // entries to detect that a previously-cached (owner, reg) snapshot is stale —
  // see LookupEntry.ownerRegsVersion above. Cheap to read (integer field) and the
  // compare lands on the cold path of get() (lookupCache is reached only after a
  // cache miss + local fast-path miss).
  /** @internal */
  private regsVersion = 0
  // Memoizes the result of the parent-chain walk-up: key → { owner, reg, version }.
  // Lazily allocated on first miss (a brand-new container that never resolves
  // through a parent — typical for root or for build-only intermediates — pays
  // zero allocation). Entries cover ONLY parent-chain hits; the local-regs hit
  // is served by a direct `this.regs.get(key)` fast-path before consulting this
  // map. Negative lookups (key not found anywhere) are not cached.
  // Declared as `Map | undefined` (not `lookupCache?: Map`) to satisfy
  // exactOptionalPropertyTypes when reset to undefined in dispose().
  /** @internal */
  private lookupCache: Map<keyof T, LookupEntry<T>> | undefined = undefined
  // Teardown queue. Only instances created by THIS container land here
  // (not registerValue — external ownership; not transient — owned by the caller).
  // Guards against double dispose when the same instance is registered under
  // multiple keys (registerFactory('a', () => shared); registerFactory('b', () => shared)).
  // Array preserves insertion order — on dispose we iterate in reverse for LIFO.
  /** @internal */
  private readonly owned: unknown[] = []
  // resolving and singletonStack are shared across the whole tree — children inherit
  // references from the parent. resolving catches cycles, singletonStack catches an
  // attempt by a singleton to take a scoped dependency.
  // A separate `root` field is unnecessary: these two collections already span the chain.
  //
  // INVARIANT: get() MUST stay synchronous. resolving works as a precise projection of
  // the call stack only because a single get() runs atomically before returning to the
  // event loop. If async factories are ever added and get() becomes async — concurrent
  // resolves (different HTTP requests) will start mutating the shared resolving array /
  // singletonStack at the same time, raising false cycles and false lifetime violations.
  // Async factories require either a per-resolve local resolving (not shared), or a
  // separate two-phase API (resolveAsync on top of a sync get with pre-warming).
  /** @internal */
  private readonly resolving: (keyof T)[]
  /** @internal */
  private readonly singletonStack: (keyof T)[]
  /** @internal */
  private _disposed = false
  // parent is mutable: dispose nulls the reference so a disposed child does not hold
  // the live root through the chain. Otherwise an externally-stored reference to a
  // disposed scope would block GC of the root with all of its caches and factories.
  // Declared as `T | undefined` (not `parent?: T`) to satisfy exactOptionalPropertyTypes
  // when assigning undefined in dispose().
  /** @internal */
  private parent: Container<T> | undefined

  /**
   * Creates a new container. The `parent` parameter is internal — to spawn a
   * child scope, call `parent.createScope()` rather than the constructor.
   *
   * @param parent - Optional parent container; passed by `createScope()`.
   *                 When provided, the child shares cycle-detection state with
   *                 its ancestors and inherits all registrations through the
   *                 scope chain.
   */
  public constructor(parent?: Container<T>) {
    this.parent = parent
    this.resolving = parent ? parent.resolving : []
    this.singletonStack = parent ? parent.singletonStack : []
  }

  // Internal cast for fluent narrowing of T. The actual instance does not change,
  // only the view of T does. Safe thanks to Exclude<K, keyof T> on the input position
  // of `key` — re-registration is rejected by the compiler, so widening the type
  // always adds a NEW key.
  /** @internal */
  private as<U extends DependenciesMap>(): Container<U> {
    return this as unknown as Container<U>
  }

  /**
   * Registers a class constructor under a specific key.
   *
   * The container automatically infers the created type and adds it to the
   * container's registry. The compiler strictly checks that the `deps` array
   * precisely matches the constructor's arguments by both type and position.
   * Passing a `lazyKey` additionally registers a `Lazy<V>` wrapper under that
   * companion identifier — the user picks the wrapper key explicitly, which
   * lets `string` and `symbol` keys coexist on equal footing.
   *
   * @template K - The string-or-symbol key to register the class under. Must not be already registered.
   * @template V - The instance type created by the constructor.
   * @template A - The tuple of constructor argument types.
   * @template LK - The string-or-symbol companion key for the optional `Lazy<V>` wrapper.
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param Ctor - The class constructor to instantiate.
   * @param deps - A tuple of dependency keys that map positionally to the constructor's parameters.
   * @param kind - The lifetime of the instance: `'singleton'` (default), `'scoped'`, or `'transient'`.
   * @param lazyKey - Optional companion key (string or symbol). When provided, registers a
   *                  `Lazy<V>` wrapper under that key. Must differ from `key` and from any
   *                  already-registered key.
   * @returns A new container reference typed with the additionally registered key(s).
   *
   * @example
   * ```ts
   * class UserRepo { constructor(private readonly logger: Logger, private readonly dsn: string) {} }
   *
   * new Container()
   *   .registerValue('dsn', 'postgres://localhost')
   *   .registerClass('logger', Logger, [])
   *   .registerClass('userRepo', UserRepo, ['logger', 'dsn'])
   *
   * // Lazy companion under an explicit key:
   * const DB: unique symbol = Symbol('db') as unique symbol
   * const DB_LAZY: unique symbol = Symbol('dbLazy') as unique symbol
   * new Container().registerClass(DB, PgPool, [], 'singleton', DB_LAZY)
   * ```
   */
  public registerClass<
    K extends string | symbol,
    V,
    A extends readonly unknown[]
  >(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => NoInfer<V>,
    deps: NoInfer<DepsOf<T, A>>,
    kind?: RegistrationKind
  ): Container<T & Record<K, V>>

  public registerClass<
    K extends string | symbol,
    V,
    A extends readonly unknown[],
    LK extends string | symbol
  >(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => NoInfer<V>,
    deps: NoInfer<DepsOf<T, A>>,
    kind: RegistrationKind | undefined,
    lazyKey: Exclude<LK, keyof T | K>
  ): Container<T & Record<K, V> & Record<LK, Lazy<V>>>

  public registerClass<V>(
    key: string | symbol,
    Ctor: new (...args: any[]) => any,
    deps: any[],
    kind: RegistrationKind = 'singleton',
    lazyKey?: string | symbol
  ): any {
    // Keep the reference to the original array — in DI idiom deps are passed as a
    // literal and never mutated after registration. Saves one allocation per registerClass.
    const keys = deps as readonly (keyof T)[]
    const len = keys.length

    // Arity unrolling. V8 JITs a direct `new Ctor(a, b)` with an inline cache keyed on
    // Ctor's shape; Reflect.construct goes through a runtime stub, ArrayLike iteration,
    // and is not inlined. We cover 0..7 args via direct calls — this is ≥99% of real
    // classes in DI. The tail (8+) falls back to Reflect.construct, preserving type
    // safety (Reflect.construct is typed via ArrayLike, no unsound `args as unknown as A` cast).
    //
    // Additionally, the 0-ary path saves an allocation: no array, no closure over keys.
    let fn: (c: Container<T>) => V

    // Non-null assertions on keys[N] are safe: each branch is guarded by `len === N`,
    // and `keys` is a tuple of length `len`. The `!` is there to satisfy the compiler
    // under noUncheckedIndexedAccess without paying for runtime checks the JIT cannot.
    if (len === 0) {
      fn = () => new (Ctor as unknown as new () => V)()
    } else if (len === 1) {
      const k0 = keys[0]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown) => V)(c.get(k0))
    } else if (len === 2) {
      const k0 = keys[0]!, k1 = keys[1]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown) => V)(
        c.get(k0), c.get(k1),
      )
    } else if (len === 3) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2),
      )
    } else if (len === 4) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2), c.get(k3),
      )
    } else if (len === 5) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!, k4 = keys[4]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2), c.get(k3), c.get(k4)
      )
    } else if (len === 6) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!, k4 = keys[4]!, k5 = keys[5]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2), c.get(k3), c.get(k4), c.get(k5)
      )
    } else if (len === 7) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!, k4 = keys[4]!, k5 = keys[5]!, k6 = keys[6]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2), c.get(k3), c.get(k4), c.get(k5), c.get(k6)
      )
    } else {
      // Tail: 8+ deps. Start from an empty array and push — V8 keeps the array as
      // PACKED_ELEMENTS kind. `new Array(len)` + `args[i] = ...` would create a HOLEY
      // array, which V8 only transitions to PACKED after full filling, and Reflect.construct
      // on the intermediate HOLEY runs slightly slower.
      fn = (c) => {
        const args: unknown[] = []

        for (let i = 0; i < len; i++) {
          args.push(c.get(keys[i]!))
        }

        return Reflect.construct(Ctor, args)
      }
    }

    this.regs.set(key as keyof T, {kind, fn} as Registration<T, keyof T>)
    this.cache.delete(key as unknown as keyof T)
    this.regsVersion++
    // Local lookupCache holds (owner, reg) pairs found via walk-up — re-registering
    // anything on this container can change which `reg` a previous walk-up should
    // have returned (if the new key shadows a parent registration). Descendants
    // that cached an entry pointing to this container are invalidated through the
    // version bump above, so we only need to clear our own.
    if (this.lookupCache !== undefined) {
      this.lookupCache.clear()
    }

    // Lazy alias: a thin { get } wrapper on top of the eager key. The instance itself
    // is not created until the consumer calls .get(). The wrapper is transient — it
    // takes the container in which it was requested, so scoped targets work correctly.
    //
    // INVARIANT: fn must NOT call c.get(key) synchronously — only return a closure.
    // This fact makes the lazy wrapper safe to inject into a singleton and justifies
    // the `lazy: true` marker on the Registration, which excludes it from the lifetime
    // check in get(). If this implementation is ever "simplified" to a direct c.get(key)
    // — the protection against short-lived deps leaking into long-lived ones will break.
    //
    // NOTE (captured scope): `c` is captured at the moment the lazy wrapper is RESOLVED,
    // not at the moment .get() is called. If you store the wrapper and call .get() later
    // from a different context — the resolve still goes through the original container.
    // This is predictable, but it is "captured scope", not "dynamic scope" — do not confuse.
    //
    // ⚠️ PITFALL: Lazy<Scoped> injected into a Singleton.
    // When a singleton lives on root and resolves its lazy dependency, the wrapper
    // captures c = root. On the first wrapper.get(), the scoped instance is cached on
    // root and effectively becomes a singleton — every subsequent .get() from any scope
    // returns the same instance. So Lazy<T> legalizes the injection per the lifetime
    // check, but does NOT make scoped truly scoped if used this way. Lazy<scoped> works
    // correctly only when the wrapper is obtained in the right scope (a scoped service
    // injecting Lazy<otherScoped> in the same scope). For request-scoped values inside
    // singletons, the only correct solution is AsyncLocalStorage; a DI container with
    // captured scope cannot solve this on its own.
    // No pitfall for transient: transient is not cached, every .get() creates a new instance.
    if (lazyKey !== undefined) {
      const targetKey = key as unknown as keyof T
      this.regs.set(lazyKey as unknown as keyof T, {
        kind: 'transient',
        lazy: true,
        fn: (c) => ({get: () => c.get(targetKey)} as unknown as T[keyof T]),
      })
    }

    return this.as()
  }

  /**
   * Registers a factory function under a specific key.
   *
   * The type `V` is inferred from the factory's return value and is automatically
   * added to the container's map. The factory receives the container as its only
   * argument, allowing it to resolve and combine other registered dependencies
   * (e.g., reading a config value to construct a connection pool).
   *
   * @template K - The string-or-symbol key to register the factory under. Must not be already registered.
   * @template V - The return type of the factory.
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param factory - A function that takes the current container and returns the instance.
   * @param kind - The lifetime of the instance: `'singleton'` (default), `'scoped'`, or `'transient'`.
   * @returns A new container reference typed with the additionally registered key.
   *
   * @example
   * ```ts
   * import { Pool } from 'pg'
   *
   * new Container()
   *   .registerValue('config', { dsn: 'postgres://...', poolSize: 10 })
   *   .registerFactory('pgPool', (c) => {
   *     const { dsn, poolSize } = c.get('config')
   *     return new Pool({ connectionString: dsn, max: poolSize })
   *   })
   * ```
   */
  public registerFactory<K extends string | symbol, V>(
    key: Exclude<K, keyof T>,
    factory: (c: Container<T>) => NoInfer<V>,
    kind: RegistrationKind = 'singleton',
  ): Container<T & Record<K, V>> {
    this.regs.set(
      key as unknown as keyof T,
      {kind, fn: factory as (c: Container<T>) => T[keyof T]},
    )
    this.cache.delete(key as unknown as keyof T)
    this.regsVersion++
    if (this.lookupCache !== undefined) {
      this.lookupCache.clear()
    }
    return this.as()
  }

  /**
   * Registers a ready-made static value under a specific key.
   *
   * The container treats this value as **externally owned** — it does not enter
   * the teardown queue and `dispose()` will not be called on it during shutdown.
   * Use this for primitives, configs, and pre-constructed objects whose lifecycle
   * you manage outside the container.
   *
   * @template K - The string-or-symbol key to register the value under. Must not be already registered.
   * @template V - The type of the value being registered (inferred).
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param value - The static value to register.
   * @returns A new container reference typed with the additionally registered key.
   *
   * @example
   * ```ts
   * new Container()
   *   .registerValue('config', { port: 8080, env: 'production' as const })
   *   .registerValue('startedAt', Date.now())
   * ```
   */
  public registerValue<K extends string | symbol, const V>(
    key: Exclude<K, keyof T>,
    value: V,
  ): Container<T & Record<K, V>> {
    // The value is external — it does not enter `owned`, dispose is not called on it.
    this.cache.set(key as unknown as keyof T, value === undefined ? UNDEFINED_MARKER : value)
    // The factory is unreachable at runtime: cache.set above always wins the
    // fast-path in get(). The Registration is
    // kept for shape-uniformity with registerClass/registerFactory.
    // v8-ignore on the lambda body avoids a phantom branch.
    this.regs.set(
      key as unknown as keyof T,
      /* v8 ignore next */
      {kind: 'singleton', fn: () => value as unknown as T[keyof T]},
    )
    this.regsVersion++
    if (this.lookupCache !== undefined) {
      this.lookupCache.clear()
    }
    return this.as()
  }

  /**
   * Replaces an existing registration with a static value — for **tests only**.
   *
   * Unlike `registerValue`, this method does not widen the container type and
   * is the only registration call that intentionally targets an already-known
   * key. The replacement value must satisfy the originally registered type
   * (`T[K]`), so a mock has to structurally implement the production interface
   * — no `as any` escape hatch is needed.
   *
   * **Strict guarantees (Fail Fast):**
   * - Throws if called on a disposed container.
   * - Throws if the key has already been resolved on this container. A late
   *   override would let already-built consumers retain a reference to the
   *   original instance while new resolves see the mock — a graph-level
   *   inconsistency. Always `.override()` BEFORE any `.get()`.
   *
   * The override is stored as a singleton: every subsequent `.get(key)` on
   * this container returns the same value. The replacement is treated as
   * externally owned — it is NOT pushed into the container's disposal queue
   * (same contract as `registerValue`); the test suite owns its lifetime.
   *
   * Scope semantics: `.override()` writes to the current container only. A
   * child scope's override is invisible to its parent and to sibling scopes;
   * a parent-level override propagates via the standard parent walk-up.
   *
   * **Production code should not call `.override()`.** It exists for tests
   * and hot-reload-style fixtures. Use `.use()` for conditional registration
   * in production builders.
   *
   * @template K - A key already present in `T`.
   *
   * @param key - The registered key to replace.
   * @param value - The replacement value, strictly typed as `T[K]`.
   * @returns `this` for fluent chaining.
   *
   * @throws If the container is disposed.
   * @throws If the key has already been resolved on this container.
   *
   * @example
   * ```ts
   * function buildAppContainer() {
   *   return new Container()
   *     .registerClass('logger', ConsoleLogger, [])
   *     .registerClass('db', PgDb, [])
   * }
   *
   * // Test setup
   * const c = buildAppContainer()
   *   .override('logger', new MockLogger())
   *   .override('db', mockDb)
   * c.get('logger') // MockLogger
   * ```
   */
  public override<K extends keyof T>(key: K, value: T[K]): this {
    if (this._disposed) {
      throw new Error(`Cannot override on a disposed container (key: "${String(key)}")`)
    }
    // Strict Runtime Guard: refuse late overrides. If `cache.has(key)` is true,
    // the original was already resolved (or eagerly seeded by registerValue) on
    // this container — replacing it now would split the dependency graph
    // (existing consumers keep the old ref; future resolves see the mock).
    if (this.cache.has(key)) {
      throw new Error(
        `Cannot override "${String(key)}" because it has already been resolved. ` +
          `Overrides must be applied before any .get() calls to ensure clean dependency graphs and prevent resource leaks.`,
      )
    }
    this.cache.set(key, value === undefined ? UNDEFINED_MARKER : value)
    // Stored as a singleton with a dead-code factory (cache.set above always
    // wins the hot-path) — same shape as registerValue for uniformity.
    this.regs.set(
      key,
      /* v8 ignore next */
      {kind: 'singleton', fn: () => value as unknown as T[keyof T]},
    )
    this.regsVersion++
    if (this.lookupCache !== undefined) {
      this.lookupCache.clear()
    }
    return this
  }

  /**
   * Applies a registration module (or inline configuration function) on top of
   * the current container.
   *
   * Returns a container extended with the module's newly registered keys. Useful
   * for grouping registrations into reusable chunks or reading already-registered
   * values to decide what to register next.
   *
   * @template R - The additional dependencies map introduced by the module.
   *
   * @param fn - A module function that takes the current container and returns a newly built one.
   * @returns A new container type combining the previous and new registrations.
   *
   * @example
   * ```ts
   * const c = new Container()
   *   .registerValue('config', { port: 8080 })
   *   .use((c) => {
   *     const port = c.get('config').port
   *     return port === 8080
   *       ? c.registerClass('a', A, [])
   *       : c.registerClass('b', B, [])
   *   })
   * ```
   */
  public use<R extends DependenciesMap>(fn: Module<T, R>): Container<T & R> {
    return fn(this) as unknown as Container<T & R>
  }

  /**
   * Creates a child scope that inherits every registration from this container.
   * Resolutions through the child cache `scoped` services per-scope; singletons
   * remain on their owning container; transients stay caller-owned.
   *
   * Each scope owns the instances it creates and disposes them when the scope
   * itself is disposed (`using` / `await using` / explicit `.dispose()`).
   *
   * @throws {Error} If this container has already been disposed.
   * @returns A new child container with the same `T` and an isolated cache.
   *
   * @example
   * ```ts
   * async function handle(req: Request) {
   *   await using scope = root.createScope()
   *   const ctx = scope.get('reqCtx')   // cached on this scope only
   * }
   * ```
   */
  public createScope(): Container<T> {
    if (this._disposed) {
      throw new Error('Cannot create scope from a disposed container')
    }
    return new Container<T>(this)
  }

  /**
   * Resolves a registered service by key with full type safety. Walks up the
   * scope chain to find the registration, then honours the registered lifetime
   * (singleton / scoped / transient).
   *
   * @template K - One of the keys registered on this container or any ancestor.
   *               Restricted to `keyof T`, so unknown keys fail at compile time.
   * @param key - The registration key to resolve.
   * @returns The resolved service. Each call returns a fresh instance for
   *          `transient`; the cached instance for `singleton` and `scoped`.
   * @throws {Error} If the container is disposed.
   * @throws {Error} If the key is not registered (`Key "..." not found`).
   * @throws {Error} On a circular dependency
   *                 (`Circular dependency detected: a -> b -> a ...`).
   * @throws {Error} On a lifetime violation
   *                 (`Singleton "..." cannot depend on scoped "..."`).
   */
  public get<K extends keyof T>(key: K): T[K] {
    // 1. Hot path: local cache hit.
    //    Single Map.get covers ≥99.9% of resolves. `UNDEFINED_MARKER` covers the
    //    rare deliberately-registered `undefined`. Note that `_disposed` is checked
    //    AFTER the cache lookup — dispose() clears `cache`, so a disposed container
    //    falls through to the explicit check below; observable semantics unchanged.
    const cached = this.cache.get(key)

    if (cached !== undefined) {
      return (cached === UNDEFINED_MARKER ? undefined : cached) as T[K]
    }

    if (this._disposed) {
      throw new Error(`Container is disposed (key: "${String(key)}")`)
    }

    // 2. Local fast-path: registration on THIS container.
    //    Most common case in flat (non-scope-tree) DI graphs and in scope-tree DI
    //    for child-owned services. Skips lookupCache + entry deconstruction.
    const localReg = this.regs.get(key) as Registration<T, K> | undefined

    if (localReg !== undefined) {
      if (localReg.kind === 'transient') {
        if (!localReg.lazy && this.singletonStack.length > 0) {
          const parent = this.singletonStack[this.singletonStack.length - 1]!
          throw new Error(
            `Singleton "${String(parent)}" cannot depend on transient "${String(key)}". ` +
            `Use Lazy<T> (register with a lazyKey companion) to get a fresh instance per access.`,
          )
        }

        if (this.resolving.includes(key)) {
          const chain = [...this.resolving, key].map((k) => String(k)).join(' -> ')
          throw new Error(
            `Circular dependency detected: ${chain}. ` +
            `Consider breaking the cycle with Lazy<T> (register one side with a lazyKey ` +
            `companion and inject that companion key instead).`,
          )
        }

        this.resolving.push(key)
        try {
          return localReg.fn(this)
        } finally {
          this.resolving.pop()
        }
      }

      // Self-resolve: owner === this for every kind, so target === this.
      return this.resolveWithOwnerAndReg(this, localReg, key)
    }

    // 3. Walk-up across the parent chain, with a per-container memoization of the
    //    found (owner, reg) pair. The cache is invalidated lazily through a version
    //    snapshot on `owner.regsVersion`, so a register* on any ancestor (including
    //    grandparent) will be observed on the next resolve in this scope.
    let owner: Container<T> | undefined
    let reg: Registration<T, K> | undefined

    const cachedEntry = this.lookupCache?.get(key)
    if (cachedEntry !== undefined && cachedEntry.ownerRegsVersion === cachedEntry.owner.regsVersion) {
      owner = cachedEntry.owner
      reg = cachedEntry.reg as Registration<T, K>
    } else {
      let cur: Container<T> | undefined = this.parent

      while (cur !== undefined) {
        const r = cur.regs.get(key) as Registration<T, K> | undefined

        if (r !== undefined) {
          owner = cur
          reg = r
          break
        }

        cur = cur.parent
      }

      // Cold error path: nothing was found anywhere up the chain. Before throwing the
      // generic "Key not found", surface a more actionable message if any ancestor was
      // already disposed. dispose() runs `regs.clear()` + `cache.clear()`, so the lookup
      // above silently slides past a disposed ancestor as if the key were missing — that
      // hides a real bug ("you are reaching into a torn-down container") behind a
      // misleading "Key not found". The extra walk is safe to do here because we are
      // already on the error path; the hot path is untouched.
      if (reg === undefined) {
        let ancestor: Container<T> | undefined = this.parent

        while (ancestor !== undefined) {
          if (ancestor._disposed) {
            throw new Error(`Ancestor container is disposed (key: "${String(key)}")`)
          }

          ancestor = ancestor.parent
        }

        throw new Error(`Key "${String(key)}" not found`)
      }

      // Memoize the successful walk-up. Negative results are not cached.
      if (this.lookupCache === undefined) {
        this.lookupCache = new Map()
      }
      this.lookupCache.set(key, {
        owner: owner as Container<T>,
        reg,
        ownerRegsVersion: (owner as Container<T>).regsVersion,
      })
    }

    // 4. Dispatch to the shared resolver.
    //    - singleton: instance lives on `owner`, even when `this !== owner`. Factory
    //      receives `owner` so the singleton's deps resolve through owner-scope —
    //      preserves lifetime guard and prevents child-scope from masking deps.
    //    - scoped:    one instance per `this` scope (caller-side ownership).
    //    - transient: caller-owned, never cached.
    const target = reg.kind === 'singleton' ? (owner as Container<T>) : this
    return this.resolveWithOwnerAndReg(target, reg, key)
  }

  // Shared resolution path used both for self-resolves (owner === this) and for
  // delegated singleton resolves (owner !== this). The split avoids the previous
  // `owner.get(key)` re-entry, which paid for a full second walk-up on every
  // singleton resolve from a child scope.
  //
  // Invariants (see plan in /home/korsox/.claude/plans/jaunty-wibbling-lovelace.md):
  // - `resolving` and `singletonStack` are shared across the scope tree (initialized
  //   from parent in the constructor) — manipulating them through `this` is safe
  //   regardless of whether `target` is `this` or `owner`.
  // - `resolving.add/delete` is unconditional: cycle detection MUST cover transient↔
  //   transient cycles, otherwise stack overflow replaces a clean diagnostic.
  // - `singletonStack.push/pop` is conditional on `kind === 'singleton'`, matching
  //   the lifetime-guard contract.
  // - `owned.add` always lands on `owner.owned` so disposing `owner` releases the
  //   instance even when it was originally requested from a child scope.
  // - `reg.fn(owner)` is intentional: the factory must observe owner-scope, not the
  //   caller's scope. Changing this to `reg.fn(this)` would let a child override
  //   parent-scope dependencies of an owner-scope singleton.
  /** @internal */
  private resolveWithOwnerAndReg<K extends keyof T>(
    target: Container<T>,
    reg: Registration<T, K>,
    key: K,
  ): T[K] {
    // Cache check on the owning container. For self-resolves the get() hot-path
    // already cleared `this.cache`, so this branch is reachable only when the
    // singleton is delegated from a child scope (this !== target).
    if (target !== this && reg.kind !== 'transient') {
      const cached = target.cache.get(key)

      if (cached !== undefined) {
        return (cached === UNDEFINED_MARKER ? undefined : cached) as T[K]
      }
    }

    // Lifetime guard — short-lived dep inside a long-lived (singleton) factory.
    // `singletonStack.length > 0` is a cheap integer field-access; the rest of the
    // condition only runs inside an active singleton resolution.
    if (!reg.lazy && (reg.kind === 'scoped' || reg.kind === 'transient') && this.singletonStack.length > 0) {
      const parent = this.singletonStack[this.singletonStack.length - 1]!
      throw new Error(
        `Singleton "${String(parent)}" cannot depend on ${reg.kind} "${String(key)}". ` +
        `Use Lazy<T> (register with a lazyKey companion) to get a fresh instance per access.`,
      )
    }

    // Cycle detection — needed for ALL kinds (incl. transient<->transient).
    if (this.resolving.includes(key)) {
      const chain = [...this.resolving, key].map((k) => String(k)).join(' -> ')
      throw new Error(
        `Circular dependency detected: ${chain}. ` +
        `Consider breaking the cycle with Lazy<T> (register one side with a lazyKey ` +
        `companion and inject that companion key instead).`,
      )
    }

    // Disposed check on the owner — relevant only for delegated singleton resolves.
    // Self-resolves already passed the disposed check at the top of get().
    if (target !== this && target._disposed) {
      throw new Error(`Container is disposed (key: "${String(key)}")`)
    }

    this.resolving.push(key)

    if (reg.kind === 'singleton') {
      this.singletonStack.push(key)
    }

    try {
      const instance = reg.fn(target)

      if (reg.kind !== 'transient') {
        target.cache.set(key, instance === undefined ? UNDEFINED_MARKER : instance)
        if (!target.owned.includes(instance)) {
          target.owned.push(instance)
        }
      }
      return instance
    } finally {
      this.resolving.pop()

      if (reg.kind === 'singleton') {
        this.singletonStack.pop()
      }
    }
  }

  /**
   * `true` once the container has been disposed (via {@link Container.dispose},
   * `using`, or `await using`). A disposed container rejects all subsequent
   * `.get()` and `createScope()` calls.
   */
  public get disposed(): boolean {
    return this._disposed
  }

  /**
   * Async teardown. Walks created instances in reverse order (LIFO), trying
   * Symbol.asyncDispose → Symbol.dispose → plain .dispose().
   * Errors do not break the chain — they are collected and re-thrown as an
   * AggregateError at the end, so a single failing resource does not leave the
   * rest unclosed. Repeated calls are a no-op (idempotent).
   */
  public async dispose(): Promise<void> {
    if (this._disposed) {
      return
    }

    this._disposed = true

    // Snapshot in LIFO order.
    const instances = this.owned.splice(0) as readonly (DisposableLike | null | undefined)[]

    // Clear state BEFORE invoking disposers: re-entrancy safety (if a disposer tries
    // to resolve something — it will already see the disposed state) plus releasing
    // factory closures that hold Ctor/deps/factory and parent objects.
    this.cache.clear()
    this.regs.clear()
    // Drop the lookupCache outright: a disposed container is unusable, and the Map
    // would otherwise hold strong refs to ancestor containers through cached entries,
    // blocking GC of the parent chain.
    this.lookupCache = undefined
    // Detach the parent: otherwise an externally-held reference to a disposed scope
    // would keep the entire parent chain (root and all of its caches/factories) from GC.
    this.parent = undefined

    const errors: unknown[] = []

    for (let i = instances.length - 1; i >= 0; i--) {
      const inst = instances[i]

      // Defensive: `owned` only ever inserts real instances in
      // get(); a null/undefined element is unreachable in practice. The check
      // is kept as a runtime safety net but excluded from coverage so the
      // ceiling is not dragged down by a path no test can legitimately exercise.
      /* v8 ignore next 3 */
      if (inst == null) {
        continue
      }

      try {
        if (typeof inst[Symbol.asyncDispose] === 'function') {
          await inst[Symbol.asyncDispose]!()
        } else if (typeof inst[Symbol.dispose] === 'function') {
          inst[Symbol.dispose]!()
        } else if (typeof inst.dispose === 'function') {
          const r = inst.dispose()
          if (r != null && typeof (r as { then?: unknown }).then === 'function') {
            await r
          }
        }
      } catch (err) {
        errors.push(err)
      }
    }

    if (errors.length === 1) {
      throw errors[0]
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, 'Container.dispose: multiple teardown errors')
    }
  }

  /**
   * `Symbol.asyncDispose` integration — invoked automatically by `await using`.
   * Equivalent to `await container.dispose()`.
   *
   * @example
   * ```ts
   * async function handle() {
   *   await using scope = root.createScope()
   *   // scope is asyncDispose'd here when the function exits
   * }
   * ```
   */
  public [Symbol.asyncDispose](): Promise<void> {
    return this.dispose()
  }

  /**
   * Sync teardown (for `using`). Calls only synchronous disposers.
   * Instances with ONLY Symbol.asyncDispose are skipped — they need `await using`.
   * A plain .dispose() is invoked; if it returns a Promise, the rejection is suppressed
   * (otherwise it would surface as an unhandledRejection) but is not awaited.
   */
  public [Symbol.dispose](): void {
    if (this._disposed) {
      return
    }

    this._disposed = true

    const instances = this.owned.splice(0) as readonly (DisposableLike | null | undefined)[]

    this.cache.clear()
    this.regs.clear()
    this.lookupCache = undefined
    // Detach the parent: otherwise an externally-held reference to a disposed scope
    // would keep the entire parent chain (root and all of its caches/factories) from GC.
    this.parent = undefined

    const errors: unknown[] = []

    for (let i = instances.length - 1; i >= 0; i--) {
      const inst = instances[i]

      // Defensive: `owned` only ever inserts real instances in
      // get(); a null/undefined element is unreachable in practice. The check
      // is kept as a runtime safety net but excluded from coverage so the
      // ceiling is not dragged down by a path no test can legitimately exercise.
      /* v8 ignore next 3 */
      if (inst == null) {
        continue
      }

      try {
        if (typeof inst[Symbol.dispose] === 'function') {
          inst[Symbol.dispose]!()
        } else if (typeof inst.dispose === 'function') {
          const r = inst.dispose()

          // If a plain .dispose() turns out to be async in a sync context — that is
          // a resource misuse (it needs `await using` / container.dispose()). Detect
          // it SYNCHRONOUSLY: a .catch goes into microtasks and would run after we
          // return from this method, so an errors.push there would lose the error
          // because the throw below already happened. We record the misuse fact right
          // now and silence the unhandledRejection from the returned promise via a
          // separate .catch(() => void).
          // r != null covers both undefined and null (typeof null === 'object').
          // Duck-typed .then catches any thenable — we do not bind to the global
          // Promise, in case of polyfills and custom PromiseLike.
          if (r != null && typeof (r as { then?: unknown }).then === 'function') {
            errors.push(new Error(
              `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. ` +
              `Use \`await using\` / container.dispose() for async teardown.`,
            ))
            void Promise.resolve(r).catch(() => { /* noop: error already recorded above */ })
          }
        }
      } catch (err) {
        errors.push(err)
      }
    }

    if (errors.length === 1) {
      throw errors[0]
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, 'Container[Symbol.dispose]: multiple teardown errors')
    }
  }

}

/**
 * Declaration merging — attaches helper types to the class as a namespace.
 * Contains utility types for extracting and unwrapping the dependency map
 * from a fully-built container.
 */
export namespace Container {
  /**
   * Extracts the registered key map from a fully-built container type.
   * Lets you reuse the inferred DI shape elsewhere (handlers, factories,
   * tests) without duplicating the list of keys.
   *
   * @template C - A `Container<T>` type, typically obtained as
   *               `ReturnType<typeof buildContainer>`.
   *
   * @example
   * ```ts
   * function buildContainer() {
   *   return new Container()
   *     .registerClass('logger', Logger, [])
   *     .registerClass('db', Db, [])
   * }
   *
   * type AppContainer = ReturnType<typeof buildContainer>
   * type AppDeps      = Container.Resolve<AppContainer>
   * //   ^? { logger: Logger; db: Db }
   * ```
   */
  export type Resolve<C> = C extends Container<infer U> ? U : never

  /**
   * Like {@link Resolve}, but unwraps `Lazy<T>` companion entries back to `T`.
   * Useful when you want a "flat" view of the dependency map for typing mocks
   * or test fixtures, where lazy wrappers only get in the way.
   *
   * @template C - A `Container<T>` type.
   *
   * @example
   * ```ts
   * const builder = new Container()
   *   .registerClass('clock', Clock, [], 'transient', 'clockLazy')
   * type Flat = Container.ResolveUnwrapped<typeof builder>
   * //   ^? { clock: Clock; clockLazy: Clock }   // Lazy<Clock> → Clock
   * ```
   */
  export type ResolveUnwrapped<C> = {
    [K in keyof Resolve<C>]: Resolve<C>[K] extends Lazy<infer V> ? V : Resolve<C>[K]
  }

  /**
   * Gets the **unwrapped** service type (without the `Lazy<>` envelope) by key.
   * For non-lazy keys this equals `Resolve<C>[K]`; for keys registered as
   * `Lazy<T>` it returns `T`.
   *
   * Designed for typing the inner mock value when you intend to override a
   * `Lazy<T>`-registered key in a test — write the mock as the unwrapped
   * service type, then wrap it once in `{ get: () => mock }` at the call site.
   *
   * @template C - A `Container<T>` type.
   * @template K - The registered key to look up.
   *
   * @example
   * ```ts
   * const builder = new Container()
   *   .registerClass('clock', Clock, [], 'transient', 'clockLazy')
   * const clockMock: Container.UnwrappedValue<typeof builder, 'clockLazy'> = {
   *   now: () => 0,
   * }
   * builder.override('clockLazy', { get: () => clockMock })
   * ```
   */
  export type UnwrappedValue<C, K extends keyof Resolve<C>> = ResolveUnwrapped<C>[K]
}
