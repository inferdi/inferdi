// Polyfill for Symbol.dispose / Symbol.asyncDispose for environments where these
// well-known symbols are not yet defined (Node <20.4). Symbol.for ensures cross-realm
// consistency: any other code reading Symbol.dispose after this module is loaded
// observes the same registry symbol, so `using` / `await using` interop is preserved.
// On Node 20.4+ the well-known symbol already exists and the ??= is a no-op.
;(Symbol as { dispose?: symbol }).dispose ??= Symbol.for('Symbol.dispose')
;(Symbol as { asyncDispose?: symbol }).asyncDispose ??= Symbol.for('Symbol.asyncDispose')

export type Lazy<T> = { readonly get: () => T }
export type DependenciesMap = Record<string, unknown>

// A DI module — a function that takes a container with the accumulated key set TIn
// and returns a container extended with its own keys TOut. Used in Container.use():
// handy for grouping registrations and reading previously registered values
// to decide what to register next (see the example in the JSDoc on use()).
//
// USAGE: `Module<TIn, TOut>` requires the input container's T to match TIn EXACTLY.
// For one-shot grouping inside a fluent chain, prefer inline lambdas in `.use()` —
// TypeScript infers the container's full T at the call site, so `c.registerXyz(...)`
// works without re-listing prior keys. The named `Module<TIn, TOut>` type is most
// useful for fixture builders that always start from a known base shape.
export type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>

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

// Projects the constructor parameter types onto the allowed DI-map keys.
// Prevents passing a deps key whose value is not assignable to the corresponding argument.
type DepsOf<T extends DependenciesMap, A extends readonly unknown[]> = {
  readonly [I in keyof A]: { [K in keyof T]: T[K] extends A[I] ? K : never }[keyof T]
}

// Instances that the container knows how to close on dispose.
// Probe order: Symbol.asyncDispose → Symbol.dispose → plain .dispose().
interface DisposableLike {
  [Symbol.dispose]?: () => void
  [Symbol.asyncDispose]?: () => PromiseLike<void>
  dispose?: () => void | PromiseLike<void>
}

export class Container<T extends DependenciesMap = Record<never, never>> {

  /** @internal */
  private readonly regs = new Map<keyof T, Registration<T, any>>()
  /** @internal */
  private readonly cache = new Map<keyof T, unknown>()
  // Teardown queue. Only instances created by THIS container land here
  // (not registerValue — external ownership; not transient — owned by the caller).
  // Set guards against double dispose when the same instance is registered under
  // multiple keys (registerFactory('a', () => shared); registerFactory('b', () => shared)).
  // Set preserves insertion order — on dispose we iterate in reverse for LIFO.
  /** @internal */
  private readonly owned = new Set<unknown>()
  // resolving and singletonStack are shared across the whole tree — children inherit
  // references from the parent. resolving catches cycles, singletonStack catches an
  // attempt by a singleton to take a scoped dependency.
  // A separate `root` field is unnecessary: these two collections already span the chain.
  //
  // INVARIANT: get() MUST stay synchronous. resolving works as a precise projection of
  // the call stack only because a single get() runs atomically before returning to the
  // event loop. If async factories are ever added and get() becomes async — concurrent
  // resolves (different HTTP requests) will start mutating the shared resolving Set /
  // singletonStack at the same time, raising false cycles and false lifetime violations.
  // Async factories require either a per-resolve local resolving (not shared), or a
  // separate two-phase API (resolveAsync on top of a sync get with pre-warming).
  /** @internal */
  private readonly resolving: Set<keyof T>
  /** @internal */
  private readonly singletonStack: (keyof T)[]
  /** @internal */
  private _cradle: T | undefined = undefined
  /** @internal */
  private _disposed = false
  // parent is mutable: dispose nulls the reference so a disposed child does not hold
  // the live root through the chain. Otherwise an externally-stored reference to a
  // disposed scope would block GC of the root with all of its caches and factories.
  // Declared as `T | undefined` (not `parent?: T`) to satisfy exactOptionalPropertyTypes
  // when assigning undefined in dispose().
  /** @internal */
  private parent: Container<T> | undefined

