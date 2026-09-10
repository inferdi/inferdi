# Примеры

Выберите подходящий сценарий и сравните, как приложение создаёт скоуп, передаёт его обработчикам и освобождает ресурсы. Каждая группа соответствует каталогу в [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples).

## Начните отсюда

Сначала прочитайте [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Большинство серверных примеров импортируют этот сборщик, чтобы файлы фреймворков показывали только обвязку.

| Группа | Что сравнить |
| --- | --- |
| [JavaScript](/ru/guide/examples/javascript) | Node ESM, Node CommonJS и браузерная сборка |
| [Бэкенд-фреймворки](/ru/guide/examples/backend) | адаптеры скоупа запроса для Fastify, Hono, Koa, Express и Elysia |
| [API-слои](/ru/guide/examples/api-layers) | границы скоупа запроса в tRPC, Apollo Server и GraphQL Yoga |
| [Фулстек-фреймворки](/ru/guide/examples/fullstack) | скоупы для Next.js App Router, Server Actions, loader и action в Remix |
| [Рантаймы и edge-платформы](/ru/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy и Supabase Edge |
| [Фронтенд-фреймворки](/ru/guide/examples/frontend) | скоуп отдельной части приложения в React, React Native, Vue и Svelte |
| [Боты, очереди и CLI](/ru/guide/examples/workers-cli) | скоуп на операцию в Telegraf, Grammy, BullMQ, Commander и Yargs |

## Как читать группы

Используйте `examples/_shared/container.ts` как граф приложения для серверных примеров. Страницы отдельных групп показывают, кто управляет скоупом: где создаётся скоуп, где становится доступен и где очищается.

В серверных примерах и обработчиках заданий обратите внимание на хуки жизненного цикла фреймворка или платформы. Во фронтенд-примерах смотрите, как скоуп связан с монтированием и размонтированием компонентов.

::: info Справочные фрагменты
`pnpm run examples:typecheck` проверяет `examples/_shared/container.ts` и `examples/_shared/testing.ts`. Остальные примеры для фреймворков он не проверяет, потому что корневое рабочее пространство не устанавливает все зависимости фреймворков. Скопируйте нужный шаблон в приложение, установите его зависимости и адаптируйте общий граф к своим типам.
:::
