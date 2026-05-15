# Frontend Frameworks

Use InferDI scopes at page, route, screen, or large feature-module boundaries. Avoid creating a scope for tiny leaf components such as buttons or inputs; pass the page/feature scope down through the framework context mechanism.

Register page/route/screen context and feature view models as `scoped` on the root. When a page or feature mounts, create a scope, hydrate the scoped context instance, and provide that scope to child components.

Unmount hooks in React, React Native, Vue, and Svelte are synchronous. If a scope may contain async factories or async disposers, call `scope.dispose().catch(console.error)` from the cleanup hook. The framework will not await that promise, but this avoids using synchronous `[Symbol.dispose]()` on a container that may hold async resources.

In React, create the scope via lazy `useState` — **not `useMemo`**:

```tsx
const [scope] = useState(() => createPageScope(parent))
```

`useMemo` is documented as an optimization with no guarantee; under concurrent rendering it can drop the memoized value, and the discarded scope would never reach the cleanup function in `useEffect`. Lazy `useState` initializers run exactly once per mounted component instance.

Frontend examples deliberately keep their own minimal builders rather than importing `_shared/container.ts`, because the shared module targets server-side resources (`Database`, `process.env`) that do not exist in the browser. The patterns are identical — scoped page/route context, singleton API clients, async dispose from cleanup hooks.
