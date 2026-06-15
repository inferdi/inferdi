---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/symbol-keys#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Главная"
          "item": "https://inferdi.com/ru/"
        - "@type": "ListItem"
          "position": 2
          "name": "Базовые принципы"
          "item": "https://inferdi.com/ru/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Символьные ключи"
          "item": "https://inferdi.com/ru/core/symbol-keys"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/symbol-keys#article"
      "headline": "Символьные ключи в InferDI"
      "name": "Символьные ключи"
      "description": "Любой ключ регистрации может быть строкой или символом. Строки подходят для публичных сервисов уровня приложения; символы дают идентичность без коллизий, а локальные ключи Symbol() остаются доступными для сборки мусора вместе с контейнером."
      "url": "https://inferdi.com/ru/core/symbol-keys"
      "mainEntityOfPage": "https://inferdi.com/ru/core/symbol-keys"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, символьные ключи, Symbol, строковые ключи, идентичность, сборка мусора, внедрение зависимостей"
      "articleSection": "Базовые принципы"
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

# Символьные ключи

Любой ключ регистрации может быть `string` или `symbol`. Строки удобны для публичных сервисов уровня приложения. Symbol-ключи полезны, когда важна идентичность.

```ts
const DB = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB, PgPool, ['config'])
  .registerClass(CACHE, RedisPool, [])
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)
c.get(CACHE)
c.get('repo')
```

## Когда использовать symbol-ключи

| Ситуация                             | Токен                     |
|--------------------------------------|---------------------------|
| Приватный сервис внутри модуля       | `Symbol('name')`          |
| Общая идентичность без импортов      | `Symbol.for('name')`      |
| Номинальное различие на уровне типов | константа `unique symbol` |

Используйте локальные символы для приватных сервисов, которые сборщик мусора сможет удалить. `Symbol.for(name)` хранится в глобальном реестре символов и никогда не удаляется сборщиком мусора.

## Lazy companion-ключи

Ключ lazy companion тоже может быть типа Symbol:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

Основной ключ и companion-ключ не обязаны быть одного вида.
