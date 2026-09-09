import {
  Activity,
  Component,
  StrictMode,
  Suspense,
  act,
  memo,
  useEffect,
  type ErrorInfo,
  type ReactNode
} from 'react'
import {createRoot, type Root} from 'react-dom/client'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {Container, type AsyncSpec, type Spec} from '@inferdi/inferdi'
import {inferdiReact} from '../src/index'

type Deferred<T> = {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: unknown) => void
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((next, fail) => {
    resolve = next
    reject = fail
  })
  return {promise, resolve, reject}
}

class Boundary extends Component<
  {readonly children: ReactNode; readonly onError?: (error: unknown) => void},
  {readonly error: unknown}
> {
  state = {error: undefined as unknown}

  static getDerivedStateFromError(error: unknown) {
    return {error}
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    this.props.onError?.(error)
  }

  render() {
    return this.state.error === undefined
      ? this.props.children
      : <span data-error>{String(this.state.error)}</span>
  }
}

const mounted: Root[] = []

function mount(node: ReactNode) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  mounted.push(root)
  return {host, root}
}

afterEach(async () => {
  while (mounted.length > 0) {
    const root = mounted.pop()
    await act(async () => root?.unmount())
  }
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('@inferdi/react provider and service hooks', () => {
  it('reports a missing provider', async () => {
    const container = new Container().registerValue('name', 'outside')
    const AppDI = inferdiReact<typeof container>()
    const errors: unknown[] = []
    function Consumer() {
      return <span>{AppDI.useContainer().get('name')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(<Boundary onError={(error) => errors.push(error)}><Consumer /></Boundary>)
    })

    expect(host.textContent).toContain('no matching Provider')
    expect(errors).toHaveLength(1)
  })

  it('uses the nearest exact container and never disposes external providers', async () => {
    const outer = new Container().registerValue('name', 'outer')
    const inner = new Container().registerValue('name', 'inner')
    const disposeOuter = vi.spyOn(outer, 'dispose')
    const disposeInner = vi.spyOn(inner, 'dispose')
    const AppDI = inferdiReact<typeof outer>()
    function Name() {
      return <span>{AppDI.useService('name')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(
        <AppDI.Provider container={outer}>
          <Name />
          <AppDI.Provider container={inner}><Name /></AppDI.Provider>
        </AppDI.Provider>
      )
    })
    expect(host.textContent).toBe('outerinner')

    await act(async () => root.render(<AppDI.Provider container={inner}><Name /></AppDI.Provider>))
    expect(host.textContent).toBe('inner')
    await act(async () => root.unmount())
    mounted.pop()
    expect(disposeOuter).not.toHaveBeenCalled()
    expect(disposeInner).not.toHaveBeenCalled()
  })

  it('resolves symbol-keyed stable services', async () => {
    const token = Symbol('service')
    const service = {ready: true}
    const container = new Container().registerValue(token, service)
    const AppDI = inferdiReact<typeof container>()
    function Consumer() {
      return <span>{String(AppDI.useService(token).ready)}</span>
    }
    const {host, root} = mount(null)

    await act(async () => root.render(<AppDI.Provider container={container}><Consumer /></AppDI.Provider>))
    expect(host.textContent).toBe('true')
  })

  it('suspends on one cached async service promise and exposes its value', async () => {
    const gate = deferred<string>()
    const container = new Container().registerAsyncFactory('message', () => gate.promise, [])
    const getAsync = vi.spyOn(container, 'getAsync')
    const AppDI = inferdiReact<typeof container>()
    function Message() {
      return <span>{AppDI.useAsyncService('message')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(
        <AppDI.Provider container={container}>
          <Suspense fallback={<span>loading</span>}><Message /></Suspense>
        </AppDI.Provider>
      )
    })
    expect(host.textContent).toBe('loading')
    expect(getAsync).toHaveBeenCalledTimes(1)

    await act(async () => gate.resolve('ready'))
    expect(host.textContent).toBe('ready')
    expect(getAsync).toHaveBeenCalledTimes(1)
  })

  it('caches the wrapper promise for an actual synchronous mixed key', async () => {
    const concrete = new Container().registerValue('mixed', 'sync')
    type Mixed = Container<{
      mixed: Spec<string, 'singleton'> | AsyncSpec<string, 'singleton'>
    }>
    const container = concrete as unknown as Mixed
    const getAsync = vi.spyOn(container, 'getAsync')
    const MixedDI = inferdiReact<Mixed>()
    function Value() {
      return <span>{MixedDI.useAsyncService('mixed')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(<MixedDI.Provider container={container}><Suspense fallback="loading"><Value /></Suspense></MixedDI.Provider>)
    })
    await act(async () => {})
    expect(host.textContent).toBe('sync')

    await act(async () => {
      root.render(<MixedDI.Provider container={container}><Suspense fallback="loading"><Value /></Suspense></MixedDI.Provider>)
    })
    expect(getAsync).toHaveBeenCalledTimes(1)
  })

  it('starts every tuple service before the first suspension', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const starts: string[] = []
    const container = new Container()
      .registerAsyncFactory('first', () => {
        starts.push('first')
        return first.promise
      }, [])
      .registerAsyncFactory('second', () => {
        starts.push('second')
        return second.promise
      }, [])
    const AppDI = inferdiReact<typeof container>()
    function Values() {
      const [one, two] = AppDI.useAsyncServices('first', 'second')
      return <span>{one}{two}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(<AppDI.Provider container={container}><Suspense fallback="loading"><Values /></Suspense></AppDI.Provider>)
    })
    expect(starts).toEqual(['first', 'second'])
    expect(host.textContent).toBe('loading')

    await act(async () => {
      first.resolve('one')
      second.resolve('two')
    })
    expect(host.textContent).toBe('onetwo')
  })

  it('reuses duplicate tuple keys and observes later rejections before React reads them', async () => {
    const first = deferred<string>()
    const laterError = new Error('later failed')
    const container = new Container()
      .registerAsyncFactory('first', () => first.promise, [])
      .registerAsyncFactory('later', async () => {
        throw laterError
      }, [])
    const getAsync = vi.spyOn(container, 'getAsync')
    const AppDI = inferdiReact<typeof container>()
    const seen: unknown[] = []
    const unhandled = vi.fn()
    window.addEventListener('unhandledrejection', unhandled)
    function Values() {
      const [one, duplicate, later] = AppDI.useAsyncServices('first', 'first', 'later')
      return <span>{one}{duplicate}{later}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(
        <AppDI.Provider container={container}>
          <Boundary onError={(error) => seen.push(error)}>
            <Suspense fallback="loading"><Values /></Suspense>
          </Boundary>
        </AppDI.Provider>
      )
    })
    expect(host.textContent).toBe('loading')
    expect(getAsync.mock.calls.map(([key]) => key)).toEqual(['first', 'later'])
    expect(unhandled).not.toHaveBeenCalled()

    await act(async () => first.resolve('ready'))
    expect(host.textContent).toContain('later failed')
    expect(seen).toEqual([laterError])
    expect(unhandled).not.toHaveBeenCalled()
    window.removeEventListener('unhandledrejection', unhandled)
  })

  it('routes cached service rejection to an error boundary', async () => {
    const error = new Error('service failed')
    const container = new Container().registerAsyncFactory('service', async () => {
      throw error
    }, [])
    const AppDI = inferdiReact<typeof container>()
    const seen: unknown[] = []
    function Consumer() {
      AppDI.useAsyncService('service')
      return null
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(
        <AppDI.Provider container={container}>
          <Boundary onError={(value) => seen.push(value)}>
            <Suspense fallback="loading"><Consumer /></Suspense>
          </Boundary>
        </AppDI.Provider>
      )
    })
    await act(async () => {})
    expect(host.textContent).toContain('service failed')
    expect(seen).toEqual([error])
  })

  it('observes a later tuple rejection after the suspended render is abandoned', async () => {
    const first = deferred<string>()
    const later = deferred<string>()
    const container = new Container()
      .registerAsyncFactory('first', () => first.promise, [])
      .registerAsyncFactory('later', () => later.promise, [])
    const AppDI = inferdiReact<typeof container>()
    const unhandled = vi.fn()
    window.addEventListener('unhandledrejection', unhandled)
    function Values() {
      AppDI.useAsyncServices('first', 'later')
      return null
    }
    const {root} = mount(null)

    await act(async () => root.render(
      <AppDI.Provider container={container}>
        <Suspense fallback="loading"><Values /></Suspense>
      </AppDI.Provider>
    ))
    await act(async () => root.unmount())
    mounted.pop()
    await act(async () => later.reject(new Error('abandoned')))
    expect(unhandled).not.toHaveBeenCalled()
    window.removeEventListener('unhandledrejection', unhandled)
  })

  it('supports empty tuples and keeps binding caches independent', async () => {
    const concrete = new Container().registerValue('mixed', 'value')
    type Mixed = Container<{
      mixed: Spec<string, 'singleton'> | AsyncSpec<string, 'singleton'>
    }>
    const container = concrete as unknown as Mixed
    const FirstDI = inferdiReact<Mixed>()
    const SecondDI = inferdiReact<Mixed>()
    const getAsync = vi.spyOn(container, 'getAsync')
    function Empty() {
      return <span>{FirstDI.useAsyncServices().length}</span>
    }
    function Value() {
      return <span>{FirstDI.useAsyncService('mixed')}{SecondDI.useAsyncService('mixed')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(
        <FirstDI.Provider container={container}>
          <SecondDI.Provider container={container}>
            <Empty /><Suspense fallback="loading"><Value /></Suspense>
          </SecondDI.Provider>
        </FirstDI.Provider>
      )
    })
    await act(async () => {})
    expect(host.textContent).toBe('0valuevalue')
    expect(getAsync).toHaveBeenCalledTimes(2)
  })

  it('keeps one binding cache isolated by container identity', async () => {
    const firstConcrete = new Container().registerValue('mixed', 'first')
    const secondConcrete = new Container().registerValue('mixed', 'second')
    type Mixed = Container<{
      mixed: Spec<string, 'singleton'> | AsyncSpec<string, 'singleton'>
    }>
    const first = firstConcrete as unknown as Mixed
    const second = secondConcrete as unknown as Mixed
    const firstGet = vi.spyOn(first, 'getAsync')
    const secondGet = vi.spyOn(second, 'getAsync')
    const AppDI = inferdiReact<Mixed>()
    function Value() {
      return <span>{AppDI.useAsyncService('mixed')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(<AppDI.Provider container={first}><Suspense fallback="loading"><Value /></Suspense></AppDI.Provider>)
    })
    await act(async () => {})
    expect(host.textContent).toBe('first')

    await act(async () => {
      root.render(<AppDI.Provider container={second}><Suspense fallback="loading"><Value /></Suspense></AppDI.Provider>)
    })
    await act(async () => {})
    expect(host.textContent).toBe('second')
    expect(firstGet).toHaveBeenCalledTimes(1)
    expect(secondGet).toHaveBeenCalledTimes(1)
  })
})

