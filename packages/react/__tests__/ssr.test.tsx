import {Suspense, act} from 'react'
import {hydrateRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '../src/index'

describe('@inferdi/react server rendering', () => {
  it('renders external providers and leaves their lifetime to the request owner', () => {
    const scope = new Container().registerValue('requestId', 'server-request')
    const dispose = vi.spyOn(scope, 'dispose')
    const RequestDI = inferdiReact<typeof scope>()
    function App() {
      return <span>{RequestDI.useService('requestId')}</span>
    }

    const html = renderToString(<RequestDI.Provider container={scope}><App /></RequestDI.Provider>)
    expect(html).toContain('server-request')
    expect(dispose).not.toHaveBeenCalled()
  })

  it('isolates explicit request containers across server renders', () => {
    const first = new Container().registerValue('requestId', 'first')
    const second = new Container().registerValue('requestId', 'second')
    const RequestDI = inferdiReact<typeof first>()
    function App() {
      return <span>{RequestDI.useService('requestId')}</span>
    }

    const firstHtml = renderToString(<RequestDI.Provider container={first}><App /></RequestDI.Provider>)
    const secondHtml = renderToString(<RequestDI.Provider container={second}><App /></RequestDI.Provider>)
    expect(firstHtml).toContain('first')
    expect(secondHtml).toContain('second')
  })

  it('renders only the managed fallback and creates no server scope', () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const createScope = vi.fn(() => new Container())
    const ChildDI = ParentDI.createScope({createScope})

    const html = renderToString(
      <ParentDI.Provider container={parent}>
        <ChildDI.ScopeProvider fallback={<span>server fallback</span>}>
          <span>managed child</span>
        </ChildDI.ScopeProvider>
      </ParentDI.Provider>
    )
    expect(html).toContain('server fallback')
    expect(html).not.toContain('managed child')
    expect(createScope).not.toHaveBeenCalled()
  })

  it('uses the async hook with an application-owned Suspense boundary', () => {
    const container = new Container().registerAsyncFactory('message', async () => 'ready', [])
    const AppDI = inferdiReact<typeof container>()
    function App() {
      return <span>{AppDI.useAsyncService('message')}</span>
    }

    const html = renderToString(
      <AppDI.Provider container={container}>
        <Suspense fallback={<span>loading</span>}><App /></Suspense>
      </AppDI.Provider>
    )
    expect(html).toContain('loading')
  })

  it('hydrates a managed fallback before creating the client scope after commit', async () => {
    const parent = new Container()
    const ParentDI = inferdiReact<typeof parent>()
    const createScope = vi.fn(() => new Container().registerValue('message', 'client'))
    const ChildDI = ParentDI.createScope({createScope})
    function Child() {
      return <span>{ChildDI.useService('message')}</span>
    }
    function App() {
      return (
        <ParentDI.Provider container={parent}>
          <ChildDI.ScopeProvider fallback={<span>loading</span>}>
            <Child />
          </ChildDI.ScopeProvider>
        </ParentDI.Provider>
      )
    }

    const html = renderToString(<App />)
    expect(html).toContain('loading')
    expect(createScope).not.toHaveBeenCalled()

    const host = document.createElement('div')
    host.innerHTML = html
    document.body.append(host)
    const hydrationErrors: unknown[] = []
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(host, <App />, {
        onRecoverableError: (error) => hydrationErrors.push(error)
      })
    })
    expect(hydrationErrors).toEqual([])
    expect(createScope).toHaveBeenCalledTimes(1)
    expect(host.textContent).toBe('client')
    await act(async () => root?.unmount())
  })

  it('hydrates equivalent external providers without serializing a container', async () => {
    const server = new Container().registerValue('message', 'same')
    const client = new Container().registerValue('message', 'same')
    const AppDI = inferdiReact<typeof server>()
    function Content() {
      return <span>{AppDI.useService('message')}</span>
    }
    const render = (container: typeof server) => (
      <AppDI.Provider container={container}><Content /></AppDI.Provider>
    )

    const html = renderToString(render(server))
    expect(html).toBe('<span>same</span>')
    expect(html).not.toContain('Container')
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.append(host)
    const hydrationErrors: unknown[] = []
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(host, render(client), {
        onRecoverableError: (error) => hydrationErrors.push(error)
      })
    })
    expect(hydrationErrors).toEqual([])
    expect(host.textContent).toBe('same')
    await act(async () => root?.unmount())
  })
})
