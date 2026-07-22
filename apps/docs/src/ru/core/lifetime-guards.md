---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/core/lifetime-guards#breadcrumb"
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
          "name": "Контроль времени жизни"
          "item": "https://inferdi.com/ru/core/lifetime-guards"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/core/lifetime-guards#article"
      "headline": "Контроль времени жизни в InferDI — singleton, scoped и transient"
      "name": "Контроль времени жизни"
      "description": "Три вида времени жизни в InferDI — singleton, scoped и transient — и защита на этапе компиляции и во время выполнения, которая не даёт долгоживущему сервису захватить короткоживущий и протечь состоянием между запросами."
      "url": "https://inferdi.com/ru/core/lifetime-guards"
      "mainEntityOfPage": "https://inferdi.com/ru/core/lifetime-guards"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, время жизни, singleton, scoped, transient, контроль времени жизни, захваченная зависимость, внедрение зависимостей"
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

# Контроль времени жизни

В InferDI есть три вида времени жизни:

| Вид | Создание | Кеш | Очистка |
| --- | --- | --- | --- |
| `singleton` | один раз на контейнер-владелец | контейнер-владелец | да |
| `scoped` | один раз на scope | scope | да |
| `transient` | при каждом resolve | никогда | нет |

## Правило жизненного цикла

Singleton не может напрямую зависеть от `scoped` или `transient` сервиса. Singleton создаётся один раз и разделяется между всеми запросами, поэтому если он захватит scoped-значение - контекст текущего запроса, пользователя или транзакцию - состояние одного запроса незаметно протечёт во все остальные. InferDI делает такую связь невыразимой в системе типов, а не оставляет её на code review.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

Такую регистрацию отклонит TypeScript. В strict mode та же форма будет отклонена runtime-защитой, если каст обойдёт систему типов.

## Строгий режим

`strict: true` включен по умолчанию. Он ловит:

- нарушения singleton-to-scoped и singleton-to-transient через касты
- утечки из фабрик, которые захватили внешний контейнер
- синхронные singleton-циклы
- синхронные transient-циклы
- неправильное использование динамических ключей, обходящее статическую проверку

```ts
const root = new Container({ strict: true })
```

## Быстрый режим

Используйте `strict: false` только после того, как тесты доказывают форму графа:

```ts
const root = new Container({ strict: false })
```

Быстрый режим убирает runtime-учёт циклов и времени жизни из пути resolve. Он не меняет контракт на уровне типов, но не защищает от нечестных кастов, захваченных внешних контейнеров и циклов.

Рекомендуемый процесс: разрабатывать и тестировать в strict mode, а затем переключать только критичные к производительности production-графы после аудита.
