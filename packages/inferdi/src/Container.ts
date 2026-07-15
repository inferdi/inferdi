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
 * The lifetime of a registration:
 * - `singleton` — one instance per owning container (default).
 * - `scoped` — one instance per `createScope()` child.
 * - `transient` — a new instance for every `.get()`; caller-owned, never disposed.
 *
 * Exported so users can write `Spec<V, Kind>` and `SpecMap<M, Kind>` for
 * explicit `Container<...>` annotations and `Module<TIn, TOut>` signatures.
 */
export type RegistrationKind = 'singleton' | 'transient' | 'scoped'

/**
 * A single entry of the type-level registry: the service type plus its
 * lifetime kind. Used internally as the value of {@link DependenciesMap}
 * and surfaced to users for explicit `Container<...>` typing.
 *
 * IMPORTANT: declared as `interface`, not type alias. TypeScript caches
 * instantiations of named interfaces; inline `{ type: V; kind: K }` literals
 * are re-evaluated and merged via `&` on every step of a fluent chain, which
 * grows compiler work quadratically on long chains.
 *
 * @template V - The service type produced by the registration.
 * @template K - The {@link RegistrationKind} that governs the service's lifetime.
 *
 * @example
 * ```ts
 * import { Container, type Spec, type Lazy } from '@inferdi/inferdi'
 *
 * type Cfg = { port: number }
 * type Deps = {
 *   cfg: Spec<Cfg, 'singleton'>
 *   req: Spec<{ id: string }, 'scoped'>
 *   tickLazy: Spec<Lazy<Date>, 'transient'>
 * }
 * declare const c: Container<Deps>
 * ```
 */
export interface Spec<V, K extends RegistrationKind = 'singleton'> {
  // Readonly fields are covariant in V/K. Plain (mutable) fields are invariant,
  // which would block assignability of e.g. Spec<{port:8080}, 'singleton'> to the
  // wider Spec<unknown, RegistrationKind> used as the index value in DependenciesMap.
  // Invariance would collapse `Container<T & Record<K, Spec<V, ...>>>` back to
  // `Container<DependenciesMap>` (or worse, `never`) on every fluent step.
  readonly type: V
  readonly kind: K
}

/**
 * Companion registration produced by the `lazyKey` parameter of `register*`.
 * Carries the target service's lifetime in `lazyOf` so the type-level
 * lifetime guard ({@link AllowedDeps}) can permit only `Lazy<singleton>`
 * inside a singleton consumer — matching the runtime guard.
 *
 * The companion itself is always `'transient'` (the `{ get }` wrapper is
 * cheap and caller-owned). Manual `Spec<Lazy<V>, 'transient'>` registrations
 * (created by hand via `registerValue`/`registerFactory`) are *not*
 * `LazySpec` — the type system treats them as plain transient values, not
 * managed lazy companions.
 *
 * @template V          - The wrapped service type (the `T` in `Lazy<T>`).
 * @template TargetKind - The lifetime kind of the underlying target service.
 *
 * @example
 * ```ts
 * import { Container, type LazySpec, type Lazy } from '@inferdi/inferdi'
 *
 * declare const c: Container<{
 *   cfg:     { type: { port: number }; kind: 'singleton' }
 *   cfgLazy: LazySpec<{ port: number }, 'singleton'>
 * }>
 * ```
 */
export interface LazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<Lazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
}

/**
 * Upper bound for the type-level "registry" carried by a {@link Container} —
 * a string-or-symbol-keyed map of {@link Spec} entries. Used as the constraint
 * on `Container<T>` and on the `TIn` / `TOut` parameters of {@link Module}.
 *
 * The fluent `register*` methods accumulate the map for you, so you rarely
 * need to write this type by hand — `Container.Resolve<typeof builder>`
 * extracts a flat `{ key: ServiceType }` view after the chain.
 */
export type DependenciesMap = Record<string | symbol, Spec<unknown, RegistrationKind>>

/**
 * Convenience helper: maps a flat `{ key: ServiceType }` shape onto the
 * {@link Spec}-based {@link DependenciesMap} form, defaulting every entry to
 * the given `Kind` (singleton by default). Lets users write
 * `Container<SpecMap<{ logger: Logger, db: Db }>>` instead of spelling out
 * each `Spec<...>` by hand.
 *
 * @template M - Flat record `{ key: ServiceType }`.
 * @template K - Lifetime kind applied to every entry (default `'singleton'`).
 *
 * @example
 * ```ts
 * import { Container, type SpecMap, type Spec } from '@inferdi/inferdi'
 *
 * // All singletons:
 * declare const c1: Container<SpecMap<{ logger: Logger, db: Db }>>
 *
 * // Mixed kinds — combine SpecMap with explicit Spec<...> entries:
 * type Deps = SpecMap<{ cfg: Config }> & { req: Spec<ReqCtx, 'scoped'> }
 * declare const c2: Container<Deps>
 * ```
 */
