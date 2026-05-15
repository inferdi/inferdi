# Full-Stack Frameworks

These adapters share the [`../_shared/container.ts`](../_shared/container.ts) builder.

Full-stack frameworks often hide the server lifecycle behind loaders, actions, route handlers, and build tooling.

For development HMR, cache the root container on a typed `globalThis` slot. Module files can be re-evaluated during hot reload while `globalThis` survives, and reusing the root prevents duplicate database/cache clients (and re-running the async `Database` factory).

Create scopes for loaders/actions/requests. `await using` is a good fit for Next.js Server Actions and Remix loaders/actions because the async function is the operation boundary that the framework awaits.
