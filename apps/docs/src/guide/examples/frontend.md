# Frontend Frameworks

Frontend examples create scopes at page, route, screen, or feature boundaries. They keep their own small builders instead of importing the server-side shared module.

Compare where each framework creates the scope, how the scope is provided to children, and how cleanup runs on unmount.

| Example | Shows |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | React feature scope with lazy `useState` and cleanup |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | React Native screen scope |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Vue 3 provide/inject scope boundary |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Svelte context scope boundary |

## React

<<< ../../../../../examples/frontend/react.tsx

Repository file: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../examples/frontend/react-native.tsx

Repository file: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../examples/frontend/vue.ts

Repository file: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../examples/frontend/svelte.ts

Repository file: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