export type SpecMap<
  M extends Record<string | symbol, unknown>,
  K extends RegistrationKind = 'singleton',
> = { [P in keyof M]: Spec<M[P], K> }

// Filters T down to the keys that are legal to inject into a target with
// the given TargetKind, per the runtime lifetime guard:
//   - singleton target: only singleton entries and `LazySpec<*, 'singleton'>`
//     companions are legal. `Lazy<scoped>` / `Lazy<transient>` companions
//     remain available to scoped/transient consumers but are blocked here —
//     `Lazy` preserves the target's lifetime, it does not lift short-lived
//     services into singleton scope.
//   - scoped / transient target: any entry is legal (matches runtime in get()).
// Managed lazy companions are identified by extending {@link LazySpec}, which
// is produced only via the `lazyKey` parameter of `register*`. A hand-rolled
// `Spec<Lazy<V>, 'transient'>` registered via registerValue/registerFactory is
// treated as a plain transient and is *not* singleton-safe.
type AllowedDeps<T extends DependenciesMap, TargetKind extends RegistrationKind> =
  TargetKind extends 'singleton'
    ? {
        [K in keyof T as
            T[K]['kind'] extends 'singleton' ? K
          : T[K] extends LazySpec<unknown, 'singleton'> ? K
          : never
        ]: T[K]
      }
    : T

type NoKeyOverlap<A, B> = keyof A & keyof B extends never
  ? B
  : `Error: module tries to override existing keys: ${string & keyof A & keyof B}`

/**
 * Construction options for {@link Container}.
 *
 * @example
 * ```ts
 * // Default — full runtime guards.
 * const root = new Container()
 *
 * // Opt out of the runtime guards. Applications that fully trust the v3
 * // compile-time guard (`AllowedDeps<T, Kind>`) can use this for a faster
 * // hot path. The flag is inherited by every scope spawned via createScope().
 * const fast = new Container({ strict: false })
 * ```
 */
