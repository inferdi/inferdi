# Фронтенд-фреймворки

Фронтенд-примеры создают scope на границе страницы, маршрута, экрана или фичи. Они используют свои небольшие сборщики, а не общий серверный модуль.

Сравнивайте, где фреймворк создаёт scope, как scope передаётся детям и как очистка запускается при unmount.

| Пример | Что показывает |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | feature scope в React с ленивым `useState` и очисткой |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | scope экрана в React Native |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | граница scope через provide/inject во Vue 3 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | граница scope через context в Svelte |

## React

<<< ../../../../../../examples/frontend/react.tsx

Файл в репозитории: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

Файл в репозитории: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

Файл в репозитории: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

Файл в репозитории: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
