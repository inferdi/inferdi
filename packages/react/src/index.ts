'use client'

/**
 * React 19 contexts, service hooks and managed child scopes for InferDI.
 *
 * @module
 */

import {
  createContext,
  createElement,
  use,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentType,
  type Key,
  type ReactNode
} from 'react'
import type {Container} from '@inferdi/inferdi'

/** A value of type `T` or a Promise that resolves to it. */
export type MaybePromise<T> = T | Promise<T>

/** Minimal structural contract for a disposable managed scope. */
export interface InferdiScope {
  /** Releases resources owned by this scope. */
  dispose(): MaybePromise<void>
}

/** Structural contract for a container that creates a no-input child scope. */
export interface InferdiRoot<Scope extends InferdiScope> {
  /** Creates a fresh child scope. */
  createScope(): Scope
}

/** Extracts the child type returned by a root container. */
export type InferdiScopeOf<
  Root extends InferdiRoot<InferdiScope>
> = ReturnType<Root['createScope']>

/** Extracts the exact graph carried by a concrete InferDI container. */
export type InferdiGraphOf<C> =
  C extends Container<infer Graph> ? Graph : never

/** Resolves the service value associated with a graph key. */
export type InferdiService<
  C extends Container<InferdiGraphOf<C>>,
  K extends keyof Container.Resolve<C>
> = Container.Resolve<C>[K]

type EntryLifetime<Entry> =
  Entry extends {readonly lifetime: infer Lifetime} ? Lifetime : never

/** Ready synchronous singleton and scoped keys safe to read during render. */
export type InferdiStableSyncKey<
  C extends Container<InferdiGraphOf<C>>
> = {
  [K in Container.SyncReadyKeys<C>]:
    'transient' extends EntryLifetime<InferdiGraphOf<C>[K]> ? never : K
}[Container.SyncReadyKeys<C>]

/** Ready async-capable singleton and scoped keys safe to read with Suspense. */
export type InferdiStableAsyncKey<
  C extends Container<InferdiGraphOf<C>>
> = {
  [K in Container.ReadyKeys<C>]:
    'transient' extends EntryLifetime<InferdiGraphOf<C>[K]>
      ? never
      : Extract<
          InferdiGraphOf<C>[K],
          {readonly async: true}
        > extends never
        ? never
        : K
}[Container.ReadyKeys<C>]

/** Props for an externally owned container provider. */
export interface InferdiProviderProps<
  C extends Container<InferdiGraphOf<C>>
> {
  readonly container: C
  readonly children?: ReactNode
}

type SameGraph<Left, Right> =
  [Left] extends [Right]
    ? [Right] extends [Left]
      ? unknown
      : never
    : never

type InferdiProvider<
  C extends Container<InferdiGraphOf<C>>
> = <Actual extends Container<InferdiGraphOf<Actual>>>(
  props: Omit<InferdiProviderProps<Actual>, 'container'> & {
    readonly container: Actual & SameGraph<
      InferdiGraphOf<C>,
      InferdiGraphOf<Actual>
    >
  }
) => ReactNode

/** Shared rendering props for a managed scope provider. */
export interface InferdiScopeProviderBaseProps {
  readonly children?: ReactNode
  readonly fallback?: ReactNode
}

/** Managed scope props, with identity required when the binding has input. */
export type InferdiScopeProviderProps<Input> =
  [Input] extends [void]
    ? InferdiScopeProviderBaseProps & {
        readonly input?: never
        readonly scopeKey?: Key
      }
    : InferdiScopeProviderBaseProps & {
        readonly input: Input
        readonly scopeKey: Key
      }

/** Lifecycle operations for a managed child-scope binding. */
export interface InferdiReactScopeOptions<
  Parent extends Container<InferdiGraphOf<Parent>>,
  Scope extends Container<InferdiGraphOf<Scope>>,
  Input
> {
  readonly createScope: (parent: Parent, input: Input) => Scope
  readonly setupScope?: (
    scope: Scope,
    input: Input
  ) => MaybePromise<void>
  readonly disposeScope?: (
    scope: Scope,
    input: Input
  ) => MaybePromise<void>
  readonly onDisposeError?: (
    error: unknown,
    scope: Scope,
    input: Input
  ) => MaybePromise<void>
}

/** React context and hooks bound to one exact InferDI container type-state. */
export interface InferdiReactBinding<
  C extends Container<InferdiGraphOf<C>>