export interface ContainerOptions {
  /**
   * Toggle runtime cycle detection and lifetime guard inside `get()`.
   *
   * - `true` (default) — cycle detection and the singleton lifetime guard
   *   fire on every resolve. Errors are precise (`Circular dependency detected:
   *   ...`, `Singleton "..." cannot depend on scoped "..."`).
   * - `false` — both checks are skipped. `get()` for `transient` becomes a bare
   *   `fn(this)` call; the non-transient path skips the cycle bookkeeping and
   *   the singleton-stack push/pop, dropping a `try`/`finally` block and an
   *   `Array#includes` scan from the hot path.
   *
   * Trade-off when `strict: false`: a cycle introduced via an `as`-cast or a
   * dynamically built factory closure becomes a `RangeError: Maximum call
   * stack size exceeded` instead of the precise diagnostic. A lifetime
   * violation introduced the same way silently freezes a short-lived value
   * inside a singleton.
   *
   * The compile-time guard catches both classes of bug for any code that
   * passes through `tsc`, so the runtime guard is only material against
   * `as`-cast bypasses or dynamic registration. Decide accordingly.
   *
   * Inherited by child scopes spawned via {@link Container.createScope}.
   *
   * @default true
   */
  readonly strict?: boolean
}

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
 * Both `TIn` and `TOut` use the {@link Spec}-based {@link DependenciesMap} shape.
 * Wrap a flat `{ key: ServiceType }` map in {@link SpecMap} to default every
 * entry to singleton, or write `Spec<V, 'scoped' | 'transient'>` explicitly for
 * mixed-kind modules.
 *
 * @template TIn  - Required input keys (the container's T at the use-site).
 * @template TOut - Keys this module adds.
 *
 * @example
 * ```ts
 * import { Container, type Module, type SpecMap } from '@inferdi/inferdi'
 *
 * const fixtureMailer: Module<SpecMap<{ config: { env: string } }>, SpecMap<{ mailer: Mailer }>> =
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

interface Registration<T extends DependenciesMap, K extends keyof T> {
  readonly kind: RegistrationKind
  // Marker that excludes the entry from the singleton lifetime guard. Set to
  // `true` ONLY for lazy companions whose target kind is `'singleton'`:
  //   - Lazy<singleton> companion: kind='transient', lazy=true → guard skipped,
  //     singleton consumer may legally inject the wrapper.
  //   - Lazy<scoped|transient> companion: kind='transient', lazy=false → guard
  //     fires when a singleton consumer tries to inject it, matching the
  //     compile-time `AllowedDeps<T, 'singleton'>` filter.
  //   - Every other registration: lazy=false.
  // The wrapper's `fn` returns a closure `{ get: () => c.get(targetKey) }` —
  // it does NOT call `c.get(targetKey)` synchronously. That deferral is what
  // makes Lazy<singleton> safe to inject into a singleton; if the
  // implementation is ever "simplified" to a direct c.get(targetKey), the
  // protection collapses.
  // Always set (false for non-lazy entries) so every Registration object has the
  // same V8 Hidden Class / Shape — `localReg.lazy` reads on the hot path stay in
  // a monomorphic inline cache instead of falling into a PIC bucket lookup.
  readonly lazy: boolean
  readonly fn: (container: Container<T>) => T[K]['type']
  // Appended after the three hot fields to preserve their offsets in the
  // Registration shape. Read only after a non-transient factory has run.
  readonly owned: boolean
}

// Snapshot of "where does this key live" cached on the resolving container.
// Stored only after a successful walk-up (this.parent → ... → owner.regs.get(key) hit).
// `treeVersion` snapshots a mutation counter shared by the whole container tree.
// Any registration or disposal increments it, including a nearer ancestor that
// starts shadowing the cached owner or detaches the path through disposal.
interface LookupEntry<T extends DependenciesMap, K extends keyof T = keyof T> {
  readonly owner: Container<T>
  readonly reg: Registration<T, K>
  readonly treeVersion: number
}

interface MutationEpoch {
  value: number
}

// Projects the constructor parameter types onto the allowed DI-map keys.
// Prevents passing a deps key whose value is not assignable to the corresponding argument.
// Reads `T[K]['type']` because each entry of the map is a Spec<V, Kind>.
type DepsOf<T extends DependenciesMap, A extends readonly unknown[]> = {
  readonly [I in keyof A]: Extract<
    keyof T,
    {
      [K in keyof T]: unknown extends A[I] ? never : T[K]['type'] extends A[I] ? K : never
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
 * **Compile-time lifetime guard.** Each entry in `T` carries its kind via
 * {@link Spec}. The container passed to a `registerFactory((c) => ...)` body
 * is structurally narrowed via `AllowedDeps<T, Kind>` so that the only `.get(...)`
 * keys visible inside a singleton factory are singletons and `Lazy<singleton>` companions.
 * `registerClass(_, _, deps, kind)` enforces the same constraint on its `deps`
 * tuple. The runtime guard in `get()` remains as defense-in-depth against
 * `as`-cast bypasses; its error message names the offending keys.
 *
 * **Resource management.** `Container` itself implements `Symbol.dispose` and
 * `Symbol.asyncDispose`, so it composes with `using` / `await using`. Owned
 * instances are torn down in reverse-creation (LIFO) order; multiple disposer
 * failures are surfaced as a single `AggregateError`.
 *
 * @template T - The map of registered keys to {@link Spec} entries. Accumulates
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
  // Shared by the whole tree. A mutation anywhere invalidates parent-walk snapshots;
  // registration and disposal are cold operations, so tree-wide invalidation avoids
  // child tracking while keeping lookup validation to one integer comparison.
  /** @internal */
  private readonly mutationEpoch: MutationEpoch
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
  /** @internal */
  private disposePromise: Promise<void> | undefined = undefined
  // parent is mutable: dispose nulls the reference so a disposed child does not hold
  // the live root through the chain. Otherwise an externally-stored reference to a
  // disposed scope would block GC of the root with all of its caches and factories.
  // Declared as `T | undefined` (not `parent?: T`) to satisfy exactOptionalPropertyTypes
  // when assigning undefined in dispose().
  /** @internal */
  private parent: Container<T> | undefined
  // Opt-out toggle for the runtime cycle detection and lifetime guard.
  // Stored per-container; inherited from `parent` when this is a scope child,
  // otherwise read from the ContainerOptions argument. A single readonly
  // boolean read on the hot path — predictable for V8's branch predictor
  // because the same flag value flows through every resolve on a given tree.
  /** @internal */
  private readonly strict: boolean

  /**
   * Creates a new container.
   *
   * @param options - Optional construction options. Currently `strict?: boolean`
   *                  toggles the runtime cycle / lifetime guard (default `true`).
   *
   * @example
   * ```ts
   * const root = new Container()
   * const fast = new Container({ strict: false })
   * ```
   */
  public constructor(options?: ContainerOptions)
  // Internal overload — used by createScope() to wire the parent chain.
  /** @internal */
  public constructor(parent: Container<T>)
  public constructor(arg?: ContainerOptions | Container<T>) {
    if (arg instanceof Container) {
      this.parent = arg
      this.strict = arg.strict
      this.resolving = arg.resolving
      this.singletonStack = arg.singletonStack
      this.mutationEpoch = arg.mutationEpoch
    } else {
      this.parent = undefined
      this.strict = arg?.strict ?? true
      this.resolving = []
      this.singletonStack = []
      this.mutationEpoch = {value: 0}
    }
  }

  /**
   * Registers a class constructor under a specific key.
   *
   * The container automatically infers the created type and adds it to the
   * container's registry. The compiler strictly checks that the `deps` array
   * precisely matches the constructor's arguments by both type and position,
   * **and** that every dep is a legal lifetime for the target `kind` — a
   * singleton target only accepts singleton deps or `Lazy<singleton>` companions.
   * Passing a `lazyKey` additionally registers a `Lazy<V>` wrapper under that
   * companion identifier — the user picks the wrapper key explicitly, which
   * lets `string` and `symbol` keys coexist on equal footing.
   *
   * @template K - The string-or-symbol key to register the class under. Must not be already registered.
   * @template V - The instance type created by the constructor.
   * @template A - The tuple of constructor argument types.
   * @template Kind - The literal {@link RegistrationKind} of this registration.
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
   * @throws If the container has already been disposed.
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
    const K extends string | symbol,
    V,
    A extends readonly unknown[],
    const D extends DepsOf<AllowedDeps<T, 'singleton'>, A> = DepsOf<AllowedDeps<T, 'singleton'>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    Ctor: new (...args: A) => V,
    deps: D,
    kind?: undefined
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  public registerClass<
    const K extends string | symbol,
    V,
    A extends readonly unknown[],
    const Kind extends RegistrationKind,
    const D extends DepsOf<AllowedDeps<T, Kind>, A> = DepsOf<AllowedDeps<T, Kind>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    Ctor: new (...args: A) => V,
    deps: D,
    kind: Kind
  ): Container<T & Record<K, Spec<V, Kind>>>

  public registerClass<
    const K extends string | symbol,
    V,
    A extends readonly unknown[],
    const LK extends string | symbol,
    const D extends DepsOf<AllowedDeps<T, 'singleton'>, A> = DepsOf<AllowedDeps<T, 'singleton'>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    Ctor: new (...args: A) => V,
    deps: D,
    kind: undefined,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<T & Record<K, Spec<V, 'singleton'>> & Record<LK, LazySpec<V, 'singleton'>>>

  public registerClass<
    const K extends string | symbol,
    V,
    A extends readonly unknown[],
    const Kind extends RegistrationKind,
    const LK extends string | symbol,
    const D extends DepsOf<AllowedDeps<T, Kind>, A> = DepsOf<AllowedDeps<T, Kind>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    Ctor: new (...args: A) => V,
    deps: D,
    kind: Kind,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<T & Record<K, Spec<V, Kind>> & Record<LK, LazySpec<V, Kind>>>

  public registerClass<V>(
    key: string | symbol,
    Ctor: new (...args: any[]) => any,
    deps: any[],
    kind: RegistrationKind = 'singleton',
    lazyKey?: string | symbol
  ): any {
    if (this._disposed) {
      throw new Error(`Cannot register on a disposed container (key: "${String(key)}")`)
    }

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

    // Property order {kind, lazy, fn, owned} is deliberately uniform across every
    // register* call site so V8 hands the same Hidden Class / Shape to all
    // Registration objects in `regs`. That keeps the inline cache on
    // `localReg.kind` and `localReg.lazy` reads in `get()` MONOMORPHIC instead
    // of falling into a polymorphic cache after a couple of differently-shaped
    // objects flow through the same call site. `lazy: false` is set
    // explicitly even for non-lazy entries — paying a single boolean field
    // per registration is far cheaper than a PIC bucket miss on the hot path.
    this.regs.set(key as keyof T, {kind, lazy: false, fn, owned: true} as Registration<T, keyof T>)
    this.cache.delete(key as unknown as keyof T)
    this.mutationEpoch.value++
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
    // takes the container in which it was requested, so scoped targets work correctly
    // when the wrapper is obtained in the right scope (e.g. a scoped consumer
    // injecting Lazy<otherScoped>).
    //
    // INVARIANT: fn must NOT call c.get(key) synchronously — only return a closure.
    // The deferral is what makes Lazy<singleton> safe to inject into a singleton: at
    // the time the singleton factory runs, no resolution against the wrapped target
    // happens, so no short-lived value can be captured.
    //
    // LIFETIME GUARD: `lazy: true` excludes the companion from the singleton lifetime
    // check (see Registration.lazy and the runtime guards in get() / resolveWithOwnerAndReg).
    // It is set ONLY when the target kind is `'singleton'`. For non-singleton targets,
    // the companion stays `lazy: false` and is rejected as a regular transient if a
    // singleton consumer tries to inject it via an `as`-cast bypass. The compile-time
    // `AllowedDeps<T, 'singleton'>` filter (via `LazySpec<V, 'singleton'>`) is the
    // primary protection; this runtime flag is defense-in-depth.
    //
    // NOTE (captured scope): `c` is captured at the moment the lazy wrapper is RESOLVED,
    // not at the moment .get() is called. If you store the wrapper and call .get() later
    // from a different context — the resolve still goes through the original container.
    // This is predictable, but it is "captured scope", not "dynamic scope".
    if (lazyKey !== undefined) {
      const targetKey = key as unknown as keyof T
      // Same {kind, lazy, fn, owned} order as the eager registration above — keeps
      // the Shape monomorphic across regular and lazy-companion entries.
      this.regs.set(lazyKey as unknown as keyof T, {
        kind: 'transient',
        lazy: kind === 'singleton',
        fn: (c) => ({get: () => c.get(targetKey)} as unknown as T[keyof T]['type']),
        owned: false,
      })
    }

    return this
  }

  /**
   * Registers a factory function under a specific key.
   *
   * The type `V` is inferred from the factory's return value and is automatically
   * added to the container's map. The factory receives the container as its only
   * argument, **structurally narrowed via `AllowedDeps<T, Kind>`** — inside a
   * singleton factory only singleton keys and `Lazy<singleton>` companions are visible
   * to `.get(...)`, so a leak of scoped/transient state into a singleton is a
   * TypeScript error rather than a runtime exception.
   *
   * @template K - The string-or-symbol key to register the factory under. Must not be already registered.
   * @template V - The return type of the factory.
   * @template Kind - The literal {@link RegistrationKind} of this registration.
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param factory - A function that takes the (narrowed) current container and returns the instance.
   * @param kind - The lifetime of the instance: `'singleton'` (default), `'scoped'`, or `'transient'`.
   * @returns A new container reference typed with the additionally registered key.
   * @throws If the container has already been disposed.
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
   *
   * @example
   * ```ts
   * // Async factories are first-class. The factory's returned Promise is cached
   * // verbatim, so `c.get(key)` synchronously returns the same Promise to every
   * // concurrent caller — the initialization runs exactly once. Callers await it.
   * // On `dispose()` the container unwraps the Promise and probes the resolved
   * // instance for [Symbol.asyncDispose] / [Symbol.dispose] / .dispose(). Sync
   * // teardown (`using`) on an async-cached resource is a misuse and throws —
   * // use `await using` / `await container.dispose()`.
   * const c = new Container()
   *   .registerValue('dsn', 'postgres://localhost/app')
   *   .registerFactory('db', async (c) => {
   *     const pool = new Pool({ connectionString: c.get('dsn') })
   *     await pool.connect()
   *     return pool
   *   })
   * const db = await c.get('db')
   * ```
   */
  public registerFactory<
    const K extends string | symbol,
    V
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (c: Container<AllowedDeps<T, 'singleton'>>) => V,
    kind?: undefined,
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  public registerFactory<
    const K extends string | symbol,
    V,
    const Kind extends RegistrationKind
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (c: Container<AllowedDeps<T, Kind>>) => V,
    kind: Kind,
  ): Container<T & Record<K, Spec<V, Kind>>>

  public registerFactory(
    key: string | symbol,
    factory: (c: any) => any,
    kind: RegistrationKind = 'singleton',
  ): any {
    if (this._disposed) {
      throw new Error(`Cannot register on a disposed container (key: "${String(key)}")`)
    }

    this.regs.set(
      key as unknown as keyof T,
      {
        kind,
        lazy: false,
        fn: factory as unknown as (c: Container<T>) => T[keyof T]['type'],
        owned: true,
      },
    )
    this.cache.delete(key as unknown as keyof T)
    this.mutationEpoch.value++
    if (this.lookupCache !== undefined) {
      this.lookupCache.clear()
    }
    return this
  }

  /**
   * Registers a ready-made static value under a specific key.
   *
   * The container treats this value as **externally owned** — it does not enter
   * the teardown queue and `dispose()` will not be called on it during shutdown.
   * Use this for primitives, configs, and pre-constructed objects whose lifecycle
   * you manage outside the container.
   *
   * Values are recorded with `kind: 'singleton'` in the type-level registry,
   * which means they are legal dependencies of singletons, scopeds, and
   * transients alike.
   *
   * @template K - The string-or-symbol key to register the value under. Must not be already registered.
   * @template V - The type of the value being registered (inferred).
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param value - The static value to register.
   * @returns A new container reference typed with the additionally registered key.
   * @throws If the container has already been disposed.
   *
   * @example
   * ```ts
   * new Container()
   *   .registerValue('config', { port: 8080, env: 'production' as const })
   *   .registerValue('startedAt', Date.now())
   * ```
   */
  public registerValue<const K extends string | symbol, const V>(
    key: K & ([K] extends [keyof T] ? never : unknown),
    value: V,
  ): Container<T & Record<K, Spec<V, 'singleton'>>> {
    if (this._disposed) {
      throw new Error(`Cannot register on a disposed container (key: "${String(key)}")`)
    }

    // The value is external — it does not enter `owned`, dispose is not called on it.
    this.cache.set(key as unknown as keyof T, value === undefined ? UNDEFINED_MARKER : value)
    // The factory is unreachable at runtime: cache.set above always wins the
    // fast-path in get(). The Registration is
    // kept for shape-uniformity with registerClass/registerFactory.
    // v8-ignore on the lambda body avoids a phantom branch.
    this.regs.set(
      key as unknown as keyof T,
      /* v8 ignore next */
      {kind: 'singleton', lazy: false, fn: () => value as unknown as T[keyof T]['type'], owned: false},
    )
    this.mutationEpoch.value++
    if (this.lookupCache !== undefined) {
      this.lookupCache.clear()
    }
    return this as unknown as Container<T & Record<K, Spec<V, 'singleton'>>>
  }

  /**
   * Replaces an existing registration with a static value — for **tests only**.
   *
   * Unlike `registerValue`, this method does not widen the container type and
   * is the only registration call that intentionally targets an already-known
   * key. The replacement value must satisfy the originally registered service
   * type (`T[K]['type']`), so a mock has to structurally implement the
   * production interface — no `as any` escape hatch is needed.
   *
   * **Kind preservation.** The original lifetime kind is preserved across the
   * override. If the original registration lives on an ancestor (e.g. a
   * `root.registerFactory('db', _, 'scoped')` being overridden on a child
   * scope), the walk-up reads the ancestor's kind and writes the local
   * override with the same kind. This keeps the lifetime graph consistent.
   *
   * **Strict guarantees (Fail Fast):**
   * - Throws if called on a disposed container.
   * - Throws if the key has already been resolved on this container. A late
   *   override would let already-built consumers retain a reference to the
   *   original instance while new resolves see the mock — a graph-level
   *   inconsistency. Always `.override()` BEFORE any `.get()`.
   * - Throws if the key is not registered anywhere in the scope chain.
   *
   * The replacement is treated as externally owned — it is NOT pushed into the
   * container's disposal queue (same contract as `registerValue`); the test
   * suite owns its lifetime.
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
   * @param value - The replacement value, strictly typed as `T[K]['type']`.
   * @returns `this` for fluent chaining.
   *
   * @throws If the container is disposed.
   * @throws If the key has already been resolved on this container.
   * @throws If the key is not registered anywhere in the scope chain.
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
  public override<K extends keyof T>(key: K, value: T[K]['type']): this {
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
    // Walk-up the scope chain to find the original kind and lazy flag. The
    // override is written LOCALLY (in this.regs) with both fields copied from
    // the original — preserving the lifetime graph across
    // `root.createScope().override('db', mock)` and, crucially, the lazy-exempt
    // marker on `Lazy<singleton>` companions (registered with `lazy: true`).
    // Without copying `lazy`, an override on a `Lazy<singleton>` companion
    // would write `lazy: false`, and the next singleton consumer that injects
    // the companion would trip the strict-mode lifetime guard
    // (kind='transient', lazy=false → guarded) — i.e. the mock would never
    // reach the consumer. A key not found anywhere is a misconfiguration;
    // surface it eagerly rather than silently materializing a singleton from
    // nothing.
    let cur: Container<T> | undefined = this
    let existingKind: RegistrationKind | undefined
    let existingLazy = false
    while (cur !== undefined) {
      const existing = cur.regs.get(key)
      if (existing !== undefined) {
        existingKind = existing.kind
        existingLazy = existing.lazy
        break
      }
      cur = cur.parent
    }
    if (existingKind === undefined) {
      throw new Error(`Cannot override "${String(key)}": key is not registered`)
    }

    this.cache.set(key, value === undefined ? UNDEFINED_MARKER : value)
    // Stored with the inherited kind and lazy flag plus a dead-code factory
    // (cache.set above always wins the hot-path) — same shape as registerValue
    // for uniformity.
    this.regs.set(
      key,
      /* v8 ignore next */
      {kind: existingKind, lazy: existingLazy, fn: () => value as unknown as T[keyof T]['type'], owned: false},
    )
    this.mutationEpoch.value++
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
  public get<K extends keyof T>(key: K): T[K]['type'] {
    // 1. Hot path: local cache hit.
    //    Single Map.get covers ≥99.9% of resolves. `UNDEFINED_MARKER` covers the
    //    rare deliberately-registered `undefined`. Note that `_disposed` is checked
    //    AFTER the cache lookup — dispose() clears `cache`, so a disposed container
    //    falls through to the explicit check below; observable semantics unchanged.
    const cached = this.cache.get(key)

    if (cached !== undefined) {
      return (cached === UNDEFINED_MARKER ? undefined : cached) as T[K]['type']
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
        if (this.strict) {
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

        // strict=false hot path: no cycle bookkeeping, no try/finally, no lifetime
        // check. Just call the factory. Caller-owned by transient contract.
        return localReg.fn(this)
      }

      // Self-resolve: owner === this for every kind, so target === this.
      return this.resolveWithOwnerAndReg(this, localReg, key)
    }

    // 3. Walk-up across the parent chain, with a per-container memoization of the
    //    found (owner, reg) pair. The cache is invalidated lazily through the
    //    tree-wide mutation epoch, so registrations and disposal anywhere in the
    //    tree are observed on the next parent lookup.
    let owner: Container<T> | undefined
    let reg: Registration<T, K> | undefined

    const cachedEntry = this.lookupCache?.get(key)
    if (cachedEntry !== undefined && cachedEntry.treeVersion === this.mutationEpoch.value) {
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
        treeVersion: this.mutationEpoch.value,
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

  /**
   * Type-guard predicate: returns `true` if `key` is registered on this
   * container or any ancestor scope, `false` otherwise. Walks the parent
   * chain exactly like {@link Container.get}, but does not consult
   * `lookupCache` — `.has()` is a cold-path query, so the extra read is not
   * worth populating a cache designed for hot resolves.
   *
   * **Behaviour on a disposed container.** A disposed container clears `regs`
   * and nulls `parent`, so `.has()` returns `false` for every key after
   * dispose. This is symmetric with the {@link disposed} getter — both are
   * pure observers, neither throws — and matches the runtime truth: a
   * disposed container literally no longer knows any key.
   *
   * The signature is a TypeScript type-guard: inside `if (c.has('x'))` the
   * compiler narrows `'x'` to `keyof T`, so a subsequent `c.get('x')` type-
   * checks even when the static `T` did not statically include `'x'`.
   *
   * Note that calling `.has(k)` immediately before `.get(k)` walks the
   * parent chain twice. For statically-known keys (the common case), prefer
   * a direct `.get()` — TypeScript already rejects unknown keys at compile
   * time. The type-guard is intended for genuinely dynamic key construction.
   *
   * @template K - Any string-or-symbol key. The guard narrows it to `keyof T`.
   *
   * @param key - The candidate key.
   * @returns `true` if the key is reachable through the scope chain.
   *
   * @example
   * ```ts
   * declare const c: Container<{ logger: Spec<Logger> }>
   *
   * if (c.has('logger')) {
   *   c.get('logger').log('ok')  // narrowed to Logger inside the branch
   * }
   *
   * c.has('missing')   // false — does not throw
   * ```
   */
  public has<K extends string | symbol>(key: K): key is K & keyof T {
    if (this.regs.has(key as unknown as keyof T)) {
      return true
    }
    let cur: Container<T> | undefined = this.parent
    while (cur !== undefined) {
      if (cur.regs.has(key as unknown as keyof T)) {
        return true
      }
      cur = cur.parent
    }
    return false
  }

  // Shared resolution path used both for self-resolves (owner === this) and for
  // delegated singleton resolves (owner !== this). The split avoids the previous
  // `owner.get(key)` re-entry, which paid for a full second walk-up on every
  // singleton resolve from a child scope.
  /** @internal */
  private resolveWithOwnerAndReg<K extends keyof T>(
    target: Container<T>,
    reg: Registration<T, K>,
    key: K,
  ): T[K]['type'] {
    // Cache check on the owning container. For self-resolves the get() hot-path
    // already cleared `this.cache`, so this branch is reachable only when the
    // singleton is delegated from a child scope (this !== target). Unconditional
    // because it serves correctness (avoid re-running a singleton factory) — not
    // a "guard" that strict-mode would gate.
    if (target !== this && reg.kind !== 'transient') {
      const cached = target.cache.get(key)

      if (cached !== undefined) {
        return (cached === UNDEFINED_MARKER ? undefined : cached) as T[K]['type']
      }
    }

    if (this.strict) {
      // Lifetime guard — short-lived dep inside a long-lived (singleton) factory.
      // `singletonStack.length > 0` is a cheap integer field-access; the rest of the
      // condition only runs inside an active singleton resolution. Defense-in-depth:
      // the v3 compile-time guard via AllowedDeps is the primary protection, but
      // `as`-cast bypasses and dynamically-built registrations need a runtime floor
      // with a key-naming error message. Opt out via `new Container({ strict: false })`.
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

      this.resolving.push(key)

      if (reg.kind === 'singleton') {
        this.singletonStack.push(key)
      }

      try {
        const instance = reg.fn(target)

        if (reg.kind !== 'transient') {
          target.cache.set(key, instance === undefined ? UNDEFINED_MARKER : instance)
          if (reg.owned && !target.owned.includes(instance)) {
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

    // strict=false bare path: drop cycle bookkeeping, the singleton-stack
    // push/pop, and the surrounding try/finally. A real cycle here loops the
    // call stack until V8 throws RangeError.
    const instance = reg.fn(target)

    if (reg.kind !== 'transient') {
      target.cache.set(key, instance === undefined ? UNDEFINED_MARKER : instance)
      if (reg.owned && !target.owned.includes(instance)) {
        target.owned.push(instance)
      }
    }
    return instance
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
   * Promises cached by async factories are awaited first, and the probe runs
   * against the resolved instance; a rejection joins the same error stream.
   * Errors do not break the chain — they are collected and re-thrown as an
   * AggregateError at the end, so a single failing resource does not leave the
   * rest unclosed. Concurrent calls share the same completion Promise; repeated
   * calls after teardown are a no-op.
   */
  public dispose(): Promise<void> {
    if (this.disposePromise !== undefined) {
      return this.disposePromise
    }

    if (this._disposed) {
      return Promise.resolve()
    }

    this._disposed = true
    this.mutationEpoch.value++

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

    let resolveDisposal!: () => void
    let rejectDisposal!: (reason: unknown) => void
    const promise = new Promise<void>((resolve, reject) => {
      resolveDisposal = resolve
      rejectDisposal = reject
    })
    this.disposePromise = promise

    void this.disposeInstances(instances).then(
      () => {
        this.disposePromise = undefined
        resolveDisposal()
      },
      (reason) => {
        this.disposePromise = undefined
        rejectDisposal(reason)
      },
    )
    return promise
  }

  /** @internal */
  private async disposeInstances(
    instances: readonly (DisposableLike | null | undefined)[],
  ): Promise<void> {
    const errors: unknown[] = []
    const disposedInstances = new Set<unknown>()

    for (let i = instances.length - 1; i >= 0; i--) {
      let inst = instances[i] as DisposableLike | PromiseLike<DisposableLike | null | undefined> | null | undefined

      // Factories may intentionally return null or undefined.
      if (inst == null) {
        continue
      }

      try {
        // Async factories cache a Promise in `owned`. Unwrap it before the
        // disposer probe so the resolved instance's [Symbol.asyncDispose] /
        // [Symbol.dispose] / .dispose() actually fires. A rejection here
        // throws into the same `errors.push(err)` path as a throwing disposer.
        // Duck-typed `.then` matches any PromiseLike — not bound to the global
        // Promise so polyfills and custom thenables also unwrap.
        if (typeof (inst as { then?: unknown }).then === 'function') {
          inst = await (inst as PromiseLike<DisposableLike | null | undefined>)
          if (inst == null) continue
        }

        // Distinct async factories may return different Promise objects that
        // resolve to the same resource. Deduplicate after unwrapping as well as
        // at enqueue time so a shared resource is closed exactly once.
        if (disposedInstances.has(inst)) continue
        disposedInstances.add(inst)

        if (typeof (inst as DisposableLike)[Symbol.asyncDispose] === 'function') {
          await (inst as DisposableLike)[Symbol.asyncDispose]!()
        } else if (typeof (inst as DisposableLike)[Symbol.dispose] === 'function') {
          (inst as DisposableLike)[Symbol.dispose]!()
        } else if (typeof (inst as DisposableLike).dispose === 'function') {
          const r = (inst as DisposableLike).dispose!()
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
   * A Promise cached from an async factory cannot be awaited synchronously: the
   * misuse is recorded as an Error in the teardown errors and the resource is
   * left unclosed — use `await using` / `await container.dispose()` instead.
   */
  public [Symbol.dispose](): void {
    if (this._disposed) {
      return
    }

    this._disposed = true
    this.mutationEpoch.value++

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

      // Factories may intentionally return null or undefined.
      if (inst == null) {
        continue
      }

      try {
        // A Promise cached from an async factory cannot be awaited synchronously.
        // Record the misuse — sync teardown is the wrong protocol here. The resource
        // will not be closed; correct usage is `await using` / container.dispose().
        // We deliberately do not fire a background cleanup: that would amount to
        // "silently fix the misuse", which hides the bug.
        if (typeof (inst as { then?: unknown }).then === 'function') {
          errors.push(new Error(
            `Sync [Symbol.dispose] called on a container that cached a Promise from an ` +
            `async factory. Use \`await using\` / container.dispose() for async teardown.`,
          ))
        } else if (typeof inst[Symbol.dispose] === 'function') {
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
   * Extracts the registered key map from a fully-built container type as a
   * **flat** `{ key: ServiceType }` view — the lifetime kind from each {@link Spec}
   * is unwrapped so downstream consumers (handlers, mocks, test fixtures) see
   * the same shape they always did.
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
  export type Resolve<C> = C extends Container<infer U>
    ? { [K in keyof U]: U[K]['type'] }
    : never

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
  export type ResolveUnwrapped<C> = C extends Container<infer U>
    ? {
        [K in keyof U]: U[K] extends LazySpec<infer V, infer _TargetKind>
          ? V
          : U[K]['type']
      }
    : never

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

  /**
   * Flattens a built container into a record of zero-argument **provider**
   * functions, one per registered key. Each provider returns the service type
   * as exposed by {@link Resolve} — for keys registered with a `lazyKey`
   * companion the corresponding entry returns the `Lazy<V>` wrapper shape
   * (`{ get: () => V }`), not the unwrapped service.
   *
   * Designed for typing mock-factory fixtures in tests: write the fixture as
   * `Container.Providers<typeof builder>` and the compiler enforces that every
   * registered key is covered with a thunk returning the correct shape.
   *
   * @template C - A `Container<T>` type, typically obtained as
   *               `ReturnType<typeof buildContainer>`.
   *
   * @example
   * ```ts
   * function buildContainer() {
   *   return new Container()
   *     .registerClass('logger', Logger, [])
   *     .registerClass('clock', Clock, [], 'transient', 'clockLazy')
   * }
   *
   * const mocks: Container.Providers<ReturnType<typeof buildContainer>> = {
   *   logger:    () => mockLogger,
   *   clock:     () => mockClock,
   *   clockLazy: () => ({ get: () => mockClock }),  // Lazy<Clock> shape
   * }
   * ```
   */
  export type Providers<C> = C extends Container<infer U>
    ? { [K in keyof U]: () => U[K]['type'] }
    : never
}
