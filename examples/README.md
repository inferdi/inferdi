# InferDI Examples

These examples show recommended InferDI integration patterns for common TypeScript frameworks and runtimes.

They are reference snippets for GitHub readers. The root package intentionally does not install framework dependencies, does not typecheck this directory, and does not publish `examples/` to npm. Copy the pattern into your application and install the framework dependencies there.

## Start here

[**`_shared/container.ts`**](./_shared) is the **canonical** example. Read it first — it shows the features InferDI was designed for (async factory with LIFO `Symbol.asyncDispose`, `Lazy<T>` companion keys for transient deps in singletons, `Module<TIn, TOut>` composition, and the compile-time lifetime guard). All framework adapters import their container from there, so the per-framework files contain only the wiring that is actually framework-specific.

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
- Register runtime context classes and request/job/page services on the root as `scoped`.
- Hydrate the scoped context instance immediately after `createScope()`; if hydration or early resolution can throw, dispose the partially created scope before rethrowing.
- Dispose request/job scopes explicitly when that unit of work is done.
- Do not inject scoped or transient services directly into singletons.
- Use `await using` when the function boundary owns all async work, such as CLI commands, queue jobs, Next.js Server Actions, and non-streaming fetch handlers.
- In HTTP frameworks, prefer framework completion hooks or response finish/close events so streaming and aborted connections still clean up scopes.
