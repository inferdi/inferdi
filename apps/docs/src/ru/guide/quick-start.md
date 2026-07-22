---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ru/guide/quick-start#breadcrumb"
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
          "name": "Быстрый старт"
          "item": "https://inferdi.com/ru/guide/quick-start"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ru/guide/quick-start#article"
      "headline": "Быстрый старт InferDI: первый типизированный граф зависимостей"
      "name": "Быстрый старт"
      "description": "Стройте граф зависимостей через fluent API InferDI. TypeScript проверяет аргументы конструктора при регистрации сервисов, а кешированный resolve использует один Map.get()."
      "url": "https://inferdi.com/ru/guide/quick-start"
      "mainEntityOfPage": "https://inferdi.com/ru/guide/quick-start"
      "inLanguage": "ru-RU"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, быстрый старт, внедрение зависимостей, DI в TypeScript, container, fluent API, типобезопасность"
      "articleSection": "Руководство"
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

# Быстрый старт

Граф зависимостей строится через fluent API, а TypeScript проверяет его по ходу: каждый кортеж зависимостей сопоставляется с параметрами конструктора, поэтому перепутанный или пропущенный аргумент становится ошибкой компиляции, а не сюрпризом во время выполнения. Здесь нет декораторов `@Injectable()` и `reflect-metadata` - связывание описано обычным кодом, который понимает компилятор.

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string,
  ) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

`registerClass('userRepo', UserRepo, ['logger', 'dsn'])` проверяется позиционно. Если заменить кортеж на `['dsn', 'logger']`, TypeScript покажет ошибку до запуска приложения.

## Получение значения

Для получения значения используйте `.get(key)`:

```ts
const repo = container.get('userRepo')
```

Ключ должен быть зарегистрирован в типе контейнера. Неизвестный статический ключ даёт ошибку компиляции. Динамические ключи сначала проверяйте через `.has(key)`.

## Время жизни

По умолчанию регистрации имеют время жизни `singleton`. Для классов оно передаётся четвёртым аргументом, для фабрик - третьим.

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| Вид | Создание | Кеш | Очистка |
| --- | --- | --- | --- |
| `singleton` | один раз на контейнер-владелец | да | да |
| `scoped` | один раз на scope | да | да |
| `transient` | при каждом вызове `.get()` | нет | нет |

Singleton не может напрямую зависеть от `scoped` или `transient` сервиса. Это правило проверяется типами и runtime-защитой в strict mode.