  public constructor(parent?: Container<T>) {
    this.parent = parent
    this.resolving = parent ? parent.resolving : new Set()
    this.singletonStack = parent ? parent.singletonStack : []
  }

  // Walk-up through the scope chain: do we (or any ancestor) have this key?
  // Used by the cradle Proxy to NOT throw on protocol probes ('then', 'toJSON', and
  // other standard property accesses). Without this check, Promise.resolve(cradle) or
  // await cradle would route into this.get('then') and crash the application.
  /** @internal */
  private hasKey(key: keyof T): boolean {
    if (this.cache.has(key)) {
      return true
    }
    let owner: Container<T> | undefined = this
    while (owner !== undefined) {
      if (owner.regs.has(key)) {
        return true
      }
      owner = owner.parent
    }
    return false
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
   * Registers a class under a key. Returns a container whose type already contains
   * the `[K, V]` pair. With `lazy: true` an additional key `${K}Lazy` of type
   * `Lazy<V>` is registered — the user does not have to declare it; the type is
   * inferred automatically.
   */
  public registerClass<
    K extends string,
    V,
    A extends readonly unknown[],
    L extends boolean = false,
  >(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<T, A>,
    kind: RegistrationKind = 'singleton',
    lazy?: L,
  ): Container<
    T
    & Record<K, V>
    & (L extends true ? Record<`${K}Lazy`, Lazy<V>> : {})
  > {
    // Keep the reference to the original array — in DI idiom deps are passed as a
    // literal and never mutated after registration. Saves one allocation per registerClass.
    const keys = deps as readonly (keyof T)[]
    const len = keys.length

    // Arity unrolling. V8 JITs a direct `new Ctor(a, b)` with an inline cache keyed on
    // Ctor's shape; Reflect.construct goes through a runtime stub, ArrayLike iteration,
    // and is not inlined. We cover 0..4 args via direct calls — this is ≥95% of real
    // classes in DI. The tail (5+) falls back to Reflect.construct, preserving type
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
    } else {
      // Tail: 5+ deps. Start from an empty array and push — V8 keeps the array as
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

    this.regs.set(key as unknown as keyof T, {kind, fn} as Registration<T, any>)

    // Lazy alias: a thin { get } wrapper on top of the eager key. The instance itself
    // is not created until the consumer calls .get(). The wrapper is transient — it
    // takes the container in which it was requested, so scoped targets work correctly.
    //
    // INVARIANT: fn must NOT call c.get(key) synchronously — only return a closure.
    // This fact makes the lazy wrapper safe to inject into a singleton and justifies
    // the `lazy: true` flag, which excludes it from the lifetime check in get().
    // If this implementation is ever "simplified" to a direct c.get(key) — the
    // protection against short-lived deps leaking into long-lived ones will break.
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
    if (lazy) {
      const lazyKey = `${key as string}Lazy` as keyof T
      const targetKey = key as unknown as keyof T
      this.regs.set(lazyKey, {
        kind: 'transient',
        lazy: true,
        fn: (c) => ({get: () => c.get(targetKey)} as T[keyof T]),
      })
    }

    return this.as()
  }

  /**
   * Registers a factory under a key. The type V is inferred from the factory's return
   * value and is automatically added to the container's map.
   */
  public registerFactory<K extends string, V>(
    key: Exclude<K, keyof T>,
    factory: (c: Container<T>) => V,
    kind: RegistrationKind = 'singleton',
  ): Container<T & Record<K, V>> {
    this.regs.set(
      key as unknown as keyof T,
      {kind, fn: factory as (c: Container<T>) => any},
    )
    return this.as()
  }

  /**
   * Registers a ready-made value. The container does not consider this value its own
   * (does not call dispose on it) — external ownership.
   */
  public registerValue<K extends string, V>(
    key: Exclude<K, keyof T>,
    value: V,
  ): Container<T & Record<K, V>> {
    // The value is external — it does not enter `owned`, dispose is not called on it.
    this.cache.set(key as unknown as keyof T, value)
    this.regs.set(
      key as unknown as keyof T,
      {kind: 'singleton', fn: () => value as any},
    )
    return this.as()
  }

  /**
   * Applies a registration module on top of the current container. Returns a container
   * extended with the module's keys. Useful when you need to read an already-registered
   * value to decide what to register next:
   *
   *   const c = new Container()
   *     .registerValue('config', { port: 8080 })
   *     .use((c) => {
   *       const port = c.get('config').port
   *       return port === 8080 ? c.registerClass('a', A, []) : c.registerClass('b', B, [])
   *     })
   */
  public use<R extends DependenciesMap>(fn: Module<T, R>): Container<T & R> {
    return fn(this) as unknown as Container<T & R>
  }

  public createScope(): Container<T> {
    if (this._disposed) {
      throw new Error('Cannot create scope from a disposed container')
    }
    return new Container<T>(this)
  }

  public get<K extends keyof T>(key: K): T[K] {
    if (this._disposed) {
      throw new Error(`Container is disposed (key: "${String(key)}")`)
    }

    // 1. Local cache (singleton on root / already-created scoped in the current scope).
    //    Fast path with no extra lookup if the value is not undefined.
    const cached = this.cache.get(key) as T[K] | undefined

    if (cached !== undefined || this.cache.has(key)) {
      return cached as T[K]
    }

    // 2. Look up the registration up the scope chain (any depth).
    let owner: Container<T> | undefined = this
    let reg: Registration<T, K> | undefined

    while (owner !== undefined) {
      reg = owner.regs.get(key) as Registration<T, K> | undefined

      if (reg !== undefined) {
        break
      }

      owner = owner.parent
    }

    if (reg === undefined) {
      throw new Error(`Key "${String(key)}" not found`)
    }

    // 3. A short-lived dependency inside a singleton is a lifetime leak: a scoped
    // instance would "escape" into a long-lived cache; a transient would freeze in
    // a field and lose its "fresh on every request" contract. For deliberate cases
    // — Lazy<T> (the lazy wrapper itself is marked reg.lazy and excluded from the check).
    if (!reg.lazy && (reg.kind === 'scoped' || reg.kind === 'transient') && this.singletonStack.length > 0) {
      // Safe ! — guarded by length > 0 in the condition above.
      const parent = this.singletonStack[this.singletonStack.length - 1]!
      throw new Error(
        `Singleton "${String(parent)}" cannot depend on ${reg.kind} "${String(key)}". ` +
        `Use Lazy<T> (register with lazy: true) to get a fresh instance per access.`,
      )
    }

    // 4. A singleton lives on the container where it was registered (owner), not always
    // on root. This makes singletons registered in child scopes work correctly.
    //
    // NOTE: after delegation, creation runs with this = owner, meaning ALL of the
    // singleton's dependencies are resolved from owner, not from the scope that
    // initiated the call. This is safe thanks to the lifetime check above: short-lived
    // deps are already cut off, and the singleton/singleton chain correctly lives on owner.
    if (reg.kind === 'singleton' && this !== owner) {
      return (owner as Container<T>).get(key)
    }

    // 5. Cycle detection. The Set is shared across the tree; the path is cleaned up in finally.
    if (this.resolving.has(key)) {
      const chain = [...this.resolving, key].map((k) => String(k)).join(' -> ')
      throw new Error(
        `Circular dependency detected: ${chain}. ` +
        `Consider breaking the cycle with Lazy<T> (register one side with lazy: true ` +
        `and inject the '${chain.split(' -> ').pop()}Lazy' key instead).`,
      )
    }

    this.resolving.add(key)

    if (reg.kind === 'singleton') {
      this.singletonStack.push(key)
    }
    try {
      const instance = reg.fn(this)

      // Teardown tracking: cacheable instances (singleton/scoped) created by THIS container.
      // Transient is owned by the caller — otherwise the container leaks memory.
      // The lazy wrapper is also transient and is not tracked: the resource will be closed
      // via the real key.
      if (reg.kind !== 'transient') {
        this.cache.set(key, instance)
        this.owned.add(instance)
      }
      return instance
    } finally {
      this.resolving.delete(key)

      if (reg.kind === 'singleton') {
        this.singletonStack.pop()
      }
    }
  }

  /**
   * Soft-mode access to registered values via a Proxy. Useful for ergonomic
   * destructuring: `const { db, logger } = container.cradle`.
   *
   * Behavior:
   * - Registered keys resolve through `.get()`.
   * - Unregistered string keys return `undefined` (do NOT throw), so `Promise.resolve(cradle)`,
   *   `await cradle`, `console.log(cradle)`, and other thenable / inspector probes do
   *   not crash the application.
   * - Symbol probes (Symbol.toPrimitive, Symbol.iterator, etc.) return `undefined`.
   *
   * ⚠️ TYPE WARNING — the return type is "optimistic".
   * The signature is typed as `T` (the registered map) for ergonomic destructuring,
   * but the underlying Proxy is permissive: a typo like `cradle.userRpo` (instead of
   * `cradle.userRepo`) will silently return `undefined` with NO compile-time error,
   * because the Proxy's `get` trap is not reflected in the declared type.
   * If you need a hard error on missing keys, use `container.get(key)` instead — it
   * throws synchronously with a "Key not found" message and is fully covered by the
   * type system (`K extends keyof T`).
   */
  get cradle(): T {
    // Throw immediately on a disposed container. Without this check, cradle would
    // create a fresh Proxy after dispose (because _cradle was cleared), and the user
    // would only see the error on key access — one step deeper than expected.
    if (this._disposed) {
      throw new Error('Container is disposed (cradle access)')
    }
    // Cradle is a soft-mode access (in contrast to .get()):
    // 1) Symbols are filtered out — these are protocol probes (Symbol.toPrimitive,
    //    Symbol.iterator, nodejs.util.inspect.custom). Return undefined.
    // 2) Unregistered string keys also return undefined instead of throwing.
    //    Otherwise Promise.resolve(cradle) / await cradle / console.log / any thenable
    //    check would pull Get('then') and crash the app with an unexpected
    //    "Key 'then' not found".
    //    If a hard error on a missing key is needed — c.get(key) is still available
    //    and still throws Key not found.
    return this._cradle ??= new Proxy({} as T, {
      get: (_, p) => {
        if (typeof p === 'symbol') {
          return undefined
        }
        const key = p as keyof T
        return this.hasKey(key) ? this.get(key) : undefined
      },
    })
  }

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

    // Snapshot in LIFO order. Set is not indexable but preserves insertion order.
    const instances = [...this.owned].reverse() as readonly (DisposableLike | null | undefined)[]

    // Clear state BEFORE invoking disposers: re-entrancy safety (if a disposer tries
    // to resolve something — it will already see the disposed state) plus releasing
    // factory closures that hold Ctor/deps/factory and parent objects.
    this.owned.clear()
    this.cache.clear()
    this.regs.clear()
    this._cradle = undefined
    // Detach the parent: otherwise an externally-held reference to a disposed scope
    // would keep the entire parent chain (root and all of its caches/factories) from GC.
    this.parent = undefined

    const errors: unknown[] = []

    for (const inst of instances) {
      if (inst == null) {
        continue
      }

      try {
        if (typeof inst[Symbol.asyncDispose] === 'function') {
          await inst[Symbol.asyncDispose]!()
        } else if (typeof inst[Symbol.dispose] === 'function') {
          inst[Symbol.dispose]!()
        } else if (typeof inst.dispose === 'function') {
          await inst.dispose()
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

    const instances = [...this.owned].reverse() as readonly (DisposableLike | null | undefined)[]

    this.owned.clear()
    this.cache.clear()
    this.regs.clear()
    this._cradle = undefined
    // Detach the parent: otherwise an externally-held reference to a disposed scope
    // would keep the entire parent chain (root and all of its caches/factories) from GC.
    this.parent = undefined

    const errors: unknown[] = []

    for (const inst of instances) {
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

// Declaration merging — attach a helper type to the class as a namespace.
// Used as `Container.Resolve<typeof container>` to extract the map T from a
// fully fluent-built container.
export namespace Container {
  export type Resolve<C> = C extends Container<infer U> ? U : never
}
