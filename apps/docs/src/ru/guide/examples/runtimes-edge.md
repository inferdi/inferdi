# Рантаймы и edge-платформы

В этих примерах корневой контейнер хранится на уровне модуля, а на каждый запрос создаётся отдельный скоуп. Если вся работа завершается внутри обработчика, можно использовать `await using`. Для потоковых ответов и фоновых задач освобождение скоупа нужно отложить до завершения этой работы.

Большинство примеров используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Cloudflare Workers и Supabase Edge Functions строят локальные графы вокруг ресурсов своей платформы.

| Пример | Что показывает |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | низкоуровневый жизненный цикл Node HTTP с очисткой после ответа |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | скоуп на запрос в Bun `serve` |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | скоуп на запрос в Deno HTTP |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | типы привязок из Wrangler, D1, Queues и обработка ошибок в `ctx.waitUntil` |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | скоуп на запрос в Vercel Edge и фоновая очистка |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | очистка Deno Deploy через `Deno.ServeHandlerInfo.completed` |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions с локальной заменой фабрики |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

Файл в репозитории: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun `serve`

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

Файл в репозитории: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

Файл в репозитории: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

Объявите привязки ресурсов `DB` и `AUDIT_QUEUE` в `wrangler.jsonc`, затем запустите `pnpm wrangler types`. Пример использует сгенерированный интерфейс `Env` и не удерживает скоуп запроса в фоновой задаче.

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

Файл в репозитории: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

Файл в репозитории: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

Файл в репозитории: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Файл в репозитории: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