> {
  readonly Provider: InferdiProvider<C>
  readonly useContainer: () => C

  readonly useService: <K extends InferdiStableSyncKey<C>>(
    key: K
  ) => InferdiService<C, K>

  readonly useAsyncService: <K extends InferdiStableAsyncKey<C>>(
    key: K
  ) => Awaited<InferdiService<C, K>>

  readonly useAsyncServices: <
    const Keys extends readonly InferdiStableAsyncKey<C>[]
  >(
    ...keys: Keys
  ) => {
    readonly [I in keyof Keys]:
      Keys[I] extends InferdiStableAsyncKey<C>
        ? Awaited<InferdiService<C, Keys[I]>>
        : never
  }

  readonly createScope: {
    (): DefaultScopeBinding<C>

    <
      Scope extends Container<InferdiGraphOf<Scope>>,
      Input = void
    >(
      options: InferdiReactScopeOptions<C, Scope, Input>
    ): InferdiReactScopeBinding<C, Scope, Input>
  }
}

/** A child binding with a provider that owns each scope generation. */
export interface InferdiReactScopeBinding<
  Parent extends Container<InferdiGraphOf<Parent>>,
  Scope extends Container<InferdiGraphOf<Scope>>,
  Input
> extends InferdiReactBinding<Scope> {
  readonly ScopeProvider: ComponentType<InferdiScopeProviderProps<Input>>
}

type DefaultScopeBinding<
  C extends Container<InferdiGraphOf<C>>,
  Scope = InferdiScopeOf<C>
> = Scope extends Container<InferdiGraphOf<Scope>>
  ? InferdiReactScopeBinding<C, Scope, void>
  : never

type ChildOwner = {
  readonly cancel: () => void
  readonly done: Promise<void>
}

type OwnerRecord = {
  closed: boolean
  readonly children: Set<ChildOwner>
}

type InternalBinding<C extends Container<InferdiGraphOf<C>>> =
  InferdiReactBinding<C> & {
    readonly owners: WeakMap<C, OwnerRecord>
    readonly evict: (container: C) => void
  }

type Generation<Parent, Scope, Input> = {
  readonly id: number
  readonly parent: Parent
  readonly scopeKey: Key | undefined
  active: boolean
  setupSettled: boolean
  disposeStarted: boolean
  scope: Scope | undefined
  input: Input | undefined
  parentOwner: OwnerRecord | undefined
  ownerLink: ChildOwner | undefined
  finished: boolean
  afterCleanup: (() => void) | undefined
  readonly done: Promise<void>
  readonly settle: () => void
}

type ScopeState<Parent, Scope, Input> =
  | {readonly status: 'pending'; readonly generation: Generation<Parent, Scope, Input>}
  | {
      readonly status: 'ready'
      readonly generation: Generation<Parent, Scope, Input>
      readonly scope: Scope
    }
  | {
      readonly status: 'error'
      readonly generation: Generation<Parent, Scope, Input>
      readonly error: unknown
    }

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) ||
    typeof value === 'function'
  ) && typeof (value as PromiseLike<unknown>).then === 'function'
}

function safeLog(error: unknown): void {
  try {
    console.error(error)
  } catch {}
}

function createDeferred(): {readonly promise: Promise<void>; readonly resolve: () => void} {
  let resolve!: () => void
  const promise = new Promise<void>((next) => {
    resolve = next
  })
  return {promise, resolve}
}

function createBinding<
  C extends Container<InferdiGraphOf<C>>
>(): InternalBinding<C> {
  const Context = createContext<C | null>(null)
  const promiseCache = new WeakMap<C, Map<InferdiStableAsyncKey<C>, Promise<unknown>>>()
  const owners = new WeakMap<C, OwnerRecord>()

  function Provider({container, children}: InferdiProviderProps<C>) {
    return createElement(Context.Provider, {value: container}, children)
  }

  function useContainer(): C {
    const container = useContext(Context)
    if (container === null) {
      throw new Error('@inferdi/react: no matching Provider found for this binding')
    }
    return container
  }

  function getStablePromise<K extends InferdiStableAsyncKey<C>>(
    container: C,
    key: K
  ): Promise<Awaited<InferdiService<C, K>>> {
    let byKey = promiseCache.get(container)
    if (byKey === undefined) {
      byKey = new Map()
      promiseCache.set(container, byKey)
    }

    let promise = byKey.get(key)
    if (promise === undefined) {
      promise = container.getAsync(key as never) as Promise<unknown>
      void promise.catch(() => {})
      byKey.set(key, promise)
    }

    return promise as Promise<Awaited<InferdiService<C, K>>>
  }

  function useService<K extends InferdiStableSyncKey<C>>(
    key: K
  ): InferdiService<C, K> {
    const container = useContainer()
    return container.get(key as never) as unknown as InferdiService<C, K>
  }

  function useAsyncService<K extends InferdiStableAsyncKey<C>>(
    key: K
  ): Awaited<InferdiService<C, K>> {
    const container = useContainer()
    return use(getStablePromise(container, key))
  }

  function useAsyncServices<
    const Keys extends readonly InferdiStableAsyncKey<C>[]
  >(...keys: Keys): {
    readonly [I in keyof Keys]:
      Keys[I] extends InferdiStableAsyncKey<C>
        ? Awaited<InferdiService<C, Keys[I]>>
        : never
  } {
    const container = useContainer()
    const promises: Promise<unknown>[] = []
    const values: unknown[] = []

    for (const key of keys) {
      promises.push(getStablePromise(container, key))
    }
    for (const promise of promises) {
      values.push(use(promise))
    }

    return values as {
      readonly [I in keyof Keys]:
        Keys[I] extends InferdiStableAsyncKey<C>
          ? Awaited<InferdiService<C, Keys[I]>>
          : never
    }
  }

  const binding: InternalBinding<C> = {
    Provider: Provider as InferdiProvider<C>,
    useContainer,
    useService,
    useAsyncService,
    useAsyncServices,
    createScope: ((options?: InferdiReactScopeOptions<C, never, never>) =>
      createScopeBinding(binding, options)) as unknown as InferdiReactBinding<C>['createScope'],
    owners,
    evict(container) {
      promiseCache.delete(container)
    }
  }

  return binding
}

