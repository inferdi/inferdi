# Full-Stack Frameworks

Full-stack examples use scopes for loaders, actions, route handlers, and server actions. Development builds cache the root on `globalThis` to avoid duplicate clients during HMR.

Both examples share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compare the operation boundary that each framework awaits.

| Example | Shows |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Next.js App Router request and Server Action scope boundaries |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Remix loader and action scope boundaries |

## Next.js App Router

<<< ../../../../../examples/fullstack/next-app-router.ts

Repository file: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../examples/fullstack/remix.ts

Repository file: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
