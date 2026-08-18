# InferDI Examples

These examples show recommended InferDI integration patterns for common TypeScript frameworks and runtimes.

They are reference snippets for GitHub readers and are not published to npm. The root workspace does not install example-only framework dependencies. `pnpm run examples:typecheck` checks the canonical shared graph against the current container source; copy a framework pattern into your application and typecheck it with that framework's dependencies.

## Start here

[**`_shared/container.ts`**](./_shared) is the canonical example. It shows declarative async registrations with propagated `AsyncSpec`, LIFO `Symbol.asyncDispose`, a `Lazy<T>` companion for a singleton dependency, `Module<TRequirements, TProvides>` composition and the compile-time lifetime guard. Framework examples import this graph and focus on lifecycle wiring.

## Categories

- [JavaScript usage](./javascript) - Node ESM, Node CommonJS, browser bundlers, and `// @ts-check` with JSDoc.
- [Backend frameworks](./backend) - Fastify, Hono, Elysia, Express, Koa.
- [API layers](./api-layers) - tRPC, Apollo Server, GraphQL Yoga.
- [Full-stack frameworks](./fullstack) - Next.js App Router, Remix.
- [Runtimes and edge platforms](./runtimes-edge) - Bun, Node.js, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy, Supabase Edge Functions.
- [Frontend frameworks](./frontend) - React, React Native, Vue 3, Svelte.
- [Bots, queues, and CLI](./workers-cli) - Telegraf, Grammy, BullMQ, Commander, Yargs.

## Lifecycle Rules

- Build one root container for the long-lived application/runtime instance.
- Create a scope for each request, job, command, route, page, or large feature boundary.
- Declare runtime request, job, or route data with `declareScopeInputs()` and provide it to `createScope(inputs)`.
- Register services that consume those inputs as `scoped` or `transient`.
- Dispose request/job scopes explicitly when that unit of work is done.
- Dispose the root container once when the application shuts down. Disposing a child scope does not dispose singletons owned by the root.
- Do not inject scoped or transient services directly into singletons.
- Use `await using` when the function boundary owns all async work, such as CLI commands, queue jobs, Next.js Server Actions, and non-streaming fetch handlers.
- In HTTP frameworks, prefer framework completion hooks or response finish/close events so streaming and aborted connections still clean up scopes.
