# Installation

InferDI is published to npm and JSR with matching package names and matching versions. Use npm-compatible installs for Node and Bun, or JSR for Deno and runtimes that prefer TypeScript sources.

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

You can also import directly:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Requirements

| Runtime | Requirement |
| --- | --- |
| Node.js | 16 or newer for the core package |
| Bun | 1.0 or newer |
| Deno | 1.40 or newer |
| TypeScript | 5.2+ recommended for `using` / `await using` syntax |

On Node versions before native `Symbol.dispose` and `Symbol.asyncDispose`, InferDI installs a symbol polyfill on import so Explicit Resource Management interop still works.

## Adapter Installs

Install the core package, the adapter package, and the framework peer:

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

Each adapter has a dedicated page with its lifecycle rules and type setup.
