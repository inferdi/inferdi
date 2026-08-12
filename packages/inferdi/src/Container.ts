/*
 * Polyfill for Symbol.dispose / Symbol.asyncDispose for environments where these
 * well-known symbols are not yet defined (Node <20.4). Symbol.for ensures cross-realm
 * consistency: any other code reading Symbol.dispose after this module is loaded
 * observes the same registry symbol, so `using` / `await using` interop is preserved.
 * On Node 20.4+ the well-known symbol already exists and the ??= is a no-op.
 * v8-ignore: the right-hand side never executes on modern Node (target audience),
 * so coverage cannot reach it without dropping support for older runtimes
 */
/* v8 ignore next 2 */
;(Symbol as { dispose?: symbol }).dispose ??= Symbol.for('Symbol.dispose')
;(Symbol as { asyncDispose?: symbol }).asyncDispose ??= Symbol.for('Symbol.asyncDispose')

const UNDEFINED_MARKER = Symbol('UNDEFINED_MARKER')

declare const requiredInputs: unique symbol
declare const scopeInputMarker: unique symbol
declare const lazyMode: unique symbol

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
 * A deferred reference to a declarative async service. Calling `.get()` starts
 * or joins resolution of the underlying target and returns its native Promise.
 * Merely resolving or injecting the wrapper does not start the target.
 *
 * Produced by the `lazyKey` overload of {@link Container.registerAsyncFactory}
 * and by async-propagated class registrations. A Promise-valued
 * `registerFactory` remains {@link Lazy}<Promise<T>> instead.
 *
 * @example
 * ```ts
 * import { Container, type AsyncLazy } from '@inferdi/inferdi'
 *
 * const c = new Container()
 *   .registerAsyncFactory('db', async () => Database.connect(), [], undefined, 'dbLazy')
 *
 * const dbLazy: AsyncLazy<Database> = c.get('dbLazy')
 * const db = await dbLazy.get()
 * ```
 */
export type AsyncLazy<T> = { readonly get: () => Promise<T> }

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
  /*
   * Readonly fields are covariant in V/K. Plain (mutable) fields are invariant,
   * which would block assignability of e.g. Spec<{port:8080}, 'singleton'> to the
   * wider Spec<unknown, RegistrationKind> used as the index value in DependenciesMap.
   * Invariance would collapse `Container<T & Record<K, Spec<V, ...>>>` back to
   * `Container<DependenciesMap>` (or worse, `never`) on every fluent step
   */
  readonly type: V
  readonly kind: K
}

/**
 * A declarative asynchronous registration. `V` is the final service type,
 * not the Promise used while initializing it. Resolve these keys through
 * {@link Container.getAsync}; classes that declare an `AsyncSpec` dependency
 * are classified as async automatically.
 *
 * @example
 * ```ts
 * const c = new Container()
 *   .registerAsyncFactory('db', async () => Database.connect(), [])
 *
 * const db = await c.getAsync('db')
 * ```
 */
export interface AsyncSpec<
  V,
  K extends RegistrationKind = 'singleton'
> extends Spec<V, K> {
  readonly async: true
}

/**
 * Synchronous companion registration produced by the `lazyKey` parameter of
 * `registerClass` or `registerFactory`.
 * Carries the target service's lifetime in `lazyOf` so the type-level
 * lifetime guard can permit only singleton-target companions inside a
 * singleton consumer, matching the runtime guard.
 *
 * The companion itself is always `'transient'` (the `{ get }` wrapper is
 * cheap and caller-owned). Manual `Spec<Lazy<V>, 'transient'>` registrations
 * (created by hand via `registerValue`/`registerFactory`) are *not*
 * `LazySpec` — the type system treats them as plain transient values, not
 * managed lazy companions. The private type-only mode discriminant makes
 * named `LazySpec` annotations the supported way to describe managed
 * companions in explicit container and module shapes.
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
  readonly [lazyMode]: 'sync'
}

/**
 * Asynchronous companion registration produced by a declarative async target.
 * The wrapper itself is transient and caller-owned; `lazyOf` records the
 * target lifetime for compile-time and runtime lifetime guards.
 *
 * Manual `Spec<AsyncLazy<V>, 'transient'>` registrations are ordinary
 * transient values, not managed companions. Use this exported interface for
 * explicit `Container` and `Module` shapes.
 *
 * @template V          - The final service type returned by `AsyncLazy.get()`.
 * @template TargetKind - The lifetime kind of the underlying target service.
 *
 * @example
 * ```ts
 * import { Container, type AsyncLazySpec, type AsyncSpec } from '@inferdi/inferdi'
 *
 * declare const c: Container<{
 *   db: AsyncSpec<Database, 'singleton'>
 *   dbLazy: AsyncLazySpec<Database, 'singleton'>
 * }>
 * ```
 */
export interface AsyncLazySpec<V, TargetKind extends RegistrationKind>
  extends Spec<AsyncLazy<V>, 'transient'> {
  readonly lazyOf: TargetKind
  readonly [lazyMode]: 'async'
}

interface RequiredInputs<K extends string | symbol> {
  readonly [requiredInputs]: K
}

interface ScopeInputSpec<V, K extends string | symbol>
  extends Spec<V, 'scoped'> {
  readonly [scopeInputMarker]: true
  readonly [requiredInputs]: K
}

type KeysOfUnion<T> = T extends unknown ? keyof T : never

type HasVariantKeys<M> = Exclude<KeysOfUnion<M>, keyof M> extends never
  ? false
  : true

/**
 * Maps a finite record of externally provided scope values onto InferDI's
 * type-level graph. Prefer {@link Container.declareScopeInputs} for fluent
 * builders; use this helper when describing a named {@link Module}.
 *
 * Declaration keys must be required, finite string or symbol keys. Numeric
 * keys, `__proto__`, broad string/symbol index signatures, optional keys, and
 * unions with different key sets are rejected.
 *
 * @example
 * ```ts
 * type RequestInputs = ScopeInputMap<{
 *   request: RequestContext
 *   auth: AuthContext
 * }>
 * ```
 */
export type ScopeInputMap<M extends object> =
  HasVariantKeys<M> extends true
    ? never
    : string extends keyof M
      ? never
      : symbol extends keyof M
        ? never
        : Exclude<keyof M, string | symbol> extends never
          ? '__proto__' extends keyof M
            ? never
            : [M] extends [Required<M>]
              ? {
                  [K in keyof M]: ScopeInputSpec<M[K], Extract<K, string | symbol>>
                }
              : never
          : never

type RequirementsOf<S> = S extends RequiredInputs<infer K> ? K : never

type WithoutRequirements<S> = S extends RequiredInputs<string | symbol>
  ? Omit<S, typeof requiredInputs>
  : S

/**
 * Attaches a normalized union of required scope-input keys to a graph entry.
 * Supplying `never` removes an existing requirement while preserving the
 * identity of ordinary {@link Spec}, {@link LazySpec}, and
 * {@link AsyncLazySpec} entries.
 *
 * @example
 * ```ts
 * type RequestHandler = WithRequirements<
 *   Spec<Handler, 'scoped'>,
 *   'request'
 * >
 * ```
 */
export type WithRequirements<S, K extends string | symbol> = [K] extends [never]
  ? WithoutRequirements<S>
  : WithoutRequirements<S> & RequiredInputs<K>

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
  K extends RegistrationKind = 'singleton'
> = { [P in keyof M]: Spec<M[P], K> }

/*
 * Filters T down to the keys that are legal to inject into a target with
 * the given TargetKind, per the runtime lifetime guard:
 *   - singleton target: only singleton entries and managed sync/async
 *     companions whose complete target-kind union is `'singleton'` are legal.
 *     Short-lived or possibly short-lived companions remain available to
 *     scoped/transient consumers but are blocked here — deferral preserves the
 *     target's lifetime, it does not lift short-lived services into singleton scope.
 *   - scoped / transient target: any entry is legal (matches runtime in get()).
 * Managed companions are identified by their branded {@link LazySpec} or
 * {@link AsyncLazySpec} shape. The whole entry is checked non-distributively so
 * mixed target lifetimes and managed/unmanaged unions are not singleton-safe
 */
type AllowedDeps<T extends DependenciesMap, TargetKind extends RegistrationKind> =
  TargetKind extends 'singleton'
    ? {
        [K in keyof T as
            T[K]['kind'] extends 'singleton' ? K
          : [T[K]] extends [
              LazySpec<unknown, 'singleton'> |
              AsyncLazySpec<unknown, 'singleton'>
            ] ? K
          : never
        ]: T[K]
      }
    : T

type RequirementsOfDeps<
  T extends DependenciesMap,
  D extends readonly (keyof T)[]
