# Фулстек-фреймворки

Фулстек-примеры используют scope для loaders, actions, обработчиков маршрутов и server actions. В dev-сборках корневой контейнер кешируется на `globalThis`, чтобы HMR не создавал дубликаты клиентов.

Оба примера используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Сравнивайте границу операции, которую фреймворк дожидается через `await`.

| Пример | Что показывает |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | границы scope для запроса и Server Action в Next.js App Router |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | границы scope для loader и action в Remix |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

Файл в репозитории: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

Файл в репозитории: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
