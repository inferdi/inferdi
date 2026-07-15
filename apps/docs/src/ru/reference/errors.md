---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/reference/errors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Справочник"
          "item": "https://inferdi.com/ru/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Ошибки"
          "item": "https://inferdi.com/ru/reference/errors"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/reference/errors#article"
      "headline": "Справочник ошибок InferDI"
      "name": "Ошибки"
      "description": "Все явные ошибки, которые InferDI бросает при неправильном использовании графа и жизненного цикла — неизвестный ключ, обнаружен цикл, нарушение времени жизни, очищенный контейнер — с формой сообщения, чтобы ошибки регистрации падали рано в тестах."
      "url": "https://inferdi.com/ru/reference/errors"
      "mainEntityOfPage": "https://inferdi.com/ru/reference/errors"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, ошибки, исключения, неизвестный ключ, обнаружен цикл, нарушение времени жизни, очищенный контейнер, внедрение зависимостей"
      "articleSection": "Справочник"
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

# Ошибки

InferDI бросает явные ошибки при неправильном использовании графа и жизненного цикла. Оставляйте эти сообщения видимыми в тестах, чтобы ошибки регистрации падали рано.

| Что произошло | Форма сообщения |
| --- | --- |
| `.get(k)` для отсутствующего ключа | `Key "k" not found` |
| Resolve уже очищенного контейнера | `Container is disposed (key: "k")` |
| Resolve через очищенного предка | `Ancestor container is disposed (key: "k")` |
| `createScope()` после dispose | `Cannot create scope from a disposed container` |
| Регистрация после dispose | `Cannot register on a disposed container (key: "k")` |
| Нарушение времени жизни singleton | `Singleton "x" cannot depend on scoped "y"...` |
| Синхронный цикл | `Circular dependency detected: a -> b -> a...` |
| Синхронный dispose для async-ресурса | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Поздний override | `Cannot override "k" because it has already been resolved...` |
| Override на очищенном контейнере | `Cannot override on a disposed container (key: "k")` |

## Циклы async-фабрик

Циклы между async-фабриками не детектируются. Фабрика, которая ждёт другую async-фабрику, может продолжиться уже после очистки синхронного стека resolve. Если обе стороны ждут друг друга, вызывающий код получает pending promise, который никогда не завершится.

Исправляйте async-циклы архитектурно:

- разделите общую инициализацию
- поднимите одну сторону в более ранний сервис
- используйте `Lazy<singleton>` только если обе стороны singleton
- добавьте development-timeout вокруг подозрительных top-level awaits

## Ошибки очистки в адаптерах

Ошибки очистки в адаптере после уже созданного ответа никогда не показываются клиенту. Они уходят в `onDisposeError` или fallback-приёмник адаптера.

Ошибки setup отличаются: наружу выходит только исходная ошибка setup, а сбой очистки во время setup teardown уходит в приёмник ошибок и не добавляется к проброшенной ошибке.
