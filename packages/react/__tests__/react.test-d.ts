import type {ComponentProps, Key, ReactNode} from 'react'
import {describe, expectTypeOf, it} from 'vitest'
import {
  Container,
  type AsyncSpec,
  type Spec
} from '@inferdi/inferdi'
import {
  inferdiReact,
  type InferdiGraphOf,
  type InferdiProviderProps,
  type InferdiReactBinding,
  type InferdiReactScopeBinding,
  type InferdiReactScopeOptions,
  type InferdiScope,
  type InferdiScopeOf,
  type InferdiScopeProviderBaseProps,
  type InferdiScopeProviderProps,
  type InferdiService,
  type InferdiStableAsyncKey,
  type InferdiStableSyncKey
} from '../src/index'

type IsAny<T> = 0 extends 1 & T ? true : false

class SyncService {
  readonly kind = 'sync'
}

class AsyncService {
  readonly kind = 'async'
}

const inputRoot = new Container()
  .declareScopeInputs<{requestId: string}>()
  .registerClass('singleton', SyncService, [])
  .registerClass('scoped', SyncService, [], 'scoped')
  .registerClass('transient', SyncService, [], 'transient')
  .registerAsyncFactory('asyncSingleton', async () => new AsyncService(), [])
  .registerAsyncFactory('asyncScoped', async () => new AsyncService(), [], 'scoped')
  .registerAsyncFactory('asyncTransient', async () => new AsyncService(), [], 'transient')
  .registerFactory('requestValue', (c) => c.get('requestId'), ['requestId'], 'scoped')

const scope = inputRoot.createScope({requestId: 'request'})
const ScopeDI = inferdiReact<typeof scope>()
declare const broadKey: string
declare const unionKey: 'left' | 'right'

declare const mixed: Container<{
  mixed: Spec<SyncService, 'scoped'> | AsyncSpec<AsyncService, 'scoped'>
  maybeTransient: Spec<SyncService, 'scoped'> | AsyncSpec<AsyncService, 'transient'>
}>
const MixedDI = inferdiReact<typeof mixed>()

