# Runtimes and Edge Platforms

Most adapters here share the [`../_shared/container.ts`](../_shared/container.ts) builder; Supabase Edge Functions ships its own root to show how a custom factory swap works while keeping the same request-scope discipline.

Use a module/process-level root container and create one scope per request. Register request context and request-owned handlers/services as `scoped` on the root. For each request, call `await createRequestScope(root, {...})`; the helper hydrates request data through the scoped instance and disposes the scope if hydration fails.

For bounded non-streaming handlers, prefer `await using scope = await createRequestScope(...)`. For servers whose response lifecycle outlives the handler callback, attach disposal to `finish`/`close` or the platform's response hook.

For low-level servers, clean up on both normal completion and abort paths. For edge platforms with background work (Cloudflare `ctx.waitUntil`, Vercel `waitUntil`, Deno Deploy `info.waitUntil`, Supabase `EdgeRuntime.waitUntil`), **sequence dispose AFTER the background promise** with `.finally`. Running `Promise.all([background, scope.dispose()])` is a bug — it tears down the scoped services while the background work is still using them.

```ts
// ✗ wrong — parallel disposal races the background promise
ctx.waitUntil(Promise.all([background, scope.dispose()]))

// ✓ right — dispose runs only after background settles
ctx.waitUntil(background.finally(() => scope.dispose()))
```

Deno examples import from `'@inferdi/inferdi'` in `../_shared/container.ts`; map the bare specifier in your `deno.json` import map: `{ "imports": { "@inferdi/inferdi": "npm:@inferdi/inferdi" } }`.
