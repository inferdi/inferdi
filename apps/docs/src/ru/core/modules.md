---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/modules#breadcrumb"
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
          "name": "Модули"
          "item": "https://inferdi.com/ru/core/modules"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/modules#article"
      "headline": "Модули в InferDI — композиция сборщиков через .use()"
      "name": "Модули"
      "description": "Разбейте большой сборщик контейнера на меньшие части через .use(), сохраняя полный вывод типов по всей fluent chain, и поймите, почему дженерик-модулям нужна известная форма входных данных."
      "url": "https://inferdi.com/ru/core/modules"
      "mainEntityOfPage": "https://inferdi.com/ru/core/modules"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, модули, use, композиция контейнера, вывод типов, тип Module, внедрение зависимостей"
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

# Модули

Используйте `.use()`, чтобы разбить большой сборщик контейнера на части и сохранить вывод типов по fluent chain.

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

Inline-lambda - самый удобный вариант. Тип контейнера внутри lambda выводится из места вызова, включая ключи, зарегистрированные ранее.

## Именованные модули

Для переиспользуемых модулей с фиксированной формой используйте экспортируемый `Module<TIn, TOut>`.

```ts
import {
  Container,
  type Module,
  type SpecMap,
} from '@inferdi/inferdi'

type Base = SpecMap<{ config: { env: string } }>
type Added = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Base, Added> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}
```

Обобщённые module functions вроде `<T>(c: Container<T>) => ...` не могут выразить уникальность ключей внутри тела функции. Используйте inline-lambda или `Module<TIn, TOut>` с фиксированной формой.

## Динамические проверки

`.has(key)` - это проверка-уточнение типа для динамических ключей:

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` никогда не резолвит значение и возвращает `false` для уже очищенных контейнеров.