> = RequirementsOf<Extract<T[D[number]], RequiredInputs<string | symbol>>>

type WithRequirementsOfDeps<
  S,
  T extends DependenciesMap,
  D extends readonly (keyof T)[]
> = [Extract<T[D[number]], RequiredInputs<string | symbol>>] extends [never]
  ? S
  : WithRequirements<S, RequirementsOfDeps<T, D>>

type ReadyKeysOf<T extends DependenciesMap> =
  [Extract<T[keyof T], RequiredInputs<string | symbol>>] extends [never]
    ? keyof T
    : {
        [K in keyof T]: [RequirementsOf<T[K]>] extends [never] ? K : never
      }[keyof T]

type RejectAsyncKey<
  T extends DependenciesMap,
  K extends keyof T
> = Extract<T[K], AsyncSpec<unknown, RegistrationKind>> extends never
  ? unknown
  : never

type SyncReadyKeysOf<T extends DependenciesMap> = {
  [K in ReadyKeysOf<T>]: RejectAsyncKey<T, K> extends never ? never : K
}[ReadyKeysOf<T>]

type RequireReadonlyDeps<D extends readonly unknown[]> =
  D extends unknown[] ? never : unknown

type RequireReadonlyAsyncDeps<
  T extends DependenciesMap,
  D extends readonly (keyof T)[]
> = ContainsAsyncDep<T, D> extends true ? RequireReadonlyDeps<D> : unknown

type RejectAsyncDeps<
  T extends DependenciesMap,
  D extends readonly (keyof T)[]
> = Extract<T[D[number]], AsyncSpec<unknown, RegistrationKind>> extends never
  ? unknown
  : never

type ContainsAsyncDep<
  T extends DependenciesMap,
  D extends readonly (keyof T)[]
> = Extract<T[D[number]], AsyncSpec<unknown, RegistrationKind>> extends never
  ? false
  : true

type DepAsyncState<
  T extends DependenciesMap,
  K extends keyof T
> = [T[K]] extends [AsyncSpec<unknown, RegistrationKind>]
  ? 'async'
  : Extract<T[K], AsyncSpec<unknown, RegistrationKind>> extends never
    ? 'sync'
    : 'mixed'

type DepAsyncStates<
  T extends DependenciesMap,
  D extends readonly (keyof T)[]
> = {
  readonly [I in keyof D]: DepAsyncState<T, D[I]>
}

type ClassSpec<
  T extends DependenciesMap,
  D extends readonly (keyof T)[],
  V,
  Kind extends RegistrationKind
> = 'async' extends DepAsyncStates<T, D>[number]
  ? AsyncSpec<V, Kind>
  : 'mixed' extends DepAsyncStates<T, D>[number]
    ? Spec<V, Kind> | AsyncSpec<V, Kind>
    : Spec<V, Kind>

type LazyCompanion<S> =
  S extends AsyncSpec<infer V, infer Kind>
    ? AsyncLazySpec<V, Kind>
    : S extends Spec<infer V, infer Kind>
      ? LazySpec<V, Kind>
      : never

type UnwrapSpec<S> =
  S extends AsyncLazySpec<infer V, infer _Kind>
    ? V
    : S extends LazySpec<infer V, infer _Kind>
      ? V
      : S extends Spec<infer V, infer _Kind>
        ? V
        : never

type InputKeys<T extends DependenciesMap> = {
  [K in keyof T]: T[K] extends {readonly [scopeInputMarker]: true} ? K : never
}[keyof T]

type MissingInputKeys<T extends DependenciesMap> = {
  [K in InputKeys<T>]: [RequirementsOf<T[K]>] extends [never] ? never : K
}[InputKeys<T>]

type InputValues<T extends DependenciesMap> = {
  [K in MissingInputKeys<T>]: T[K]['type']
}

type RequiredKeys<T> = {
  [K in KeysOfUnion<T>]: [T] extends [Record<K, unknown>] ? K : never
}[KeysOfUnion<T>]

type NoExtraKeys<Inputs, Allowed extends PropertyKey> =
  Exclude<KeysOfUnion<Inputs>, Allowed> extends infer Extra
    ? [Extra] extends [never]
      ? Inputs
      : Inputs & {readonly 'Invalid scope input keys': Extra}
    : never

type Provide<
  T extends DependenciesMap,
  Provided extends string | symbol
> = {
  [K in keyof T]: WithRequirements<
    T[K],
    Exclude<RequirementsOf<T[K]>, Provided>
  >
}

type RegistrationKeys<T extends DependenciesMap> = {
  [K in keyof T]: T[K] extends {readonly [scopeInputMarker]: true} ? never : K
}[keyof T]

type ScopeInputDeclarationCheck<T, Inputs extends object> =
  ScopeInputMap<Inputs> extends never
    ? {
        readonly 'Invalid scope input declaration: use required finite string or symbol keys': never
      }
    : [keyof T & keyof Inputs] extends [never]
      ? unknown
      : {readonly 'Scope input key already exists': keyof T & keyof Inputs}

interface FactoryResolver<T extends DependenciesMap> {
  get<K extends ReadyKeysOf<T>>(
    key: K & RejectAsyncKey<T, K>
  ): T[K]['type']
  has(key: string | symbol): boolean
}

type FactoryDependencyKeys<
  T extends DependenciesMap,
  Kind extends RegistrationKind
> = keyof T & keyof AllowedDeps<T, Kind>

type FactorySelection<
  T extends DependenciesMap,
  D extends readonly PropertyKey[]
> = {
  [K in Extract<D[number], keyof T>]: WithRequirements<T[K], never>
}

type NoKeyOverlap<A, B> = keyof A & keyof B extends never
  ? B
  : `Error: module tries to override existing keys: ${string & keyof A & keyof B}`

/**
 * Construction options for {@link Container}.
 *
 * @example
 * ```ts
 * // Default — full runtime guards
 * const root = new Container()
 *
 * // Opt out of the runtime guards. Applications that fully trust the v3
 * // compile-time guard (`AllowedDeps<T, Kind>`) and freeze the graph before
 * // its first resolve can use this for a faster hot path. The flag is inherited
 * // by every scope spawned via createScope()
 * const fast = new Container({ strict: false })
 * ```
 */
export interface ContainerOptions {
  /**
   * Toggle runtime cycle and lifetime guards.
   *
   * - `true` (default) — cycle detection and the singleton lifetime guard
   *   fire on every resolve. Errors are precise (`Circular dependency detected:
   *   ...`, `Singleton "..." cannot depend on scoped "..."`).
   * - `false` — both checks are skipped. `get()` for `transient` becomes a bare
   *   `fn(this)` call; the non-transient path skips the cycle bookkeeping and
   *   the singleton-stack push/pop, dropping a `try`/`finally` block and an
   *   `Array#includes` scan from the hot path. Scopes read the immutable root
   *   registry directly without a parent walk, delegated singletons are mirrored
   *   into the scope cache, and registration skips defensive cache invalidation.
   *   Owned-instance identity de-duplication runs on the cold disposal path in
   *   both modes.
   *
   * Trade-off when `strict: false`: a cycle introduced via an `as`-cast or a
   * dynamically built factory closure becomes a `RangeError: Maximum call
   * stack size exceeded` instead of the precise diagnostic. A lifetime
   * violation introduced the same way silently freezes a short-lived value
   * inside a singleton.
   *
   * Fast mode treats the graph as immutable once scopes or resolutions exist.
   * Register each runtime key once through one linear fluent chain, finish every
   * `register*` call before the first `.get()` / `.createScope()`, do not call
   * `.override()` on an activated tree, and dispose children before their
   * ancestors. Breaking this contract may leave a child using a stale locally
   * cached singleton or make a post-activation registration invisible to
   * descendants.
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
  /*
   * Marker that excludes the entry from the singleton lifetime guard. Set to
   * `true` ONLY for Lazy/AsyncLazy companions whose target kind is `'singleton'`:
   *   - singleton-target companion: kind='transient', lazy=true → guard skipped,
   *     singleton consumer may legally inject the wrapper.
   *   - scoped/transient-target companion: kind='transient', lazy=false → guard
   *     fires when a singleton consumer tries to inject it, matching the
   *     compile-time `AllowedDeps<T, 'singleton'>` filter.
   *   - Every other registration: lazy=false.
   * The wrapper's `fn` returns a closure over `c.get(targetKey)` or
   * `c.getAsync(targetKey)` — it does NOT resolve the target while creating the
   * wrapper. That deferral is what makes singleton-target companions safe to
   * inject into a singleton.
   * Always set (false for non-lazy entries) so every Registration object has the
   * same V8 Hidden Class / Shape — `localReg.lazy` reads on the hot path stay in
   * a monomorphic inline cache instead of falling into a PIC bucket lookup
   */
  readonly lazy: boolean
  readonly fn: (container: Container<T>) => T[K]['type']
  /*
   * Appended after the three hot fields to preserve their offsets in the
   * Registration shape. Read only after a non-transient factory has run
   */
  readonly owned: boolean
  /* Cold-path marker for declarative async injection; get() never reads it */
  readonly async?: true
}

