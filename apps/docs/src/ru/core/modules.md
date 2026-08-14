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
  type SpecMap,
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
  .registerValue('config', {env: 'test'})
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

Callback видит только `Container<TRequirements>`. Требования проверяются по типу сервиса, точному lifetime, sync/async-режиму, managed-lazy режиму и готовности scope inputs. Outputs не могут пересекаться ни с одним ключом actual graph. Для отсутствующих и несовместимых требований и collisions используются именованные diagnostics.

Если ключ выбирается во время выполнения, перед resolve используйте [type guard `.has()`](./type-safety#динамические-ключи).