describe('@inferdi/react types', () => {
  it('preserves the exact container graph and service values', () => {
    expectTypeOf<InferdiGraphOf<typeof scope>>().toEqualTypeOf<
      InferdiGraphOf<InferdiProviderProps<typeof scope>['container']>
    >()
    expectTypeOf<InferdiService<typeof scope, 'singleton'>>().toEqualTypeOf<SyncService>()
    expectTypeOf<InferdiScopeOf<typeof inputRoot>>().toMatchTypeOf<InferdiScope>()
    expectTypeOf(ScopeDI).toMatchTypeOf<InferdiReactBinding<typeof scope>>()
  })

  it('filters stable synchronous keys', () => {
    type Keys = InferdiStableSyncKey<typeof scope>
    expectTypeOf<Keys>().toEqualTypeOf<'singleton' | 'scoped' | 'requestId' | 'requestValue'>()

    ScopeDI.useService('singleton')
    ScopeDI.useService('scoped')
    ScopeDI.useService('requestValue')

    // @ts-expect-error declarative async services require an async hook
    ScopeDI.useService('asyncSingleton')
    // @ts-expect-error transient services are unsafe during render
    ScopeDI.useService('transient')
    // @ts-expect-error mixed keys are not definitely synchronous
    MixedDI.useService('mixed')
  })

  it('filters stable asynchronous keys', () => {
    type Keys = InferdiStableAsyncKey<typeof scope>
    expectTypeOf<Keys>().toEqualTypeOf<'asyncSingleton' | 'asyncScoped'>()

    ScopeDI.useAsyncService('asyncSingleton')
    ScopeDI.useAsyncService('asyncScoped')
    MixedDI.useAsyncService('mixed')

    // @ts-expect-error definitely synchronous services use useService
    ScopeDI.useAsyncService('singleton')
    // @ts-expect-error async transient services are unsafe during render
    ScopeDI.useAsyncService('asyncTransient')
    // @ts-expect-error a possibly transient union is rejected as a whole
    MixedDI.useAsyncService('maybeTransient')
  })

  it('keeps async tuple positions exact and readonly', () => {
    const values = ScopeDI.useAsyncServices('asyncSingleton', 'asyncScoped')
    expectTypeOf(values).toEqualTypeOf<readonly [AsyncService, AsyncService]>()

    // @ts-expect-error the returned tuple is readonly
    values[0] = new AsyncService()
  })

  it('keeps unready scope-input dependencies out of hooks', () => {
    const RootDI = inferdiReact<typeof inputRoot>()

    // @ts-expect-error requestValue is blocked until requestId is supplied
    RootDI.useService('requestValue')
    RootDI.Provider({container: inputRoot})
    // @ts-expect-error the root binding has a different readiness type-state
    RootDI.Provider({container: scope})
  })

  it('infers managed no-input and input scope props', () => {
    const defaultChild = ScopeDI.createScope()
    type DefaultProps = ComponentProps<typeof defaultChild.ScopeProvider>
    expectTypeOf<DefaultProps['scopeKey']>().toEqualTypeOf<Key | undefined>()

    // @ts-expect-error no-input providers reject input
    const invalidDefault: DefaultProps = {input: 'value'}
    void invalidDefault

    const requestChild = inferdiReact<typeof inputRoot>().createScope({
      createScope: (parent, input: {requestId: string}) => parent.createScope(input)
    })
    expectTypeOf(requestChild.useService('requestValue')).toEqualTypeOf<string>()
    type RequestProps = ComponentProps<typeof requestChild.ScopeProvider>
    expectTypeOf<RequestProps['input']>().toEqualTypeOf<{requestId: string}>()
    expectTypeOf<RequestProps['scopeKey']>().toEqualTypeOf<Key>()

    // @ts-expect-error input-bearing providers require input and scopeKey
    const missingInput: RequestProps = {}
    void missingInput
  })

  it('rejects asynchronous scope creation', () => {
    inferdiReact<typeof inputRoot>().createScope({
      // @ts-expect-error managed ownership requires a synchronous scope result
      createScope: async (parent) => parent.createScope()
    })
  })

  it('supports symbol, broad, and union keys inherited from core', () => {
    const token = Symbol('service')
    const symbolContainer = new Container().registerClass(token, SyncService, [])
    const SymbolDI = inferdiReact<typeof symbolContainer>()
    expectTypeOf(SymbolDI.useService(token)).toEqualTypeOf<SyncService>()

    const broadContainer = new Container().registerClass(broadKey, SyncService, [])
    inferdiReact<typeof broadContainer>().useService(broadKey)

    const unionContainer = new Container().registerClass(unionKey, SyncService, [])
    inferdiReact<typeof unionContainer>().useService(unionKey)
  })

  it('exports structural public contracts without graph widening or any', () => {
    type ScopeOptions = InferdiReactScopeOptions<
      typeof inputRoot,
      typeof scope,
      {requestId: string}
    >
    type ScopeBinding = InferdiReactScopeBinding<
      typeof inputRoot,
      typeof scope,
      {requestId: string}
    >

    expectTypeOf<InferdiProviderProps<typeof scope>['container']>().toEqualTypeOf<typeof scope>()
    expectTypeOf<InferdiScopeProviderBaseProps['fallback']>().toEqualTypeOf<ReactNode | undefined>()
    expectTypeOf<InferdiScopeProviderProps<void>['input']>().toEqualTypeOf<undefined>()
    expectTypeOf<Parameters<ScopeOptions['createScope']>[0]>().toEqualTypeOf<typeof inputRoot>()
    expectTypeOf<ReturnType<ScopeOptions['createScope']>>().toEqualTypeOf<typeof scope>()
    expectTypeOf<ScopeBinding['Provider']>().toEqualTypeOf<InferdiReactBinding<typeof scope>['Provider']>()
    expectTypeOf<IsAny<InferdiGraphOf<typeof scope>>>().toEqualTypeOf<false>()
  })
})
