# @inferdi/react

[![JSR](https://jsr.io/badges/@inferdi/react)](https://jsr.io/@inferdi/react)
[![npm version](https://img.shields.io/npm/v/@inferdi/react)](https://www.npmjs.com/package/@inferdi/react)
![License](https://img.shields.io/npm/l/@inferdi/react.svg)

React 19 providers and hooks for exact InferDI container types, including
Suspense-aware async services and client-owned child scopes.

> Core package: [`@inferdi/inferdi`](https://www.npmjs.com/package/@inferdi/inferdi)
> ([JSR](https://jsr.io/@inferdi/inferdi)).

## Requirements

- React `>=19.2.8 <20`
- TypeScript `>=5.2`
- Node `>=16` for classic server rendering

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

The adapter does not import `react-dom`; use the renderer your application
already owns.

## Create a binding

Declare each binding at module scope and bind it to one exact container
type-state:

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

type AppContainer = typeof root

export const AppDI = inferdiReact<AppContainer>()
```

A binding owns its React context. Components must use hooks from the same
binding whose provider appears above them.

## Externally owned containers

`Provider` exposes a container and never disposes it:

```tsx
import {createRoot} from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <AppDI.Provider container={root}>
    <App />
  </AppDI.Provider>
)

function UserMenu() {
  const session = AppDI.useService('session')
  return <span>{session.user.name}</span>
}
```

Bootstrap or request code remains responsible for the container lifetime.
Use this provider for application roots, server-created request scopes and
test fixtures.

## Managed child scopes

`ScopeProvider` creates its child after React commits and always disposes it.
The scope type returned by `createScope` becomes the exact type of the child
binding:

```tsx
type RequestContext = {
  readonly id: string
}

const requestRoot = new Container()
  .declareScopeInputs<{request: RequestContext}>()
  .registerFactory(
    'requestId',
    (container) => container.get('request').id,
    ['request'],
    'scoped'
  )

const RootDI = inferdiReact<typeof requestRoot>()

const RequestDI = RootDI.createScope({
  createScope: (parent, input: {request: RequestContext}) =>
    parent.createScope(input),
  setupScope: async (scope) => {
    await scope.getAsync('requestId')
  },
  onDisposeError: (error, _scope, input) => {
    reportCleanupError(error, input.request.id)
  }
})

function RequestArea({request}: {request: RequestContext}) {
  return (
    <RequestDI.ScopeProvider
      input={{request}}
      scopeKey={request.id}
      fallback={<RequestSkeleton />}
    >
      <RequestScreen />
    </RequestDI.ScopeProvider>
  )
}

function RequestScreen() {
  return <span>{RequestDI.useService('requestId')}</span>
}
```

`scopeKey`, together with the parent container object, defines generation
identity. Changing `input` alone does nothing. The next generation starts only
after setup, disposal and cleanup-error handling for the previous generation
finish. React's special `key` remounts the provider and creates a separate
serialization domain.

For a child that needs no input, use the shorthand:

```tsx
const FeatureDI = AppDI.createScope()

function Feature() {
  return (
    <FeatureDI.ScopeProvider fallback={<Loading />}>
      <FeatureContent />
    </FeatureDI.ScopeProvider>
  )
}
```

There is no disposal opt-out for a managed scope. Create the scope outside
React and use `Provider` when work must outlive the component.

## Async services and Suspense

Declarative async singleton and scoped services use React Suspense:

```tsx
function Dashboard() {
  const [database, cache] = AppDI.useAsyncServices('database', 'cache')
  return <DashboardView database={database} cache={cache} />
}

<AppErrorBoundary>
  <Suspense fallback={<Loading />}>
    <AppDI.Provider container={root}>
      <Dashboard />
    </AppDI.Provider>
  </Suspense>
</AppErrorBoundary>
```

The tuple hook starts every requested service before the first suspension.
Promises remain stable for each binding, container and key. Rejections flow to
the nearest Error Boundary.

`useService` and the async hooks reject transient registrations at compile
time. Resolve transients from an event or Effect where application code can
own the returned instance:

```tsx
function RunButton() {
  const container = AppDI.useContainer()

  function run() {
    container.get('newCommand').run()
  }

  return <button onClick={run}>Run</button>
}
```

Service resolution during render may initialize a cached singleton or scoped
service. Keep constructors and factories free of subscriptions, timers and
writes; perform effectful activation during bootstrap or `setupScope`.

## Strict Mode and Activity

Managed scope creation never runs during render. Strict Mode Effect replay
creates a fresh scope, disposes it, then creates the replacement after disposal
settles. Each generation is disposed at most once.

Hiding a managed provider with React `Activity` disconnects its Effects and
ends that generation. Revealing it creates a fresh generation. Put an external
`Provider` outside the Activity boundary when the scope must survive hiding.

Nested managed providers register with their managed parent. Parent cleanup
first invalidates and drains managed descendants, then disposes the ancestor.
An externally owned parent must remain alive until its application-owned child
shutdown finishes.

A setup or disposal hook that never settles blocks later generations by
design. Version 1 does not cancel a user-supplied setup Promise.

## Server rendering

Effects do not run on the server, so a managed `ScopeProvider` renders only its
fallback during server rendering and the first hydration render. It is useful
for client-owned subtrees, not full SSR content.

For full classic SSR, create and initialize a request scope in the HTTP handler,
bind its refined return type, and use the external provider:

```tsx
function createRequestScope(request: RequestContext) {
  return requestRoot.createScope({request})
}

type RequestContainer = ReturnType<typeof createRequestScope>
const RequestSSRDI = inferdiReact<RequestContainer>()

const scope = createRequestScope(request)

renderToPipeableStream(
  <RequestSSRDI.Provider container={scope}>
    <App />
  </RequestSSRDI.Provider>,
  streamOptions
)
```

The HTTP integration must abort rendering and dispose the scope after the
stream completes or disconnects. `Provider` does not own that lifecycle, and
the container object is never serialized into HTML.

React Server Components and Next.js-specific request helpers are outside this
package's version 1 API.

## Errors

- A missing matching provider throws during render.
- A current `createScope` or `setupScope` failure reaches the nearest Error
  Boundary.
- A setup failure disposes the half-built scope first and remains the surfaced
  error even if disposal also fails.
- Disposal failures call `onDisposeError`. Without it they go to
  `console.error`; they never replace rendered UI or a setup error.
- Stale setup failures are logged because no live component remains to surface
  them.

## License

MIT
