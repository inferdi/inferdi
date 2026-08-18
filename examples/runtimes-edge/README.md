# Runtimes and Edge Platforms

Most examples share [`../_shared/container.ts`](../_shared/container.ts). Cloudflare Workers and Supabase Edge Functions use platform-specific roots so bindings enter the graph without Node-oriented configuration.

Use a module/process-level root container and create one scope per request. Declare request context as a scope input and register request-owned handlers and services as `scoped`. For each request, call `createRequestScope(root, {...})` to provide that input.

For bounded non-streaming handlers, prefer `await using scope = createRequestScope(...)`. For servers whose response lifecycle outlives the handler callback, attach disposal to `finish`/`close` or the platform's response hook.

For low-level servers, clean up on normal completion and abort. Deno Deploy exposes `Deno.ServeHandlerInfo.completed`; attach disposal to that promise when the response can outlive the handler.

Keep edge background tasks independent from request-scoped services when possible. Pass plain data or a platform binding to Cloudflare `ctx.waitUntil` and Vercel `waitUntil`, then dispose the scope at the handler boundary. If a Supabase background task must use a scoped service, chain disposal after the task and handle the resulting promise:

```ts
// Wrong: disposal races a background task that uses scoped services
EdgeRuntime.waitUntil(Promise.all([background, scope.dispose()]))

// Correct: disposal follows the task and the error reaches a sink
EdgeRuntime.waitUntil(
  background
    .finally(() => scope.dispose())
    .catch((error) => console.error(error))
)
```

The Cloudflare example expects this binding shape in `wrangler.jsonc`:

```jsonc
{
  "name": "inferdi-cloudflare-example",
  "main": "./cloudflare-workers.ts",
  "compatibility_date": "2026-08-18",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "inferdi-example",
      "database_id": "<DATABASE_ID>"
    }
  ],
  "queues": {
    "producers": [
      {
        "binding": "AUDIT_QUEUE",
        "queue": "inferdi-example-audit"
      }
    ]
  }
}
```

Run `pnpm wrangler types` after changing bindings. Do not hand-write `Env`. Cloudflare recommends JSONC configuration, current compatibility dates and generated binding types. See [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) and [`ExecutionContext`](https://developers.cloudflare.com/workers/runtime-apis/context/).

Deno examples import from `'@inferdi/inferdi'` in `../_shared/container.ts`; map the bare specifier in your `deno.json` import map: `{ "imports": { "@inferdi/inferdi": "npm:@inferdi/inferdi" } }`.
