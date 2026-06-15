---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/examples/javascript#breadcrumb"
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
          "name": "JavaScript"
          "item": "https://inferdi.com/ru/guide/examples/javascript"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/examples/javascript#article"
      "headline": "Использование InferDI из JavaScript — ESM, CommonJS и браузер"
      "name": "JavaScript"
      "description": "Используйте собранный npm-пакет @inferdi/inferdi из обычного JavaScript: Node ESM с // @ts-check и типами конструкторов через JSDoc, CommonJS require() через карту exports и браузерный ESM для Vite и других сборщиков."
      "url": "https://inferdi.com/ru/guide/examples/javascript"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/examples/javascript"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "JavaScript, Node.js >=16, @inferdi/inferdi"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, JavaScript, ESM, CommonJS, JSDoc, ts-check, браузер, Vite, внедрение зависимостей"
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

# JavaScript

InferDI написан на TypeScript, но JavaScript-проекты используют собранный npm-пакет через карту package exports.

| Пример | Что показывает |
| --- | --- |
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | ESM-импорт в Node с `// @ts-check` и типами конструкторов через JSDoc |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | CommonJS `require()` в Node через package exports |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | ESM для браузера через Vite или другой сборщик |

## Node ESM

<<< ../../../../../../examples/javascript/node-esm.mjs{ js}

Файл в репозитории: [`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../../examples/javascript/node-commonjs.cjs{ js}

Файл в репозитории: [`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## Браузер с Vite

<<< ../../../../../../examples/javascript/browser-vite.js

Файл в репозитории: [`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)
