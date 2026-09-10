# Laufzeit- und Edge-Plattformen

Die Beispiele halten den Root auf Modulebene und erstellen einen Scope je Anfrage. Handler, die die gesamte Operation abdecken, können `await using` nutzen; bei Streaming oder Hintergrundarbeit muss die Freigabe bis zu deren Abschluss warten.

Die meisten Beispiele nutzen den gemeinsamen Graphen. Cloudflare Workers und Supabase Edge Functions binden Plattformressourcen in lokale Containergraphen ein. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Beispiel | Inhalt |
|---|---|
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | Nativer Node-HTTP-Lebenszyklus mit Freigabe nach der Antwort |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Request-Scope für Bun `serve` |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Request-Scope für Deno HTTP |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Von Wrangler erzeugte Bindings, D1, Queues und verwaltete `ctx.waitUntil`-Arbeit |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Request-Scope und Freigabe im Hintergrund bei Vercel Edge |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Freigabe in Deno Deploy über `Deno.ServeHandlerInfo.completed` |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions mit ausgetauschter Factory |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

Datei im Repository: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

Datei im Repository: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

Datei im Repository: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

Konfiguriere `DB` und `AUDIT_QUEUE` in `wrangler.jsonc` und führe `pnpm wrangler types` aus. Das Beispiel nutzt das erzeugte `Env`-Interface und hält Hintergrundarbeit vom Request-Scope unabhängig.

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

Datei im Repository: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

Datei im Repository: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

Datei im Repository: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Datei im Repository: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)

