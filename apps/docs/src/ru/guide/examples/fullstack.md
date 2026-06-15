---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/fullstack#breadcrumb"
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
          "name": "Фулстек-фреймворки"
          "item": "https://inferdi.com/ru/guide/examples/fullstack"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/fullstack#article"
      "headline": "Scope InferDI в Next.js и Remix"
      "name": "Фулстек-фреймворки"
      "description": "Используйте scope InferDI для loaders, actions, обработчиков маршрутов и server actions в Next.js App Router и Remix, с корневым контейнером в кеше globalThis, который переживает HMR при разработке."
      "url": "https://inferdi.com/ru/guide/examples/fullstack"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/fullstack"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Next.js, Remix, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Next.js, Remix, App Router, server actions, loaders, внедрение зависимостей"
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
