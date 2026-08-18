# Full-Stack Frameworks

These adapters share the [`../_shared/container.ts`](../_shared/container.ts) builder.

Full-stack frameworks often hide the server lifecycle behind loaders, actions, route handlers, and build tooling.

For development HMR, cache the root container on a typed `globalThis` slot. Module files can be re-evaluated during hot reload while `globalThis` survives, and reusing the root prevents duplicate database and cache clients.

Create scopes for loaders/actions/requests. `await using` is a good fit for Next.js Server Actions and Remix loaders/actions because the async function is the operation boundary that the framework awaits.

The deployment runtime owns root shutdown. Dispose the root through the framework or process shutdown hook when the runtime provides one; a loader or action scope does not dispose root singletons.