describe('@inferdi/react managed scopes', () => {
  it('creates and disposes the default child scope', async () => {
    const parent = new Container()
    const scope = parent.createScope()
    const createScope = vi.spyOn(parent, 'createScope').mockReturnValue(scope)
    const dispose = vi.spyOn(scope, 'dispose')
    const ParentDI = inferdiReact<typeof parent>()
    const ChildDI = ParentDI.createScope()
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    ))
    expect(host.textContent).toBe('child')
    expect(createScope).toHaveBeenCalledTimes(1)

    await act(async () => root.unmount())
    mounted.pop()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('creates after commit, snapshots input, and ignores input-only changes', async () => {
    const parent = new Container().registerValue('root', true)
    const ParentDI = inferdiReact<typeof parent>()
    const create = vi.fn((_parent: typeof parent, input: {name: string}) =>
      new Container().registerValue('name', input.name)
    )
    const ChildDI = ParentDI.createScope({createScope: create})
    function Child() {
      return <span>{ChildDI.useService('name')}</span>
    }
    const {host, root} = mount(null)

    await act(async () => {
      root.render(
        <ParentDI.Provider container={parent}>
          <ChildDI.ScopeProvider input={{name: 'first'}} scopeKey="same" fallback="loading">
            <Child />
          </ChildDI.ScopeProvider>
        </ParentDI.Provider>
      )
      expect(create).not.toHaveBeenCalled()
    })
    expect(host.textContent).toBe('first')

    await act(async () => {
      root.render(
        <ParentDI.Provider container={parent}>
          <ChildDI.ScopeProvider input={{name: 'second'}} scopeKey="same" fallback="loading">
            <Child />
          </ChildDI.ScopeProvider>
        </ParentDI.Provider>
      )
    })
    expect(host.textContent).toBe('first')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('keeps fallback during setup and disposes before starting a new key', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const setups = new Map<string, Deferred<void>>()
    const disposals = new Map<string, Deferred<void>>()
    const events: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        events.push(`create:${input.key}`)
        return new Container().registerValue('key', input.key)
      },
      setupScope: async (_scope, input) => {
        events.push(`setup:${input.key}`)
        await setups.get(input.key)?.promise
      },
      disposeScope: async (_scope, input) => {
        events.push(`dispose:${input.key}`)
        await disposals.get(input.key)?.promise
        events.push(`disposed:${input.key}`)
      }
    })
    setups.set('a', deferred())
    setups.set('b', deferred())
    disposals.set('a', deferred())
    disposals.set('b', deferred())
    function Child() {
      return <span>{ChildDI.useService('key')}</span>
    }
    const {host, root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key} fallback="loading"><Child /></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    expect(host.textContent).toBe('loading')
    await act(async () => setups.get('a')?.resolve())
    expect(host.textContent).toBe('a')

    await act(async () => root.render(render('b')))
    expect(host.textContent).toBe('loading')
    expect(events).not.toContain('create:b')
    await act(async () => disposals.get('a')?.resolve())
    expect(events).toContain('create:b')
    expect(events.indexOf('disposed:a')).toBeLessThan(events.indexOf('create:b'))
    await act(async () => setups.get('b')?.resolve())
    expect(host.textContent).toBe('b')
  })

  it('skips rapid queued identities and reads the latest committed input at start', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const firstDisposal = deferred()
    const events: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string; value: string}) => {
        events.push(`create:${input.key}:${input.value}`)
        return new Container().registerValue('value', input.value)
      },
      disposeScope: async (_scope, input) => {
        events.push(`dispose:${input.key}`)
        if (input.key === 'a') await firstDisposal.promise
      }
    })
    const {host, root} = mount(null)
    const render = (key: string, value: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key, value}} scopeKey={key} fallback="loading">
          <span>ready</span>
        </ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a', 'first')))
    expect(host.textContent).toBe('ready')
    await act(async () => root.render(render('b', 'stale')))
    await act(async () => root.render(render('c', 'current')))
    expect(host.textContent).toBe('loading')
    expect(events).not.toContain('create:b:stale')
    expect(events).not.toContain('create:c:current')

    await act(async () => firstDisposal.resolve())
    expect(events).not.toContain('create:b:stale')
    expect(events).toContain('create:c:current')
    expect(host.textContent).toBe('ready')
  })

  it('replaces a scope when the parent identity changes', async () => {
    const firstParent = new Container().registerValue('parent', 'first')
    const secondParent = new Container().registerValue('parent', 'second')
    const ParentDI = inferdiReact<typeof firstParent>()
    const events: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (parent) => {
        const name = parent.get('parent')
        events.push(`create:${name}`)
        return new Container().registerValue('name', name)
      },
      disposeScope: async (scope) => {
        events.push(`dispose:${scope.get('name')}`)
      }
    })
    function Child() {
      return <span>{ChildDI.useService('name')}</span>
    }
    const {host, root} = mount(null)
    const render = (parent: typeof firstParent) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider fallback="loading"><Child /></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render(firstParent)))
    expect(host.textContent).toBe('first')
    await act(async () => root.render(render(secondParent)))
    expect(host.textContent).toBe('second')
    expect(events).toEqual(['create:first', 'dispose:first', 'create:second'])
  })

  it('disposes a stale scope after async setup without publishing it', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const setup = deferred()
    const scope = new Container().registerValue('name', 'stale')
    const dispose = vi.spyOn(scope, 'dispose')
    const ChildDI = ParentDI.createScope({
      createScope: () => scope,
      setupScope: () => setup.promise
    })
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    ))
    await act(async () => root.unmount())
    mounted.pop()
    expect(dispose).not.toHaveBeenCalled()
    await act(async () => setup.resolve())
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(host.textContent).toBe('')
  })

  it('surfaces setup errors only after cleanup and routes disposal errors separately', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const setupError = new Error('setup failed')
    const disposalError = new Error('dispose failed')
    const disposalErrors: unknown[] = []
    const ChildDI = ParentDI.createScope({
      createScope: () => new Container(),
      setupScope: () => {
        throw setupError
      },
      disposeScope: () => {
        throw disposalError
      },
      onDisposeError: (error) => {
        disposalErrors.push(error)
      }
    })
    const seen: unknown[] = []
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <Boundary onError={(error) => seen.push(error)}>
          <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
        </Boundary>
      </ParentDI.Provider>
    ))
    expect(host.textContent).toContain('setup failed')
    expect(seen).toEqual([setupError])
    expect(disposalErrors).toEqual([disposalError])
  })

  it('accepts synchronous setup and disposal callbacks', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const events: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: () => new Container(),
      setupScope: () => {
        events.push('setup')
      },
      disposeScope: () => {
        events.push('dispose')
      }
    })
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    ))
    expect(host.textContent).toBe('child')
    await act(async () => root.unmount())
    mounted.pop()
    expect(events).toEqual(['setup', 'dispose'])
  })

  it('treats a throwing setup then getter as setup failure', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const error = new Error('invalid setup thenable')
    const setup = Object.create(null) as Promise<void>
    Object.defineProperty(setup, 'then', {get: () => { throw error }})
    const ChildDI = ParentDI.createScope({
      createScope: () => new Container(),
      setupScope: () => setup
    })
    const seen: unknown[] = []
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <Boundary onError={(value) => seen.push(value)}>
          <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
        </Boundary>
      </ParentDI.Provider>
    ))
    expect(host.textContent).toContain('invalid setup thenable')
    expect(seen).toEqual([error])
  })

  it('routes synchronous disposal-handler failures and keeps the next scope moving', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const disposalError = new Error('dispose failed')
    const handlerError = new Error('handler failed')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const creates: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        creates.push(input.key)
        return new Container()
      },
      disposeScope: () => {
        throw disposalError
      },
      onDisposeError: () => {
        throw handlerError
      }
    })
    const {root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key}><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    await act(async () => root.render(render('b')))
    expect(creates).toEqual(['a', 'b'])
    expect((log.mock.calls[0]?.[0] as AggregateError).errors).toEqual([
      disposalError,
      handlerError
    ])
  })

  it('routes throwing then getters from disposal callbacks and error handlers', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const disposalThenError = new Error('dispose then failed')
    const handlerThenError = new Error('handler then failed')
    const invalidDisposal = Object.create(null) as Promise<void>
    const invalidHandler = Object.create(null) as Promise<void>
    Object.defineProperty(invalidDisposal, 'then', {get: () => { throw disposalThenError }})
    Object.defineProperty(invalidHandler, 'then', {get: () => { throw handlerThenError }})
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const creates: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        creates.push(input.key)
        return new Container()
      },
      disposeScope: () => invalidDisposal,
      onDisposeError: () => invalidHandler
    })
    const {root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key}><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    await act(async () => root.render(render('b')))
    expect(creates).toEqual(['a', 'b'])
    expect((log.mock.calls[0]?.[0] as AggregateError).errors).toEqual([
      disposalThenError,
      handlerThenError
    ])
  })

  it('logs a stale setup rejection after cleanup without publishing it', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const setup = deferred()
    const setupError = new Error('stale setup failed')
    const scope = new Container()
    const dispose = vi.spyOn(scope, 'dispose')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ChildDI = ParentDI.createScope({
      createScope: () => scope,
      setupScope: () => setup.promise
    })
    const {root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    ))
    await act(async () => root.unmount())
    mounted.pop()
    await act(async () => setup.reject(setupError))
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(setupError)
  })

  it('logs disposal and handler failures together and keeps later generations moving', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const disposalError = new Error('dispose failed')
    const handlerError = new Error('handler failed')
    const logged: unknown[] = []
    vi.spyOn(console, 'error').mockImplementation((error) => {
      logged.push(error)
      throw new Error('logger failed')
    })
    const creates: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        creates.push(input.key)
        return new Container()
      },
      disposeScope: async () => {
        throw disposalError
      },
      onDisposeError: async () => {
        throw handlerError
      }
    })
    const {root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key}><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    await act(async () => root.render(render('b')))
    await act(async () => {})
    expect(creates).toEqual(['a', 'b'])
    expect(logged).toHaveLength(1)
    expect(logged[0]).toBeInstanceOf(AggregateError)
    expect((logged[0] as AggregateError).errors).toEqual([disposalError, handlerError])
  })

  it('disposes managed descendants before their ancestor', async () => {
    const rootContainer = new Container()
    const RootDI = inferdiReact<typeof rootContainer>()
    const events: string[] = []
    const childSetup = deferred()
    const ParentScopeDI = RootDI.createScope({
      createScope: () => {
        events.push('create:parent')
        return new Container()
      },
      disposeScope: async () => {
        events.push('dispose:parent')
      }
    })
    const ChildScopeDI = ParentScopeDI.createScope({
      createScope: () => {
        events.push('create:child')
        return new Container()
      },
      setupScope: () => childSetup.promise,
      disposeScope: async () => {
        events.push('dispose:child')
      }
    })
    const {root} = mount(null)

    await act(async () => root.render(
      <RootDI.Provider container={rootContainer}>
        <ParentScopeDI.ScopeProvider>
          <ChildScopeDI.ScopeProvider fallback="loading"><span>child</span></ChildScopeDI.ScopeProvider>
        </ParentScopeDI.ScopeProvider>
      </RootDI.Provider>
    ))
    expect(events).toEqual(['create:parent', 'create:child'])
    await act(async () => root.unmount())
    mounted.pop()
    expect(events).not.toContain('dispose:parent')

    await act(async () => childSetup.resolve())
    expect(events).toEqual([
      'create:parent',
      'create:child',
      'dispose:child',
      'dispose:parent'
    ])
  })

  it('starts independent sibling providers concurrently', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const gates = new Map([
      ['left', deferred<void>()],
      ['right', deferred<void>()]
    ])
    const events: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {id: string}) => {
        events.push(`create:${input.id}`)
        return new Container()
      },
      setupScope: async (_scope, input) => {
        events.push(`setup:${input.id}`)
        await gates.get(input.id)?.promise
      }
    })
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{id: 'left'}} scopeKey="left" fallback="left-loading">
          <span>left-ready</span>
        </ChildDI.ScopeProvider>
        <ChildDI.ScopeProvider input={{id: 'right'}} scopeKey="right" fallback="right-loading">
          <span>right-ready</span>
        </ChildDI.ScopeProvider>
      </ParentDI.Provider>
    ))
    expect(events).toEqual(['create:left', 'setup:left', 'create:right', 'setup:right'])
    expect(host.textContent).toBe('left-loadingright-loading')

    await act(async () => gates.get('left')?.resolve())
    expect(host.textContent).toBe('left-readyright-loading')
    await act(async () => gates.get('right')?.resolve())
    expect(host.textContent).toBe('left-readyright-ready')
  })

  it('cancels a queued child before disposing its managed parent', async () => {
    const rootContainer = new Container()
    const RootDI = inferdiReact<typeof rootContainer>()
    const childDisposal = deferred<void>()
    const events: string[] = []
    const ParentScopeDI = RootDI.createScope({
      createScope: () => new Container(),
      disposeScope: () => {
        events.push('dispose:parent')
      }
    })
    const ChildScopeDI = ParentScopeDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        events.push(`create:child:${input.key}`)
        return new Container()
      },
      disposeScope: async (_scope, input) => {
        events.push(`dispose:child:${input.key}`)
        if (input.key === 'a') await childDisposal.promise
      }
    })
    const {root} = mount(null)
    const render = (childKey: string) => (
      <RootDI.Provider container={rootContainer}>
        <ParentScopeDI.ScopeProvider>
          <ChildScopeDI.ScopeProvider input={{key: childKey}} scopeKey={childKey}>
            <span>child</span>
          </ChildScopeDI.ScopeProvider>
        </ParentScopeDI.ScopeProvider>
      </RootDI.Provider>
    )

    await act(async () => root.render(render('a')))
    await act(async () => root.render(render('b')))
    expect(events).not.toContain('create:child:b')
    await act(async () => root.render(<RootDI.Provider container={rootContainer} />))
    expect(events).not.toContain('dispose:parent')

    await act(async () => childDisposal.resolve())
    expect(events).toEqual([
      'create:child:a',
      'dispose:child:a',
      'dispose:parent'
    ])
  })

  it('keeps later generations on fallback while disposal does not settle', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const disposal = deferred<void>()
    const creates: string[] = []
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        creates.push(input.key)
        return new Container()
      },
      disposeScope: () => disposal.promise
    })
    const {host, root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key} fallback="loading">
          <span>ready</span>
        </ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    expect(host.textContent).toBe('ready')
    await act(async () => root.render(render('b')))
    expect(host.textContent).toBe('loading')
    expect(creates).toEqual(['a'])
  })

  it('rejects returning the parent without disposing it', async () => {
    const parent = new Container()
    const dispose = vi.spyOn(parent, 'dispose')
    const ParentDI = inferdiReact<typeof parent>()
    const ChildDI = ParentDI.createScope({
      createScope: () => parent
    })
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <Boundary><ChildDI.ScopeProvider><span>child</span></ChildDI.ScopeProvider></Boundary>
      </ParentDI.Provider>
    ))
    expect(host.textContent).toContain('new child container')
    expect(dispose).not.toHaveBeenCalled()
  })

  it('surfaces a synchronous creation failure without attempting disposal', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const error = new Error('create failed')
    const ChildDI = ParentDI.createScope({
      createScope: () => {
        throw error
      }
    })
    const seen: unknown[] = []
    const {host, root} = mount(null)

    await act(async () => root.render(
      <ParentDI.Provider container={parent}>
        <Boundary onError={(value) => seen.push(value)}>
          <ChildDI.ScopeProvider fallback="loading"><span>child</span></ChildDI.ScopeProvider>
        </Boundary>
      </ParentDI.Provider>
    ))
    expect(host.textContent).toContain('create failed')
    expect(seen).toEqual([error])
  })

  it('uses default disposal, logs its failure, and releases the next generation', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const error = new Error('default dispose failed')
    const creates: string[] = []
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        creates.push(input.key)
        const scope = new Container()
        vi.spyOn(scope, 'dispose').mockImplementation(() => {
          throw error
        })
        return scope
      }
    })
    const {root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key}><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    await act(async () => root.render(render('b')))
    expect(creates).toEqual(['a', 'b'])
    expect(log).toHaveBeenCalledWith(error)
  })

  it('waits for successful async disposal error handling', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const handled = deferred()
    const creates: string[] = []
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ChildDI = ParentDI.createScope({
      createScope: (_parent, input: {key: string}) => {
        creates.push(input.key)
        return new Container()
      },
      disposeScope: async () => {
        throw new Error('dispose failed')
      },
      onDisposeError: () => handled.promise
    })
    const {root} = mount(null)
    const render = (key: string) => (
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider input={{key}} scopeKey={key}><span>child</span></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('a')))
    await act(async () => root.render(render('b')))
    expect(creates).toEqual(['a'])
    await act(async () => handled.resolve())
    expect(creates).toEqual(['a', 'b'])
    expect(log).not.toHaveBeenCalled()
  })

  it('evicts managed async hook promises during cleanup', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const concrete = new Container().registerValue('mixed', 'value')
    type Mixed = Container<{
      mixed: Spec<string, 'scoped'> | AsyncSpec<string, 'scoped'>
    }>
    const scope = concrete as unknown as Mixed
    const getAsync = vi.spyOn(scope, 'getAsync').mockImplementation(async () => 'value')
    const ChildDI = ParentDI.createScope({createScope: () => scope})
    function Value() {
      return <span>{ChildDI.useAsyncService('mixed')}</span>
    }
    const first = mount(null)

    await act(async () => first.root.render(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider><Suspense fallback="loading"><Value /></Suspense></ChildDI.ScopeProvider>
      </ParentDI.Provider>
    ))
    await act(async () => {})
    expect(first.host.textContent).toBe('value')
    expect(getAsync).toHaveBeenCalledTimes(1)
    await act(async () => first.root.unmount())
    mounted.pop()

    const second = mount(null)
    await act(async () => second.root.render(
      <ChildDI.Provider container={scope}>
        <Suspense fallback="loading"><Value /></Suspense>
      </ChildDI.Provider>
    ))
    await act(async () => {})
    expect(second.host.textContent).toBe('value')
    expect(getAsync).toHaveBeenCalledTimes(2)
  })

  it('serializes Strict Mode replay and disposes each generation once', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const events: string[] = []
    let id = 0
    const ChildDI = ParentDI.createScope({
      createScope: () => {
        const current = ++id
        events.push(`create:${current}`)
        return new Container().registerValue('id', current)
      },
      disposeScope: async (_scope, input) => {
        events.push(`dispose:${String(input)}:${events.filter((event) => event.startsWith('dispose:')).length + 1}`)
      }
    })
    const {root} = mount(null)

    await act(async () => root.render(
      <StrictMode>
        <ParentDI.Provider container={parent}>
          <ChildDI.ScopeProvider><span>child</span></ChildDI.ScopeProvider>
        </ParentDI.Provider>
      </StrictMode>
    ))
    await act(async () => {})
    expect(events.filter((event) => event.startsWith('create:'))).toEqual(['create:1', 'create:2'])
    expect(events.findIndex((event) => event.startsWith('dispose:'))).toBeLessThan(events.indexOf('create:2'))

    await act(async () => root.unmount())
    mounted.pop()
    await act(async () => {})
    expect(events.filter((event) => event.startsWith('dispose:'))).toHaveLength(2)
  })

  it('recreates a managed generation after Activity reconnects effects', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const disposal = deferred()
    const events: string[] = []
    let nextId = 0
    const ChildDI = ParentDI.createScope({
      createScope: () => {
        const id = ++nextId
        events.push(`create:${id}`)
        return new Container().registerValue('id', id)
      },
      disposeScope: async (scope) => {
        const id = scope.get('id')
        events.push(`dispose:${id}`)
        if (id === 1) await disposal.promise
        events.push(`disposed:${id}`)
      }
    })
    const Consumer = memo(function Consumer() {
      const id = ChildDI.useService('id')
      events.push(`render:${id}`)
      useEffect(() => {
        events.push(`connect:${id}`)
        return () => {
          events.push(`disconnect:${id}`)
        }
      }, [id])
      return <span>{id}</span>
    })
    const {host, root} = mount(null)
    const render = (mode: 'visible' | 'hidden') => (
      <ParentDI.Provider container={parent}>
        <Activity mode={mode}>
          <ChildDI.ScopeProvider fallback="loading"><Consumer /></ChildDI.ScopeProvider>
        </Activity>
      </ParentDI.Provider>
    )

    await act(async () => root.render(render('visible')))
    expect(host.textContent).toBe('1')
    await act(async () => root.render(render('hidden')))
    await act(async () => root.render(render('visible')))
    expect(events).not.toContain('create:2')
    expect(events).not.toContain('render:2')

    await act(async () => disposal.resolve())
    expect(host.textContent).toBe('2')
    expect(events.indexOf('disposed:1')).toBeLessThan(events.indexOf('create:2'))
    expect(events).toContain('disconnect:1')
    expect(events).toContain('connect:2')
  })
})
