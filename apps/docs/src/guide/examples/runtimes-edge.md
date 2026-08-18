# Runtimes and Edge Platforms

Runtime examples use a module-level root and create one scope per request. Bounded handlers can use `await using`; streaming or background work should dispose after that work settles.

Most examples share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Cloudflare Workers and Supabase Edge Functions use platform bindings in local container graphs.

| Example | Shows |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | Low-level Node HTTP lifecycle with response cleanup |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Bun `serve` request scope |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Deno HTTP request scope |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Wrangler-generated bindings, D1, Queues and handled `ctx.waitUntil` work |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Vercel Edge request scope and background cleanup |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Deno Deploy cleanup through `Deno.ServeHandlerInfo.completed` |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions with a custom factory swap |

## Node HTTP

<<< ../../../../../examples/runtimes-edge/node-http.ts

Repository file: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../examples/runtimes-edge/bun-serve.ts

Repository file: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../examples/runtimes-edge/deno-http.ts

Repository file: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

Configure `DB` and `AUDIT_QUEUE` bindings in `wrangler.jsonc`, then run `pnpm wrangler types`. The example uses the generated `Env` interface and keeps background work independent from the request scope.

<<< ../../../../../examples/runtimes-edge/cloudflare-workers.ts

Repository file: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../examples/runtimes-edge/vercel-edge.ts

Repository file: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../examples/runtimes-edge/deno-deploy.ts

Repository file: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Repository file: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