/*
 * Projects the constructor parameter types onto the allowed DI-map keys.
 * Prevents passing a deps key whose value is not assignable to the corresponding argument.
 * Reads `T[K]['type']` because each entry of the map is a Spec<V, Kind>
 */
type DepsOf<T extends DependenciesMap, A extends readonly unknown[]> = {
  readonly [I in keyof A]: Extract<
    keyof T,
    {
      [K in keyof T]: unknown extends A[I] ? never : T[K]['type'] extends A[I] ? K : never
    }[keyof T]
  >
}

/*
 * Instances that the container knows how to close on dispose.
 * Probe order: Symbol.asyncDispose → Symbol.dispose → plain .dispose()
 */
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
 * keys visible inside a singleton factory are singletons and singleton-target
 * `Lazy`/`AsyncLazy` companions.
 * `registerClass(_, _, deps, kind)` enforces the same constraint on its `deps`
 * tuple. The runtime guard in `get()` remains as defense-in-depth against
 * `as`-cast bypasses; its error message names the offending keys.
 *
 * **Declarative async graph.** {@link Container.registerAsyncFactory} stores a
 * final service type in {@link AsyncSpec}; dependent classes inherit async
 * status and resolve through {@link Container.getAsync}. Sync registrations
 * keep using {@link Container.get} and its one-lookup cache-hit path.
 *
 * **Resource management.** `Container` itself implements `Symbol.dispose` and
 * `Symbol.asyncDispose`, so it composes with `using` / `await using`. Owned
 * instances are torn down in reverse-creation (LIFO) order; multiple disposer
 * failures are surfaced as a single `AggregateError`.
 *
 * @template T - The map of registered keys to {@link Spec} or {@link AsyncSpec}
 *               entries. Fluent `register*` methods accumulate it.
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
  /** @internal */
  private scopeInputs: Record<string | symbol, unknown> | undefined = undefined
  /*
   * Teardown queue. Only instances created by THIS container land here
   * (not registerValue — external ownership; not transient — owned by the caller).
   * Resolution appends without an identity scan; teardown de-duplicates the
   * snapshot once on the cold disposal path. Array preserves insertion order —
   * on dispose we iterate in reverse for LIFO
   */
  /** @internal */
  private owned: unknown[] = []
  /*
   * resolving and singletonStack are shared across the whole tree — children inherit
   * references from the parent. In strict mode resolving catches cycles and
   * singletonStack catches an attempt by a singleton to take a scoped dependency.
   * Fast mode leaves both arrays untouched.
   * A separate `root` field is unnecessary: these two collections already span the chain.
   *
   * INVARIANT: get() MUST stay synchronous. resolving works as a precise projection of
   * the call stack only because declared dependency preflight completes atomically before
   * returning a Promise. Async factory and constructor continuations run after these
   * stacks are cleared and never mutate them
   */
  /** @internal */
  private readonly resolving: (keyof T)[]
  /** @internal */
  private readonly singletonStack: (keyof T)[]
  /** @internal */
  private _disposed = false
  /** @internal */
  private disposePromise: Promise<void> | undefined = undefined
  /*
   * Strict children retain the exact parent chain. Fast children point directly to
   * the immutable registry owner. dispose nulls the reference so a disposed child
   * does not hold the live root with all of its caches and factories.
   * Declared as `T | undefined` (not `parent?: T`) to satisfy exactOptionalPropertyTypes
   * when assigning undefined in dispose()
   */
  /** @internal */
  private parent: Container<T> | undefined
  /*
   * Opt-out toggle for runtime guards.
   * Stored per-container; inherited from `parent` when this is a scope child,
   * otherwise read from the ContainerOptions argument. A single readonly
   * boolean read on the hot path — predictable for V8's branch predictor
   * because the same flag value flows through every resolve on a given tree
   */
  /** @internal */
  private readonly strict: boolean

  /**
   * Creates a new container.
   *
   * @param options - Optional construction options. `strict?: boolean` toggles
   *                  runtime guards (default `true`).
   *
   * @example
   * ```ts
   * const root = new Container()
   * const fast = new Container({ strict: false })
   * ```
   */
  public constructor(options?: ContainerOptions)
  // Internal overload — used by createScope() to wire the parent chain
  /** @internal */
  public constructor(parent: Container<T>)
  public constructor(arg?: ContainerOptions | Container<T>) {
    if (arg instanceof Container) {
      this.strict = arg.strict
      /*
       * A fast tree is immutable after activation, so every reachable registration
       * lives on the original registry owner. Flatten nested scopes to that owner:
       * parent misses become one direct registry lookup. Strict trees retain the
       * exact chain because local registration and override mutations must remain
       * observable
       */
      this.parent = !this.strict && arg.parent !== undefined ? arg.parent : arg
      this.resolving = arg.resolving
      this.singletonStack = arg.singletonStack
    } else {
      this.parent = undefined
      this.strict = arg?.strict ?? true
      this.resolving = []
      this.singletonStack = []
    }
  }

  /**
   * Declares external values that may be supplied when opening child scopes.
   * The declaration is type-only: it does not register values or mutate this
   * container. Call {@link Container.createScope} with any required subset to
   * make those inputs and their dependent services ready in the new child.
   *
   * @example
   * ```ts
   * const root = new Container()
   *   .declareScopeInputs<{
   *     request: RequestContext
   *     auth: AuthContext
   *   }>()
   *
   * const publicScope = root.createScope({request})
   * const authenticatedScope = publicScope.createScope({auth})
   * ```
   */
  public declareScopeInputs<Inputs extends object>(
    this: Container<T> & ScopeInputDeclarationCheck<T, Inputs>
  ): Container<T & ScopeInputMap<Inputs>>
  public declareScopeInputs(): any {
    return this
  }

  /** @internal */
  private asyncDependencyIndices(
    keys: readonly (keyof T)[]
  ): number[] | undefined {
    let indices: number[] | undefined

    for (let i = 0; i < keys.length; i++) {
      let cur: Container<T> | undefined = this

      while (cur !== undefined) {
        const reg = cur.regs.get(keys[i]!)

        if (reg !== undefined) {
          if (reg.async === true) {
            (indices ??= []).push(i)
          }
          break
        }

        cur = cur.parent
      }
    }

    return indices
  }

  /** @internal */
  private resolveAsyncDependencies(
    keys: readonly (keyof T)[],
    asyncIndices: readonly number[],
    invoke: (args: unknown[]) => unknown
  ): Promise<unknown> {
    const values: unknown[] = []

    try {
      for (let i = 0; i < keys.length; i++) {
        values.push(this.get(keys[i]! as never))
      }
    } catch (error) {
      /* Observe already-started native Promises without assimilating legacy thenables */
      for (const value of values) {
        if (value instanceof Promise) {
          void value.catch(() => {})
        }
      }

      throw error
    }

    const pending: unknown[] = []

    for (const index of asyncIndices) {
      pending.push(values[index])
    }

    return Promise.all(pending).then((resolved) => {
      for (let i = 0; i < resolved.length; i++) {
        values[asyncIndices[i]!] = resolved[i]
      }

      return invoke(values)
    })
  }

  /**
   * Registers a class constructor under a specific key.
   *
   * The container automatically infers the created type and adds it to the
   * container's registry. The compiler strictly checks that the `deps` array
   * precisely matches the constructor's arguments by both type and position,
   * **and** that every dep is a legal lifetime for the target `kind` — a
   * singleton target only accepts singleton deps or singleton-target lazy companions.
   * Passing a `lazyKey` additionally registers a companion under that key. A
   * sync class gets `Lazy<V>`, an async-propagated class gets `AsyncLazy<V>`,
   * and a dependency key union that may select either branch produces
   * `Lazy<V> | AsyncLazy<V>`.
   *
   * @template K - The string-or-symbol key to register the class under. Must not be already registered.
   * @template V - The instance type created by the constructor.
   * @template A - The tuple of constructor argument types.
   * @template Kind - The literal {@link RegistrationKind} of this registration.
   * @template LK - The string-or-symbol key for the optional lazy companion.
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param Ctor - The class constructor to instantiate.
   * @param deps - A tuple of dependency keys that map positionally to the constructor's parameters.
   * @param kind - The lifetime of the instance: `'singleton'` (default), `'scoped'`, or `'transient'`.
   * @param lazyKey - Optional companion key (string or symbol). When provided, registers a
   *                  mode-matched wrapper under that key. Must differ from `key` and
   *                  from any already-registered key.
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
    deps: D & RequireReadonlyAsyncDeps<T, D>,
    kind?: undefined
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<ClassSpec<T, D, V, 'singleton'>, T, D>
    >
  >

  public registerClass<
    const K extends string | symbol,
    V,
    A extends readonly unknown[],
    const Kind extends RegistrationKind,
    const D extends DepsOf<AllowedDeps<T, Kind>, A> = DepsOf<AllowedDeps<T, Kind>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    Ctor: new (...args: A) => V,
    deps: D & RequireReadonlyAsyncDeps<T, D>,
    kind: Kind
  ): Container<
    T & Record<K, WithRequirementsOfDeps<ClassSpec<T, D, V, Kind>, T, D>>
  >

  public registerClass<
    const K extends string | symbol,
    V,
    A extends readonly unknown[],
    const LK extends string | symbol,
    const D extends DepsOf<AllowedDeps<T, 'singleton'>, A> = DepsOf<AllowedDeps<T, 'singleton'>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    Ctor: new (...args: A) => V,
    deps: D & RequireReadonlyAsyncDeps<T, D>,
    kind: undefined,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<ClassSpec<T, D, V, 'singleton'>, T, D>
    > & Record<
      LK,
      WithRequirementsOfDeps<
        LazyCompanion<ClassSpec<T, D, V, 'singleton'>>,
        T,
        D
      >
    >
  >

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
    deps: D & RequireReadonlyAsyncDeps<T, D>,
    kind: Kind,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<ClassSpec<T, D, V, Kind>, T, D>
    > & Record<
      LK,
      WithRequirementsOfDeps<LazyCompanion<ClassSpec<T, D, V, Kind>>, T, D>
    >
  >

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

    /*
     * Keep the reference to the original array — in DI idiom deps are passed as a
     * literal and never mutated after registration. Saves one allocation per registerClass
     */
    const keys = deps as readonly (keyof T)[]
    const len = keys.length
    const asyncIndices = this.asyncDependencyIndices(keys)

    if (asyncIndices !== undefined) {
      this.regs.set(key as keyof T, {
        kind,
        lazy: false,
        fn: ((c: Container<T>) => c.resolveAsyncDependencies(
          keys,
          asyncIndices,
          (args) => Reflect.construct(Ctor, args) as V
        )) as unknown as (c: Container<T>) => T[keyof T]['type'],
        owned: true,
        async: true
      })

      if (this.strict) {
        this.cache.delete(key as keyof T)
      }

      if (lazyKey !== undefined) {
        const targetKey = key as unknown as keyof T
        this.regs.set(lazyKey as unknown as keyof T, {
          kind: 'transient',
          lazy: kind === 'singleton',
          fn: (c) => ({get: () => c.getAsync(targetKey as never)} as unknown as T[keyof T]['type']),
          owned: false
        })
      }

      return this
    }

    /*
     * Arity unrolling. V8 JITs a direct `new Ctor(a, b)` with an inline cache keyed on
     * Ctor's shape; Reflect.construct goes through a runtime stub, ArrayLike iteration,
     * and is not inlined. We cover 0..7 args via direct calls — this is ≥99% of real
     * classes in DI. The tail (8+) falls back to Reflect.construct, preserving type
     * safety (Reflect.construct is typed via ArrayLike, no unsound `args as unknown as A` cast).
     *
     * Additionally, the 0-ary path saves an allocation: no array, no closure over keys
     */
    let fn: (c: Container<T>) => V

    /*
     * Non-null assertions on keys[N] are safe: each branch is guarded by `len === N`,
     * and `keys` is a tuple of length `len`. The `!` is there to satisfy the compiler
     * under noUncheckedIndexedAccess without paying for runtime checks the JIT cannot
     */
    if (len === 0) {
      fn = () => new (Ctor as unknown as new () => V)()
    } else if (len === 1) {
      const k0 = keys[0]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown) => V)(c.get(k0 as never))
    } else if (len === 2) {
      const k0 = keys[0]!, k1 = keys[1]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown) => V)(
        c.get(k0 as never), c.get(k1 as never)
      )
    } else if (len === 3) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown) => V)(
        c.get(k0 as never), c.get(k1 as never),
        c.get(k2 as never)
      )
    } else if (len === 4) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown) => V)(
        c.get(k0 as never), c.get(k1 as never),
        c.get(k2 as never), c.get(k3 as never)
      )
    } else if (len === 5) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!, k4 = keys[4]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown) => V)(
        c.get(k0 as never), c.get(k1 as never),
        c.get(k2 as never), c.get(k3 as never),
        c.get(k4 as never)
      )
    } else if (len === 6) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!, k4 = keys[4]!, k5 = keys[5]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown) => V)(
        c.get(k0 as never), c.get(k1 as never),
        c.get(k2 as never), c.get(k3 as never),
        c.get(k4 as never), c.get(k5 as never)
      )
    } else if (len === 7) {
      const k0 = keys[0]!, k1 = keys[1]!, k2 = keys[2]!, k3 = keys[3]!, k4 = keys[4]!, k5 = keys[5]!, k6 = keys[6]!
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown) => V)(
        c.get(k0 as never), c.get(k1 as never),
        c.get(k2 as never), c.get(k3 as never),
        c.get(k4 as never), c.get(k5 as never),
        c.get(k6 as never)
      )
    } else {
      /*
       * Tail: 8+ deps. Start from an empty array and push — V8 keeps the array as
       * PACKED_ELEMENTS kind. `new Array(len)` + `args[i] = ...` would create a HOLEY
       * array, which V8 only transitions to PACKED after full filling, and Reflect.construct
       * on the intermediate HOLEY runs slightly slower
       */
      fn = (c) => {
        const args: unknown[] = []

        for (let i = 0; i < len; i++) {
          args.push(c.get(keys[i]! as never))
        }

        return Reflect.construct(Ctor, args)
      }
    }

    /*
     * Property order {kind, lazy, fn, owned} is deliberately uniform across every
     * register* call site so V8 hands the same Hidden Class / Shape to all
     * Registration objects in `regs`. That keeps the inline cache on
     * `localReg.kind` and `localReg.lazy` reads in `get()` MONOMORPHIC instead
     * of falling into a polymorphic cache after a couple of differently-shaped
     * objects flow through the same call site. `lazy: false` is set
     * explicitly even for non-lazy entries — paying a single boolean field
     * per registration is far cheaper than a PIC bucket miss on the hot path
     */
    this.regs.set(key as keyof T, {kind, lazy: false, fn, owned: true} as Registration<T, keyof T>)

    if (this.strict) {
      this.cache.delete(key as unknown as keyof T)
    }

    /*
     * Lazy alias: a thin { get } wrapper on top of the sync key. The instance itself
     * is not created until the consumer calls .get(). The wrapper is transient — it
     * takes the container in which it was requested, so scoped targets work correctly
     * when the wrapper is obtained in the right scope (e.g. a scoped consumer
     * injecting Lazy<otherScoped>).
     *
     * INVARIANT: fn must NOT call c.get(key) while building the wrapper — only return a closure.
     * The deferral is what makes Lazy<singleton> safe to inject into a singleton: at
     * the time the singleton factory runs, no resolution against the wrapped target
     * happens, so no short-lived value can be captured.
     *
     * LIFETIME GUARD: `lazy: true` excludes the companion from the singleton lifetime
     * check (see Registration.lazy and the runtime guards in get() / resolveWithOwnerAndReg).
     * It is set ONLY when the target kind is `'singleton'`. For non-singleton targets,
     * the companion stays `lazy: false` and is rejected as a regular transient if a
     * singleton consumer tries to inject it via an `as`-cast bypass. The compile-time
     * `AllowedDeps<T, 'singleton'>` filter (via `LazySpec<V, 'singleton'>`) is the
     * primary protection; this runtime flag is defense-in-depth.
     *
     * NOTE (captured scope): `c` is captured at the moment the lazy wrapper is RESOLVED,
     * not at the moment .get() is called. If you store the wrapper and call .get() later
     * from a different context — the resolve still goes through the original container.
     * This is predictable, but it is "captured scope", not "dynamic scope"
     */
    if (lazyKey !== undefined) {
      const targetKey = key as unknown as keyof T
      /*
       * Same {kind, lazy, fn, owned} order as the eager registration above — keeps
       * the Shape monomorphic across regular and lazy-companion entries
       */
      this.regs.set(lazyKey as unknown as keyof T, {
        kind: 'transient',
        lazy: kind === 'singleton',
        fn: (c) => ({get: () => c.get(targetKey as never)} as unknown as T[keyof T]['type']),
        owned: false
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
   * Passing a `lazyKey` additionally registers a `Lazy<V>` wrapper under that
   * companion identifier, with the same lifetime-preserving behavior as
   * {@link Container.registerClass}.
   *
   * A factory that reads scope inputs must use the deps-aware overload:
   * `registerFactory(key, deps, factory, kind)`. The tuple declares type-level
   * edges and limits the callback to a resolver-only view of those keys. InferDI
   * does not resolve the tuple into callback arguments at runtime.
   *
   * @template K - The string-or-symbol key to register the factory under. Must not be already registered.
   * @template V - The return type of the factory.
   * @template Kind - The literal {@link RegistrationKind} of this registration.
   * @template LK - The string-or-symbol companion key for the optional `Lazy<V>` wrapper.
   *
   * @param key - The unique string-or-symbol identifier for this dependency.
   * @param factory - A function that takes the (narrowed) current container and returns the instance.
   * @param kind - The lifetime of the instance: `'singleton'` (default), `'scoped'`, or `'transient'`.
   * @param lazyKey - Optional companion key (string or symbol). When provided, registers a
   *                  `Lazy<V>` wrapper under that key. Must differ from `key` and from any
   *                  already-registered key.
   * @returns A new container reference typed with the additionally registered key(s).
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
   * // registerFactory keeps a returned Promise as the sync service value.
   * // Use registerAsyncFactory when dependent classes should receive the
   * // resolved service and the graph should expose its final type.
   * const c = new Container()
   *   .registerValue('dsn', 'postgres://localhost/app')
   *   .registerFactory('db', async (c) => {
   *     const pool = new Pool({ connectionString: c.get('dsn') })
   *     await pool.connect()
   *     return pool
   *   })
   * const db = await c.get('db')
   * ```
   *
   * @example
   * ```ts
   * const root = new Container()
   *   .declareScopeInputs<{auth: AuthContext}>()
   *   .registerFactory(
   *     'userId',
   *     ['auth'],
   *     (c) => c.get('auth').userId,
   *     'scoped'
   *   )
   * ```
   */
  public registerFactory<
    const K extends string | symbol,
    V
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (c: Container<AllowedDeps<T, 'singleton'>>) => V,
    kind?: undefined
  ): Container<T & Record<K, Spec<V, 'singleton'>>>

  public registerFactory<
    const K extends string | symbol,
    V,
    const Kind extends RegistrationKind
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (c: Container<AllowedDeps<T, Kind>>) => V,
    kind: Kind
  ): Container<T & Record<K, Spec<V, Kind>>>

  public registerFactory<
    const K extends string | symbol,
    V,
    const LK extends string | symbol
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (c: Container<AllowedDeps<T, 'singleton'>>) => V,
    kind: undefined,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<T & Record<K, Spec<V, 'singleton'>> & Record<LK, LazySpec<V, 'singleton'>>>

  public registerFactory<
    const K extends string | symbol,
    V,
    const Kind extends RegistrationKind,
    const LK extends string | symbol
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (c: Container<AllowedDeps<T, Kind>>) => V,
    kind: Kind,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<T & Record<K, Spec<V, Kind>> & Record<LK, LazySpec<V, Kind>>>

  public registerFactory<
    const K extends string | symbol,
    V,
    const D extends readonly FactoryDependencyKeys<T, 'singleton'>[]
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    deps: D & RejectAsyncDeps<T, D>,
    factory: (
      c: FactoryResolver<
        FactorySelection<AllowedDeps<T, 'singleton'>, D>
      >
    ) => V,
    kind?: undefined
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<Spec<V, 'singleton'>, T, D>
    >
  >

  public registerFactory<
    const K extends string | symbol,
    V,
    const Kind extends RegistrationKind,
    const D extends readonly FactoryDependencyKeys<T, Kind>[]
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    deps: D & RejectAsyncDeps<T, D>,
    factory: (
      c: FactoryResolver<FactorySelection<AllowedDeps<T, Kind>, D>>
    ) => V,
    kind: Kind
  ): Container<
    T & Record<K, WithRequirementsOfDeps<Spec<V, Kind>, T, D>>
  >

  public registerFactory<
    const K extends string | symbol,
    V,
    const LK extends string | symbol,
    const D extends readonly FactoryDependencyKeys<T, 'singleton'>[]
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    deps: D & RejectAsyncDeps<T, D>,
    factory: (
      c: FactoryResolver<
        FactorySelection<AllowedDeps<T, 'singleton'>, D>
      >
    ) => V,
    kind: undefined,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<Spec<V, 'singleton'>, T, D>
    > & Record<
      LK,
      WithRequirementsOfDeps<LazySpec<V, 'singleton'>, T, D>
    >
  >

  public registerFactory<
    const K extends string | symbol,
    V,
    const Kind extends RegistrationKind,
    const LK extends string | symbol,
    const D extends readonly FactoryDependencyKeys<T, Kind>[]
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    deps: D & RejectAsyncDeps<T, D>,
    factory: (
      c: FactoryResolver<FactorySelection<AllowedDeps<T, Kind>, D>>
    ) => V,
    kind: Kind,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<
    T & Record<K, WithRequirementsOfDeps<Spec<V, Kind>, T, D>> &
    Record<LK, WithRequirementsOfDeps<LazySpec<V, Kind>, T, D>>
  >

  public registerFactory(
    key: string | symbol,
    depsOrFactory: readonly (string | symbol)[] | ((c: any) => any),
    factoryOrKind?: ((c: any) => any) | RegistrationKind,
    kindOrLazyKey?: RegistrationKind | string | symbol,
    depsLazyKey?: string | symbol
  ): any {
    if (this._disposed) {
      throw new Error(`Cannot register on a disposed container (key: "${String(key)}")`)
    }

    const depsAware = Array.isArray(depsOrFactory)
    const factory = (depsAware ? factoryOrKind : depsOrFactory) as (c: any) => any
    const kind = ((depsAware ? kindOrLazyKey : factoryOrKind) ?? 'singleton') as RegistrationKind
    const lazyKey = depsAware ? depsLazyKey : kindOrLazyKey as string | symbol | undefined

    this.regs.set(
      key as unknown as keyof T,
      {
        kind,
        lazy: false,
        fn: factory as unknown as (c: Container<T>) => T[keyof T]['type'],
        owned: true
      }
    )

    if (this.strict) {
      this.cache.delete(key as unknown as keyof T)
    }

    if (lazyKey !== undefined) {
      const targetKey = key as unknown as keyof T
      /*
       * Preserve the registerClass companion contract: resolution is deferred,
       * the requesting container is captured, and only singleton targets receive
       * the runtime lifetime-guard exemption
       */
      this.regs.set(lazyKey as unknown as keyof T, {
        kind: 'transient',
        lazy: kind === 'singleton',
        fn: (c) => ({get: () => c.get(targetKey as never)} as unknown as T[keyof T]['type']),
        owned: false
      })
    }

    return this
  }

  /**
   * Registers a declarative async factory with positional dependencies. The
   * type-level graph stores the final service type, while singleton and scoped
   * registrations cache one native Promise for single-flight initialization.
   * Async dependencies are awaited before the factory runs; ordinary
   * Promise-valued sync registrations are passed through unchanged.
   * Passing a fifth `lazyKey` registers an {@link AsyncLazy} companion whose
   * `.get()` resolves through the container and therefore preserves target
   * lifetime, single-flight, overrides, and captured-scope behavior.
   *
   * The `deps` tuple is retained by reference. It must be readonly because
   * async dependency positions are classified once during registration.
   *
   * @example
   * ```ts
   * const c = new Container()
   *   .registerValue('config', {url: 'postgres://localhost/app'})
   *   .registerAsyncFactory(
   *     'db',
   *     async (config) => Database.connect(config.url),
   *     ['config']
   *   )
   *
   * const db = await c.getAsync('db')
   * ```
   */
  public registerAsyncFactory<
    const K extends string | symbol,
    A extends readonly unknown[],
    R,
    const D extends DepsOf<AllowedDeps<T, 'singleton'>, A> = DepsOf<AllowedDeps<T, 'singleton'>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (...args: A) => R,
    deps: D & RequireReadonlyDeps<D>,
    kind?: undefined
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<AsyncSpec<Awaited<R>, 'singleton'>, T, D>
    >
  >

  public registerAsyncFactory<
    const K extends string | symbol,
    A extends readonly unknown[],
    R,
    const Kind extends RegistrationKind,
    const D extends DepsOf<AllowedDeps<T, Kind>, A> = DepsOf<AllowedDeps<T, Kind>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (...args: A) => R,
    deps: D & RequireReadonlyDeps<D>,
    kind: Kind
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<AsyncSpec<Awaited<R>, Kind>, T, D>
    >
  >

  public registerAsyncFactory<
    const K extends string | symbol,
    A extends readonly unknown[],
    R,
    const LK extends string | symbol,
    const D extends DepsOf<AllowedDeps<T, 'singleton'>, A> = DepsOf<AllowedDeps<T, 'singleton'>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (...args: A) => R,
    deps: D & RequireReadonlyDeps<D>,
    kind: undefined,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<AsyncSpec<Awaited<R>, 'singleton'>, T, D>
    > & Record<
      LK,
      WithRequirementsOfDeps<AsyncLazySpec<Awaited<R>, 'singleton'>, T, D>
    >
  >

  public registerAsyncFactory<
    const K extends string | symbol,
    A extends readonly unknown[],
    R,
    const Kind extends RegistrationKind,
    const LK extends string | symbol,
    const D extends DepsOf<AllowedDeps<T, Kind>, A> = DepsOf<AllowedDeps<T, Kind>, A>
  >(
    key: K & ([K] extends [keyof T] ? never : unknown),
    factory: (...args: A) => R,
    deps: D & RequireReadonlyDeps<D>,
    kind: Kind,
    lazyKey: LK & ([LK] extends [keyof T | K] ? never : unknown)
  ): Container<
    T & Record<
      K,
      WithRequirementsOfDeps<AsyncSpec<Awaited<R>, Kind>, T, D>
    > & Record<
      LK,
      WithRequirementsOfDeps<AsyncLazySpec<Awaited<R>, Kind>, T, D>
    >
  >

  public registerAsyncFactory(
    key: string | symbol,
    factory: (...args: any[]) => unknown,
    deps: readonly (string | symbol)[],
    kind: RegistrationKind = 'singleton',
    lazyKey?: string | symbol
  ): any {
    if (this._disposed) {
      throw new Error(`Cannot register on a disposed container (key: "${String(key)}")`)
    }

    const keys = deps as readonly (keyof T)[]
    const asyncIndices = this.asyncDependencyIndices(keys) ?? []

    this.regs.set(key as keyof T, {
      kind,
      lazy: false,
      fn: ((c: Container<T>) => c.resolveAsyncDependencies(
        keys,
        asyncIndices,
        (args) => factory(...args)
      )) as unknown as (c: Container<T>) => T[keyof T]['type'],
      owned: true,
      async: true
    })

    if (this.strict) {
      this.cache.delete(key as keyof T)
    }

    if (lazyKey !== undefined) {
      const targetKey = key as unknown as keyof T
      this.regs.set(lazyKey as unknown as keyof T, {
        kind: 'transient',
        lazy: kind === 'singleton',
        fn: (c) => ({get: () => c.getAsync(targetKey as never)} as unknown as T[keyof T]['type']),
        owned: false
      })
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
    value: V
  ): Container<T & Record<K, Spec<V, 'singleton'>>> {
    if (this._disposed) {
      throw new Error(`Cannot register on a disposed container (key: "${String(key)}")`)
    }

    // The value is external — it does not enter `owned`, dispose is not called on it
    this.cache.set(key as unknown as keyof T, value === undefined ? UNDEFINED_MARKER : value)
    /*
     * The factory is unreachable at runtime: cache.set above always wins the
     * fast-path in get(). The Registration is
     * kept for shape-uniformity with registerClass/registerFactory.
     * v8-ignore on the lambda body avoids a phantom branch
     */
    this.regs.set(
      key as unknown as keyof T,
      /* v8 ignore next */
      {kind: 'singleton', lazy: false, fn: () => value as unknown as T[keyof T]['type'], owned: false}
    )

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
  public override<K extends RegistrationKeys<T>>(key: K, value: T[K]['type']): this {
    if (this._disposed) {
      throw new Error(`Cannot override on a disposed container (key: "${String(key)}")`)
    }
    /*
     * Strict Runtime Guard: refuse late overrides. If `cache.has(key)` is true,
     * the original was already resolved (or eagerly seeded by registerValue) on
     * this container — replacing it now would split the dependency graph
     * (existing consumers keep the old ref; future resolves see the mock)
     */
    if (this.cache.has(key)) {
      throw new Error(
        `Cannot override "${String(key)}" because it has already been resolved. ` +
          `Overrides must be applied before any .get() calls to ensure clean dependency graphs and prevent resource leaks.`
      )
    }
    /*
     * Walk-up the scope chain to find the original kind and lazy flag. The
     * override is written LOCALLY (in this.regs) with both fields copied from
     * the original — preserving the lifetime graph across
     * `root.createScope().override('db', mock)` and, crucially, the lazy-exempt
     * marker on `Lazy<singleton>` companions (registered with `lazy: true`).
     * Without copying `lazy`, an override on a `Lazy<singleton>` companion
     * would write `lazy: false`, and the next singleton consumer that injects
     * the companion would trip the strict-mode lifetime guard
     * (kind='transient', lazy=false → guarded) — i.e. the mock would never
     * reach the consumer. A key not found anywhere is a misconfiguration;
     * surface it eagerly rather than silently materializing a singleton from
     * nothing
     */
    let cur: Container<T> | undefined = this
    let existingKind: RegistrationKind | undefined
    let existingLazy = false
    let existingAsync: true | undefined
    while (cur !== undefined) {
      const existing = cur.regs.get(key)
      if (existing !== undefined) {
        existingKind = existing.kind
        existingLazy = existing.lazy
        existingAsync = existing.async
        break
      }
      cur = cur.parent
    }
    if (existingKind === undefined) {
      throw new Error(`Cannot override "${String(key)}": key is not registered`)
    }

    this.cache.set(key, value === undefined ? UNDEFINED_MARKER : value)
    /*
     * Stored with the inherited kind and lazy flag. The seeded cache handles
     * local resolution; descendants may call the factory for scoped/transient
     * overrides, where it returns the same externally owned value. The field
     * order stays uniform with every other Registration
     */
    if (existingAsync === true) {
      this.regs.set(
        key,
        /* v8 ignore next */
        {
          kind: existingKind,
          lazy: existingLazy,
          fn: () => value as unknown as T[keyof T]['type'],
          owned: false,
          async: true
        }
      )
    } else {
      this.regs.set(
        key,
        /* v8 ignore next */
        {kind: existingKind, lazy: existingLazy, fn: () => value as unknown as T[keyof T]['type'], owned: false}
      )
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
   * Declared scope inputs may be supplied as a partial record. A nested child
   * inherits inputs already supplied to its parent and may add missing inputs.
   * Input values are shallow-snapshotted into the child cache and remain
   * application-owned.
   *
   * Each scope owns the instances it creates and disposes them when the scope
   * itself is disposed (`using` / `await using` / explicit `.dispose()`).
   *
   * @throws {Error} If this container has already been disposed.
   * @param inputs - Missing scope inputs to provide on the new child.
   * @returns A new child container with an isolated cache and the provided
   *          input requirements removed from its type-state.
   *
   * @example
   * ```ts
   * async function handle(req: Request) {
   *   await using scope = root.createScope()
   *   const ctx = scope.get('reqCtx')   // cached on this scope only
   * }
   * ```
   */
  public createScope<const Inputs extends object>(
    inputs: NoExtraKeys<Inputs, MissingInputKeys<T>> & Partial<InputValues<T>>
  ): Container<
    Provide<T, Extract<RequiredKeys<Inputs>, string | symbol>>
  >
  public createScope(): Container<T>
  public createScope(inputs?: Record<string | symbol, unknown>): any {
    if (this._disposed) {
      throw new Error('Cannot create scope from a disposed container')
    }

    const child = new Container<T>(this)
    const values = inputs === undefined
      ? this.scopeInputs
      : this.scopeInputs === undefined
        ? {...inputs}
        : {...this.scopeInputs, ...inputs}

    if (values !== undefined) {
      const keys = Reflect.ownKeys(values)

      if (keys.length !== 0) {
        child.scopeInputs = values

        for (const key of keys) {
          const value = values[key]
          child.cache.set(
            key as keyof T,
            value === undefined ? UNDEFINED_MARKER : value
          )
        }
      }
    }

    return child
  }

  /**
   * Resolves a registered service by key with full type safety. Strict scopes
   * walk the parent chain to find the registration; Fast Mode scopes read their
   * immutable registry owner directly. The registered lifetime
   * (singleton / scoped / transient) is honoured in both modes.
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
  public get<K extends ReadyKeysOf<T>>(
    key: K & RejectAsyncKey<T, K>
  ): T[K]['type']
  public get<K extends SyncReadyKeysOf<T>>(key: K): T[K]['type']
  public get<K extends ReadyKeysOf<T>>(key: K): T[K]['type'] {
    /*
     * 1. Hot path: local cache hit.
     *    Single Map.get covers ≥99.9% of resolves. `UNDEFINED_MARKER` covers the
     *    rare deliberately-registered `undefined`. Note that `_disposed` is checked
     *    AFTER the cache lookup — dispose() clears `cache`, so a disposed container
     *    falls through to the precise diagnostic below
     */
    const cached = this.cache.get(key)

    if (cached !== undefined) {
      return (cached === UNDEFINED_MARKER ? undefined : cached) as T[K]['type']
    }

    if (this._disposed) {
      throw new Error(`Container is disposed (key: "${String(key)}")`)
    }

    /*
     * Fast scopes point directly at the immutable registry owner. Bypass the
     * guaranteed-empty local registry and parent walk. Delegated singletons are
     * mirrored into the scope cache after the first resolve, but remain owned and
     * disposed exclusively by the registry owner
     */
    if (!this.strict && this.parent !== undefined) {
      const owner = this.parent
      const reg = owner.regs.get(key) as Registration<T, K> | undefined

      if (reg === undefined) {
        if (owner._disposed) {
          throw new Error(`Ancestor container is disposed (key: "${String(key)}")`)
        }

        throw new Error(`Key "${String(key)}" not found`)
      }

      if (reg.kind === 'transient') {
        return reg.fn(this)
      }

      const target = reg.kind === 'singleton' ? owner : this
      const instance = this.resolveWithOwnerAndReg(target, reg, key)

      if (reg.kind === 'singleton') {
        this.cache.set(key, instance === undefined ? UNDEFINED_MARKER : instance)
      }

      return instance
    }

    /*
     * 2. Local fast-path: registration on THIS container.
     *    Most common case in flat (non-scope-tree) DI graphs and in scope-tree DI
     *    for child-owned services. Skips the parent-chain walk
     */
    const localReg = this.regs.get(key) as Registration<T, K> | undefined

    if (localReg !== undefined) {
      if (localReg.kind === 'transient') {
        if (this.strict) {
          if (!localReg.lazy && this.singletonStack.length > 0) {
            const parent = this.singletonStack[this.singletonStack.length - 1]!
            throw new Error(
              `Singleton "${String(parent)}" cannot depend on transient "${String(key)}". ` +
              `Use Lazy<T> (register with a lazyKey companion) to get a fresh instance per access.`
            )
          }

          if (this.resolving.includes(key)) {
            const chain = [...this.resolving, key].map((k) => String(k)).join(' -> ')
            throw new Error(
              `Circular dependency detected: ${chain}. ` +
              `Consider breaking the cycle with Lazy<T> (register one side with a lazyKey ` +
              `companion and inject that companion key instead).`
            )
          }

          this.resolving.push(key)

          try {
            return localReg.fn(this)
          } finally {
            this.resolving.pop()
          }
        }

        /*
         * strict=false hot path: no cycle bookkeeping, no try/finally, no lifetime
         * check. Just call the factory. Caller-owned by transient contract
         */
        return localReg.fn(this)
      }

      if (localReg.kind === 'scoped' && this.strict && this.parent === undefined) {
        throw new Error(
          `Scoped "${String(key)}" cannot be resolved from the root container. ` +
          `Use createScope().`
        )
      }

      // Self-resolve: owner === this for every kind, so target === this
      return this.resolveWithOwnerAndReg(this, localReg, key)
    }

    // 3. Strict-mode walk-up across the exact parent chain
    let owner: Container<T> | undefined
    let reg: Registration<T, K> | undefined

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

    /*
     * Cold error path: nothing was found anywhere up the chain. Before throwing the
     * generic "Key not found", surface a more actionable message if any ancestor was
     * already disposed. dispose() runs `regs.clear()` + `cache.clear()`, so the lookup
     * above silently slides past a disposed ancestor as if the key were missing — that
     * hides a real bug ("you are reaching into a torn-down container") behind a
     * misleading "Key not found". The extra walk is safe to do here because we are
     * already on the error path; the hot path is untouched
     */
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

    /*
     * 4. Dispatch to the shared resolver.
     *    - singleton: instance lives on `owner`, even when `this !== owner`. Factory
     *      receives `owner` so the singleton's deps resolve through owner-scope —
     *      preserves lifetime guard and prevents child-scope from masking deps.
     *    - scoped:    one instance per `this` scope (caller-side ownership).
     *    - transient: caller-owned, never cached
     */
    const target = reg.kind === 'singleton' ? (owner as Container<T>) : this
    return this.resolveWithOwnerAndReg(target, reg, key)
  }

  /**
   * Resolves a ready sync or declarative async registration and always returns
   * a Promise. Synchronous lookup, cycle, lifetime, and disposal failures are
   * converted into rejections. Promise-valued sync services follow ordinary
   * JavaScript await semantics at this top-level boundary.
   *
   * @example
   * ```ts
   * const c = new Container()
   *   .registerAsyncFactory('db', loadDatabase, [])
   *
   * const db = await c.getAsync('db')
   * ```
   */
  public getAsync<K extends ReadyKeysOf<T>>(
    key: K
  ): Promise<Awaited<T[K]['type']>> {
    try {
      return Promise.resolve(this.get(key as never)) as Promise<
        Awaited<T[K]['type']>
      >
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * Type-guard predicate: returns `true` if `key` is registered on this
   * container or any ancestor scope, `false` otherwise. Strict scopes walk the
   * parent chain; Fast Mode scopes already point directly at their immutable
   * registry owner. Like a strict `.get()` miss, strict `.has()` walks the exact
   * parent chain.
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
   * Note that calling `.has(k)` immediately before `.get(k)` repeats the
   * registration lookup. For statically-known keys (the common case), prefer a
   * direct `.get()` — TypeScript already rejects unknown keys at compile time.
   * The type-guard is intended for genuinely dynamic key construction.
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

  /*
   * Shared resolution path used both for self-resolves (owner === this) and for
   * delegated singleton resolves (owner !== this). The split avoids the previous
   * `owner.get(key)` re-entry, which paid for a full second walk-up on every
   * singleton resolve from a child scope
   */
  /** @internal */
  private resolveWithOwnerAndReg<K extends keyof T>(
    target: Container<T>,
    reg: Registration<T, K>,
    key: K
  ): T[K]['type'] {
    /*
     * Cache check on the owning container. For self-resolves the get() hot-path
     * already cleared `this.cache`, so this branch is reachable only when the
     * singleton is delegated from a child scope (this !== target). `target !== this`
     * already implies `reg.kind === 'singleton'` by the dispatch in get().
     * Unconditional because it serves correctness (avoid re-running a singleton
     * factory) — not a "guard" that strict-mode would gate
     */
    if (target !== this) {
      const cached = target.cache.get(key)

      if (cached !== undefined) {
        return (cached === UNDEFINED_MARKER ? undefined : cached) as T[K]['type']
      }
    }

    if (this.strict) {
      /*
       * Lifetime guard — short-lived dep inside a long-lived (singleton) factory.
       * `singletonStack.length > 0` is a cheap integer field-access; the rest of the
       * condition only runs inside an active singleton resolution. Defense-in-depth:
       * the v3 compile-time guard via AllowedDeps is the primary protection, but
       * `as`-cast bypasses and dynamically-built registrations need a runtime floor
       * with a key-naming error message. Opt out via `new Container({ strict: false })`
       */
      if (!reg.lazy && (reg.kind === 'scoped' || reg.kind === 'transient') && this.singletonStack.length > 0) {
        const parent = this.singletonStack[this.singletonStack.length - 1]!
        throw new Error(
          `Singleton "${String(parent)}" cannot depend on ${reg.kind} "${String(key)}". ` +
          `Use Lazy<T> (register with a lazyKey companion) to get a fresh instance per access.`
        )
      }

      // Cycle detection — needed for ALL kinds (incl. transient<->transient)
      if (this.resolving.includes(key)) {
        const chain = [...this.resolving, key].map((k) => String(k)).join(' -> ')
        throw new Error(
          `Circular dependency detected: ${chain}. ` +
          `Consider breaking the cycle with Lazy<T> (register one side with a lazyKey ` +
          `companion and inject that companion key instead).`
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

          if (reg.owned) {
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

    /*
     * strict=false bare path: drop cycle bookkeeping, the singleton-stack
     * push/pop, and the surrounding try/finally. Transients return directly
     * from get(), so this path always caches a singleton or scoped instance.
     * A real cycle here loops the call stack until V8 throws RangeError
     */
    const instance = reg.fn(target)
    target.cache.set(key, instance === undefined ? UNDEFINED_MARKER : instance)

    if (reg.owned) {
      target.owned.push(instance)
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

  /*
   * Preserve exactly-once teardown and first-creation LIFO order without an O(n)
   * identity scan on every owned-instance creation. Replace the live queue before
   * compaction so re-entrant work observes an already-empty container-owned list
   */
  /** @internal */
  private takeOwnedInstances(): readonly (DisposableLike | null | undefined)[] {
    const instances = this.owned
    this.owned = []

    if (instances.length < 2) {
      return instances as readonly (DisposableLike | null | undefined)[]
    }

    const seen = new Set<unknown>()
    let write = 0

    for (let read = 0; read < instances.length; read++) {
      const instance = instances[read]

      if (seen.has(instance)) {
        continue
      }

      seen.add(instance)
      instances[write++] = instance
    }

    instances.length = write
    return instances as readonly (DisposableLike | null | undefined)[]
  }

  /**
   * Async teardown. Walks created instances in reverse order (LIFO), trying
   * Symbol.asyncDispose → Symbol.dispose → plain .dispose().
   * Promises cached by async factories are awaited first, and the probe runs
   * against the resolved instance; a rejection joins the same error stream.
   * Errors do not break the chain — they are collected and re-thrown as an
   * AggregateError at the end, so a single failing resource does not leave the
   * rest unclosed. Concurrent calls while teardown is active share the same
   * completion Promise; repeated calls after teardown are a no-op.
   */
  public dispose(): Promise<void> {
    if (this.disposePromise !== undefined) {
      return this.disposePromise
    }

    if (this._disposed) {
      return Promise.resolve()
    }

    this._disposed = true

    // Snapshot in LIFO order
    const instances = this.takeOwnedInstances()

    /*
     * Clear state BEFORE invoking disposers: re-entrancy safety (if a disposer tries
     * to resolve something — it will already see the disposed state) plus releasing
     * factory closures that hold Ctor/deps/factory and parent objects
     */
    this.cache.clear()
    this.regs.clear()
    this.scopeInputs = undefined
    /*
     * Detach the parent: otherwise an externally-held reference to a disposed scope
     * would keep the entire parent chain (root and all of its caches/factories) from GC
     */
    this.parent = undefined

    if (instances.length === 0) {
      return Promise.resolve()
    }

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
      }
    )
    return promise
  }

  /** @internal */
  private async disposeInstances(
    instances: readonly (DisposableLike | null | undefined)[]
  ): Promise<void> {
    let errors: unknown[] | undefined
    const disposedInstances = instances.length > 1 ? new Set<unknown>() : undefined

    for (let i = instances.length - 1; i >= 0; i--) {
      let inst = instances[i] as DisposableLike | PromiseLike<DisposableLike | null | undefined> | null | undefined

      // Factories may intentionally return null or undefined
      if (inst == null) {
        continue
      }

      try {
        /*
         * Async factories cache a Promise in `owned`. Unwrap it before the
         * disposer probe so the resolved instance's [Symbol.asyncDispose] /
         * [Symbol.dispose] / .dispose() actually fires. A rejection here
         * throws into the same `errors.push(err)` path as a throwing disposer.
         * Duck-typed `.then` matches any PromiseLike — not bound to the global
         * Promise so polyfills and custom thenables also unwrap
         */
        if (typeof (inst as { then?: unknown }).then === 'function') {
          inst = await (inst as PromiseLike<DisposableLike | null | undefined>)
          if (inst == null) continue
        }

        /*
         * Distinct async factories may return different Promise objects that
         * resolve to the same resource. Deduplicate after unwrapping as well as
         * at enqueue time so a shared resource is closed exactly once
         */
        if (disposedInstances !== undefined) {
          if (disposedInstances.has(inst)) continue
          disposedInstances.add(inst)
        }

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
        (errors ??= []).push(err)
      }
    }

    if (errors === undefined) {
      return
    }

    if (errors.length === 1) {
      throw errors[0]
    }

    throw new AggregateError(errors, 'Container.dispose: multiple teardown errors')
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

    const instances = this.takeOwnedInstances()

    this.cache.clear()
    this.regs.clear()
    this.scopeInputs = undefined
    /*
     * Detach the parent: otherwise an externally-held reference to a disposed scope
     * would keep the entire parent chain (root and all of its caches/factories) from GC
     */
    this.parent = undefined

    if (instances.length === 0) {
      return
    }

    let errors: unknown[] | undefined

    for (let i = instances.length - 1; i >= 0; i--) {
      const inst = instances[i]

      // Factories may intentionally return null or undefined
      if (inst == null) {
        continue
      }

      try {
        /*
         * A Promise cached from an async factory cannot be awaited synchronously.
         * Record the misuse — sync teardown is the wrong protocol here. The resource
         * will not be closed; correct usage is `await using` / container.dispose().
         * We deliberately do not fire a background cleanup: that would amount to
         * "silently fix the misuse", which hides the bug
         */
        if (typeof (inst as { then?: unknown }).then === 'function') {
          (errors ??= []).push(new Error(
            `Sync [Symbol.dispose] called on a container that cached a Promise from an ` +
            `async factory. Use \`await using\` / container.dispose() for async teardown.`
          ))
        } else if (typeof inst[Symbol.dispose] === 'function') {
          inst[Symbol.dispose]!()
        } else if (typeof inst.dispose === 'function') {
          const r = inst.dispose()

          /*
           * If a plain .dispose() turns out to be async in a sync context — that is
           * a resource misuse (it needs `await using` / container.dispose()). Detect
           * it SYNCHRONOUSLY: a .catch goes into microtasks and would run after we
           * return from this method, so an errors.push there would lose the error
           * because the throw below already happened. We record the misuse fact right
           * now and silence the unhandledRejection from the returned promise via a
           * separate .catch(() => void).
           * r != null covers both undefined and null (typeof null === 'object').
           * Duck-typed .then catches any thenable — we do not bind to the global
           * Promise, in case of polyfills and custom PromiseLike
           */
          if (r != null && typeof (r as { then?: unknown }).then === 'function') {
            (errors ??= []).push(new Error(
              `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. ` +
              `Use \`await using\` / container.dispose() for async teardown.`
            ))
            void Promise.resolve(r).catch(() => { /* noop: error already recorded above */ })
          }
        }
      } catch (err) {
        (errors ??= []).push(err)
      }
    }

    if (errors === undefined) {
      return
    }

    if (errors.length === 1) {
      throw errors[0]
    }

    throw new AggregateError(errors, 'Container[Symbol.dispose]: multiple teardown errors')
  }

}

