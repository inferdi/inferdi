# Фулстек-фреймворки

Фулстек-примеры используют скоупы в загрузчиках данных (loaders), действиях (actions), обработчиках маршрутов и серверных действиях (Server Actions). В режиме разработки корневой контейнер кэшируется на `globalThis`, чтобы HMR не создавал повторные экземпляры клиентов.

Оба примера используют общий [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Обратите внимание, какой операции фреймворк дожидается через `await` и когда после неё можно освободить скоуп.

| Пример | Что показывает |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | границы скоупа для запроса и Server Action в Next.js App Router |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | границы скоупа для loader и action в Remix |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

Файл в репозитории: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

Файл в репозитории: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
