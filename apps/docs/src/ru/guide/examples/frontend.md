---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/frontend#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Руководство"
          "item": "https://inferdi.com/ru/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Примеры"
          "item": "https://inferdi.com/ru/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Фронтенд-фреймворки"
          "item": "https://inferdi.com/ru/guide/examples/frontend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/frontend#article"
      "headline": "Scope InferDI в React, React Native и Vue"
      "name": "Фронтенд-фреймворки"
      "description": "Создавайте scope InferDI на границах страницы, маршрута, экрана или фичи в React, React Native и Vue 3 — передавая scope потомкам и запуская очистку при размонтировании."
      "url": "https://inferdi.com/ru/guide/examples/frontend"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/frontend"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, React, React Native, Vue 3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, React, React Native, Vue 3, provide inject, scope фичи, внедрение зависимостей"
      "articleSection": "Примеры"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

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
