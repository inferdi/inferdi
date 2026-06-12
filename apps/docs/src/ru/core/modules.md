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
