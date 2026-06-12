# Examples

The repository keeps examples as GitHub-only reference snippets. The root package does not install their framework dependencies, does not typecheck the `examples/` directory, and does not publish it to npm.

Copy the relevant pattern into your application and install the framework dependencies there.

Each group below mirrors one directory in [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples). Open a group page to compare the examples in that group on one page.

## Start Here

Read [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts) first. Most server-side examples import this builder so their files can focus on framework wiring.

| Group | What to compare |
| --- | --- |
| [JavaScript usage](/guide/examples/javascript) | Node ESM, Node CommonJS, and browser bundler usage |
| [Backend frameworks](/guide/examples/backend) | Fastify, Hono, Koa, Express, and Elysia request-scope adapters |
| [API layers](/guide/examples/api-layers) | tRPC, Apollo Server, and GraphQL Yoga request-scope boundaries |
| [Full-stack frameworks](/guide/examples/fullstack) | Next.js App Router and Remix loader/action scopes |
| [Runtimes and edge platforms](/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy, and Supabase Edge |
| [Frontend frameworks](/guide/examples/frontend) | React, React Native, Vue, and Svelte feature scopes |
| [Bots, queues, and CLI](/guide/examples/workers-cli) | Telegraf, Grammy, BullMQ, Commander, and Yargs operation scopes |

## How to Read the Groups

Use `examples/_shared/container.ts` as the application graph for server-side examples. The group pages focus on lifecycle ownership: where a scope is created, where it is exposed, and where it is disposed.

For server-side and worker examples, compare the framework/platform lifecycle hooks. For frontend examples, compare the mount and unmount boundaries.
