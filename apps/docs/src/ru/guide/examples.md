# Примеры

Репозиторий хранит примеры как справочные фрагменты только для GitHub. Корневой пакет не устанавливает зависимости фреймворков, не проверяет типы в `examples/` и не публикует этот каталог в npm.

Скопируйте подходящий шаблон в приложение и установите зависимости фреймворка уже там.

Каждая группа ниже повторяет одну директорию в [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples). Откройте страницу группы, чтобы сравнить примеры этой группы на одной странице.

## Начните отсюда

Сначала прочитайте [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Большинство серверных примеров импортируют этот сборщик, чтобы файлы фреймворков показывали только обвязку.

| Группа | Что сравнить |
| --- | --- |
| [JavaScript](/ru/guide/examples/javascript) | Node ESM, Node CommonJS и браузерная сборка |
| [Бэкенд-фреймворки](/ru/guide/examples/backend) | адаптеры scope запроса для Fastify, Hono, Koa, Express и Elysia |
| [API-слои](/ru/guide/examples/api-layers) | границы scope запроса в tRPC, Apollo Server и GraphQL Yoga |
| [Фулстек-фреймворки](/ru/guide/examples/fullstack) | scope для Next.js App Router, Server Actions, loader и action в Remix |
| [Рантаймы и edge-платформы](/ru/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy и Supabase Edge |
| [Фронтенд-фреймворки](/ru/guide/examples/frontend) | feature scope в React, React Native, Vue и Svelte |
| [Боты, очереди и CLI](/ru/guide/examples/workers-cli) | scope на операцию в Telegraf, Grammy, BullMQ, Commander и Yargs |

## Как читать группы

Используйте `examples/_shared/container.ts` как граф приложения для серверных примеров. Остальные страницы групп показывают владение жизненным циклом: где scope создаётся, где становится доступен и где очищается.

В серверных и worker-примерах сравнивайте hooks жизненного цикла фреймворка или платформы. Во фронтенд-примерах сравнивайте границы mount и unmount.