function createScopeBinding<
  Parent extends Container<InferdiGraphOf<Parent>>,
  Scope extends Container<InferdiGraphOf<Scope>>,
  Input
>(
  parentBinding: InternalBinding<Parent>,
  suppliedOptions?: InferdiReactScopeOptions<Parent, Scope, Input>
): InferdiReactScopeBinding<Parent, Scope, Input> {
  const childBinding = createBinding<Scope>()
  const options: InferdiReactScopeOptions<Parent, Scope, Input> = suppliedOptions ?? {
    createScope: (parent: Parent) =>
      (parent as unknown as InferdiRoot<Scope>).createScope()
  }

  function ScopeProvider(props: InferdiScopeProviderProps<Input>) {
    const parent = parentBinding.useContainer()
    const scopeKey = props.scopeKey
    const input = props.input as Input
    const [state, setState] = useState<ScopeState<Parent, Scope, Input> | null>(null)
    const current = useRef<Generation<Parent, Scope, Input> | null>(null)
    const tail = useRef<Promise<void> | null>(null)
    const nextId = useRef(0)
    const readCommitted = useEffectEvent(() => ({parent, scopeKey, input}))

    useEffect(() => {
      const deferred = createDeferred()
      const previous = tail.current
      const generation: Generation<Parent, Scope, Input> = {
        id: nextId.current++,
        parent,
        scopeKey,
        active: true,
        setupSettled: false,
        disposeStarted: false,
        scope: undefined,
        input: undefined,
        parentOwner: undefined,
        ownerLink: undefined,
        finished: false,
        afterCleanup: undefined,
        done: deferred.promise,
        settle: deferred.resolve
      }
      tail.current = generation.done
      current.current = generation
      setState({status: 'pending', generation})

      const finish = () => {
        if (generation.finished) return
        generation.finished = true
        generation.parentOwner?.children.delete(generation.ownerLink as ChildOwner)
        generation.afterCleanup?.()
        generation.afterCleanup = undefined
        generation.settle()
      }

      const routeDisposalError = (
        error: unknown,
        scope: Scope,
        capturedInput: Input,
        complete: () => void
      ) => {
        if (options.onDisposeError === undefined) {
          safeLog(error)
          complete()
          return
        }

        let handled: MaybePromise<void>
        try {
          handled = options.onDisposeError(error, scope, capturedInput)
        } catch (handlerError) {
          safeLog(new AggregateError([error, handlerError]))
          complete()
          return
        }

        let asyncHandled: boolean
        try {
          asyncHandled = isThenable(handled)
        } catch (handlerError) {
          safeLog(new AggregateError([error, handlerError]))
          complete()
          return
        }

        if (!asyncHandled) {
          complete()
          return
        }

        void Promise.resolve(handled).then(
          complete,
          (handlerError) => {
            safeLog(new AggregateError([error, handlerError]))
            complete()
          }
        )
      }

      const disposeScope = () => {
        if (generation.disposeStarted) return
        generation.disposeStarted = true

        const scope = generation.scope
        const capturedInput = generation.input
        if (scope === undefined) {
          finish()
          return
        }

        const owner = childBinding.owners.get(scope) as OwnerRecord
        const afterChildren = () => {
          childBinding.evict(scope)
          childBinding.owners.delete(scope)

          let disposed: MaybePromise<void>
          try {
            disposed = options.disposeScope === undefined
              ? scope.dispose()
              : options.disposeScope(scope, capturedInput as Input)
          } catch (error) {
            routeDisposalError(error, scope, capturedInput as Input, finish)
            return
          }

          let asyncDisposed: boolean
          try {
            asyncDisposed = isThenable(disposed)
          } catch (error) {
            routeDisposalError(error, scope, capturedInput as Input, finish)
            return
          }

          if (!asyncDisposed) {
            finish()
            return
          }

          void Promise.resolve(disposed).then(
            finish,
            (error) => routeDisposalError(error, scope, capturedInput as Input, finish)
          )
        }

        if (owner.children.size === 0) {
          owner.closed = true
          afterChildren()
          return
        }

        owner.closed = true
        const descendants = [...owner.children]
        for (const descendant of descendants) descendant.cancel()
        void Promise.all(descendants.map((descendant) => descendant.done)).then(afterChildren)
      }

      const deactivate = () => {
        if (!generation.active) return
        generation.active = false
        current.current = null
        setState(null)
        if (generation.setupSettled) disposeScope()
      }

      const owner = parentBinding.owners.get(parent)
      if (owner !== undefined) {
        const link: ChildOwner = {cancel: deactivate, done: generation.done}
        generation.parentOwner = owner
        generation.ownerLink = link
        /* v8 ignore start -- React DOM cannot interleave a child Effect setup after its owning parent Effect cleanup */
        if (owner.closed) {
          generation.active = false
          finish()
        } else {
          /* v8 ignore stop */
          owner.children.add(link)
        }
      }

      const publishError = (error: unknown) => {
        setState({status: 'error', generation, error})
      }

      const setupFailed = (error: unknown) => {
        generation.setupSettled = true
        generation.afterCleanup = () => {
          if (generation.active && current.current === generation) {
            setState({status: 'error', generation, error})
          } else {
            safeLog(error)
          }
        }
        disposeScope()
      }

      const setupComplete = () => {
        generation.setupSettled = true
        if (!generation.active || current.current !== generation) {
          disposeScope()
          return
        }
        setState({status: 'ready', generation, scope: generation.scope as Scope})
      }

      const start = () => {
        if (!generation.active || generation.parentOwner?.closed === true) {
          generation.active = false
          finish()
          return
        }

        const committed = readCommitted()
        /* v8 ignore start -- React runs dependency cleanup before a queued Effect can observe a different committed identity */
        if (
          committed.parent !== generation.parent ||
          !Object.is(committed.scopeKey, generation.scopeKey)
        ) {
          generation.active = false
          finish()
          return
        }
        /* v8 ignore stop */

        let scope: Scope
        try {
          scope = options.createScope(generation.parent, committed.input)
        } catch (error) {
          generation.setupSettled = true
          publishError(error)
          finish()
          return
        }

        if (scope === generation.parent as unknown) {
          generation.setupSettled = true
          publishError(new Error('@inferdi/react: createScope must return a new child container'))
          finish()
          return
        }

        generation.scope = scope
        generation.input = committed.input
        childBinding.owners.set(scope, {closed: false, children: new Set()})

        if (options.setupScope === undefined) {
          setupComplete()
          return
        }

        let setup: MaybePromise<void>
        try {
          setup = options.setupScope(scope, committed.input)
        } catch (error) {
          setupFailed(error)
          return
        }

        let asyncSetup: boolean
        try {
          asyncSetup = isThenable(setup)
        } catch (error) {
          setupFailed(error)
          return
        }

        if (!asyncSetup) {
          setupComplete()
          return
        }

        void Promise.resolve(setup).then(setupComplete, setupFailed)
      }

      if (previous === null) start()
      else void previous.then(start)

      return deactivate
    }, [parent, scopeKey])

    if (
      state === null ||
      !state.generation.active ||
      state.generation.parent !== parent ||
      !Object.is(state.generation.scopeKey, scopeKey) ||
      current.current !== state.generation
    ) {
      return props.fallback ?? null
    }

    if (state.status === 'error') throw state.error
    if (state.status === 'pending') return props.fallback ?? null
    return createElement(
      childBinding.Provider as ComponentType<InferdiProviderProps<Scope>>,
      {container: state.scope},
      props.children
    )
  }

  return {
    Provider: childBinding.Provider,
    useContainer: childBinding.useContainer,
    useService: childBinding.useService,
    useAsyncService: childBinding.useAsyncService,
    useAsyncServices: childBinding.useAsyncServices,
    createScope: childBinding.createScope,
    ScopeProvider
  }
}

/**
 * Creates a React binding for one exact InferDI container type-state.
 * Declare bindings at module scope so their context and component identities
 * remain stable.
 *
 * @example
 * ```tsx
 * const AppDI = inferdiReact<AppContainer>()
 *
 * <AppDI.Provider container={container}>
 *   <App />
 * </AppDI.Provider>
 * ```
 */
export function inferdiReact<
  C extends Container<InferdiGraphOf<C>>
>(): InferdiReactBinding<C> {
  return createBinding<C>()
}
