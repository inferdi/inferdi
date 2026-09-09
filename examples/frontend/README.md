# Frontend Frameworks

Use InferDI scopes at page, route, screen, or large feature-module boundaries. Avoid creating a scope for tiny leaf components such as buttons or inputs; pass the page/feature scope down through the framework context mechanism.

Declare page, route, or screen context as scope inputs. Register feature view models as `scoped`, then provide the ready scope to child components when that feature mounts.

Unmount hooks in React, React Native, Vue, and Svelte are synchronous. If a scope may contain async factories or async disposers, call `scope.dispose().catch(console.error)` from the cleanup hook. The framework will not await that promise, but this avoids using synchronous `[Symbol.dispose]()` on a container that may hold async resources.

React uses `@inferdi/react` to create the scope after commit and serialize async
cleanup before replacement. React Native keeps the equivalent lifecycle wiring
locally because the adapter does not claim React Native compatibility:

```tsx
const [scope, setScope] = useState<PageContainer | null>(null)

useEffect(() => {
  const nextScope = createPageScope(parent)
  setScope(nextScope)

  return () => {
    nextScope.dispose().catch(console.error)
  }
}, [parent])
```

React can call lazy state initializers more than once in development Strict Mode. Creating a resource during render can leak the instance from a discarded render. Effect setup runs after commit, and React pairs every setup with its cleanup, including Strict Mode's development replay. Render a fallback until the scope is ready.

Frontend examples keep their own minimal builders because `_shared/container.ts` targets server resources such as `Database` and `process.env`. They declare page or screen data with `declareScopeInputs()`, keep API clients on the root and dispose feature scopes from cleanup hooks.
