# Environnements d’exécution et plateformes edge

Les exemples conservent une racine au niveau du module et créent un scope par requête. Les gestionnaires couvrant toute l’opération peuvent utiliser `await using` ; le streaming et le travail en arrière-plan doivent se terminer avant la libération.

La plupart des exemples utilisent le graphe partagé. Cloudflare Workers et Supabase Edge Functions intègrent les ressources de leur plateforme dans des graphes locaux. [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts)

| Exemple | Contenu |
|---|---|
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | Cycle HTTP natif de Node et libération liée à la réponse |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Scope de requête pour `serve` de Bun |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Scope de requête Deno HTTP |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Bindings générés par Wrangler, D1, Queues et travail encadré via `ctx.waitUntil` |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Scope de requête Vercel Edge et libération en arrière-plan |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Libération dans Deno Deploy via `Deno.ServeHandlerInfo.completed` |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions avec remplacement d’une fabrique |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

Fichier du dépôt : [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

Fichier du dépôt : [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

Fichier du dépôt : [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

Configure `DB` et `AUDIT_QUEUE` dans `wrangler.jsonc`, puis exécute `pnpm wrangler types`. L’exemple utilise l’interface `Env` générée et garde le travail en arrière-plan indépendant du scope de requête.

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

Fichier du dépôt : [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

Fichier du dépôt : [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

Fichier du dépôt : [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Fichier du dépôt : [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)

