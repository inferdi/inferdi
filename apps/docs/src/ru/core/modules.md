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

Переиспользуемый именованный модуль объявляет только требования и результат через `Module<TRequirements, TProvides>`. В actual graph могут быть дополнительные регистрации; они сохраняются в результате.

```ts
import {
  Container,
  type Module,
  type SpecMap
} from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Requirements, Provides> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

const app = new Container()
  .registerValue('config', { env: 'test' })
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

Callback видит только `Container<TRequirements>`. Требования проверяются по типу сервиса, точному lifetime, sync/async-режиму, managed-lazy режиму и готовности scope inputs. Outputs не могут пересекаться ни с одним ключом actual graph. Для отсутствующих и несовместимых требований и collisions используются именованные diagnostics.

## Динамические импорты

Используйте `import()`, когда опциональный или привязанный к маршруту модуль должен загружаться отдельным JavaScript-чанком.

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

Runtime загружает и выполняет `reports.module` до вызова `.use()`. Затем `.use()` синхронно запускает модуль, добавляет регистрации и возвращает контейнер с выведенным типом. Динамический импорт не делает сервисы асинхронными. Если асинхронна сама инициализация сервиса, используйте `registerAsyncFactory`.

Во frontend применяйте этот подход на границе маршрута или функции, только если сборщик создаёт отдельный чанк и тот же модуль нигде не импортируется статически. Создавайте контейнер функции после загрузки чанка. На backend для обычного старта предпочтительнее статические импорты. Динамический импорт полезен для опциональных функций, выбранных конфигурацией развёртывания, и чувствительных к cold start serverless-путей, где неиспользуемый код и зависимости не должны загружаться. В обоих runtime соберите контейнер до первого resolve или `createScope()` и не меняйте контейнер приложения для каждого запроса.

Если ключ выбирается во время выполнения, перед resolve используйте [type guard `.has()`](./type-safety#динамические-ключи).