/**
 * Declaration merging — attaches helper types to the class as a namespace.
 * Contains utility types for extracting and unwrapping the dependency map
 * from a fully-built container.
 */
export namespace Container {
  /**
   * Extracts the keys currently resolvable through {@link Container.getAsync}.
   * Use it when writing generic resolver helpers for graphs that may contain
   * scope inputs that have not been provided yet.
   *
   * @example
   * ```ts
   * function resolve<
   *   T extends DependenciesMap,
   *   K extends Container.ReadyKeys<Container<T>>
   * >(container: Container<T>, key: K) {
   *   return container.getAsync(key)
   * }
   * ```
   */
  export type ReadyKeys<C> = C extends Container<infer U>
    ? ReadyKeysOf<U>
    : never

  /**
   * Extracts ready synchronous keys accepted by {@link Container.get}. Async
   * registrations and entries with missing scope inputs are excluded.
   *
   * @example
   * ```ts
   * function resolveSync<
   *   T extends DependenciesMap,
   *   K extends Container.SyncReadyKeys<Container<T>>
   * >(container: Container<T>, key: K) {
   *   return container.get(key)
   * }
   * ```
   */
  export type SyncReadyKeys<C> = C extends Container<infer U>
    ? SyncReadyKeysOf<U>
    : never

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
   * Like {@link Resolve}, but distributively unwraps managed {@link Lazy} and
   * {@link AsyncLazy} companion entries back to their target type. Ordinary
   * manually registered wrapper values remain wrapped.
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
        [K in keyof U]: UnwrapSpec<U[K]>
      }
    : never

  /**
   * Gets the **unwrapped** service type (without the `Lazy<>` envelope) by key.
   * For non-lazy keys this equals `Resolve<C>[K]`; for keys registered as
   * managed `Lazy<T>` or `AsyncLazy<T>` it returns `T`.
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
   *   now: () => 0
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
    ? { [K in RegistrationKeys<U>]: () => U[K]['type'] }
    : never
}
