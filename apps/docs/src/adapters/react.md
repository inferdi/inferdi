# React

[`@inferdi/react`](https://github.com/inferdi/inferdi/tree/main/packages/react) provides React 19 contexts and hooks for exact InferDI container types. It also manages client-created child scopes without constructing resources during render.

## Install

```bash
pnpm add @inferdi/inferdi @inferdi/react react
```

React `19.2.8` or newer in the React 19 line is required. The adapter does not import `react-dom`, so applications keep control of their renderer.

## Bind an exact container type

Declare bindings at module scope. Each call owns one React context and one exact InferDI graph type-state.

```tsx
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '@inferdi/react'

const root = new Container()
  .registerValue('session', {user: {name: 'Ada'}})

export const AppDI = inferdiReact<typeof root>()
```

A binding for a root with missing scope inputs cannot accept a refined child scope. Create a separate binding from the exact return type of the function that supplies those inputs.

## External providers

`Provider` exposes a caller-owned container and never disposes it. Use it for application roots, server-created request scopes and test fixtures.

```tsx
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

Replacing `container` follows ordinary React context semantics. Nested providers select the nearest container. Bootstrap or request code owns disposal after unmount or stream completion.

## Managed child scopes

Create a managed binding from its parent binding. `ScopeProvider` creates the child in a committed Effect, publishes it after optional setup and always runs its configured disposal operation.

```tsx
type ScopeInput = {
  request: RequestContext
}

const RequestDI = AppDI.createScope({
  createScope: (parent, input: ScopeInput) => parent.createScope(input),
  setupScope: async (scope) => {
    await scope.getAsync('requestSession')
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
```

There is no disposal opt-out. If work must outlive the component, create and own the scope outside React and pass it to `Provider`.

## Service hooks and Suspense

`useService` accepts ready singleton and scoped synchronous keys. `useAsyncService` and `useAsyncServices` accept ready declarative async or mixed sync/async keys and pass stable cached Promises to React `use`.

```tsx
function RequestScreen() {
  const [session, repository] = RequestDI.useAsyncServices(
    'requestSession',
    'repository'
  )

  return <Dashboard session={session} repository={repository} />
}

<AppErrorBoundary>
  <Suspense fallback={<Loading />}>
    <RequestArea request={request} />
  </Suspense>
</AppErrorBoundary>
```

The tuple hook starts all services before the first suspension. Rejected services reach the nearest Error Boundary. Transient keys are rejected because render retries could allocate instances that React cannot own; resolve them in an event or Effect instead.

## Identity and teardown

The parent container object and `scopeKey` define a managed generation. `input` is a payload snapshot read when that generation actually starts. Changing only `input` does not recreate or update the scope.

Changing `scopeKey` on the same provider immediately shows the fallback, waits for the old setup and disposal to settle, then creates the replacement. React's special `key` remounts the component and creates an independent serialization domain.

Managed descendants finish cleanup before their managed ancestor is disposed. An external parent owner must keep its container alive until its own child shutdown coordination finishes. A setup, disposal or error hook that never settles leaves later generations on the fallback.

## Strict Mode and Activity

The adapter creates no scope during render, lazy state initialization or module evaluation. Strict Mode Effect replay creates distinct generations and waits for disposal of the first before creating the second.

React `Activity` hiding disconnects Effects and ends the managed generation even though React retains component state. Revealing it creates a fresh generation. Put an external `Provider` outside that boundary when the scope must survive hiding.

## Server rendering

Managed Effects do not run on the server. `ScopeProvider` renders its fallback on the server and during the first hydration render, then creates the scope after the client commit.

For full classic SSR, let the HTTP handler own an exact refined request scope:

```tsx
function createRequestScope(request: RequestContext) {
  return root.createScope({request})
}

type RequestContainer = ReturnType<typeof createRequestScope>
const RequestDI = inferdiReact<RequestContainer>()

renderToPipeableStream(
  <RequestDI.Provider container={scope}>
    <App />
  </RequestDI.Provider>,
  streamOptions
)
```

The HTTP integration must abort rendering and dispose the scope after the stream completes or disconnects. Containers are not serialized into HTML. React Server Components and Next.js-specific lifecycle helpers are outside this package.

## Errors

A current create or setup failure reaches the nearest Error Boundary. Setup failure first disposes the half-built scope and remains the surfaced error if disposal also fails. Disposal failures go to `onDisposeError`, or to `console.error` when no handler is configured. Stale setup failures are logged because no live boundary remains to receive them.
