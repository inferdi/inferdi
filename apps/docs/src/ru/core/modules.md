# Модули

Используйте `.use()`, чтобы разбить код сборки большого контейнера на части и сохранить вывод типов по всей цепочке вызовов.

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

Удобнее всего передать лямбда-функцию прямо в `.use()`. Тип её контейнера выводится в месте вызова и включает все ключи, зарегистрированные ранее в цепочке.

## Именованные модули

Именованный модуль описывает свои требования и добавляемые сервисы через `Module<TRequirements, TProvides>`. Граф, к которому подключают модуль, может содержать и другие регистрации: они сохранятся в результате.

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

Функция модуля видит только `Container<TRequirements>`. Проверяется совместимость типов сервисов, точное совпадение времени жизни, синхронного или асинхронного режима, режима управляемой ленивой обёртки и готовности входных данных скоупа. Добавляемые ключи не должны совпадать ни с одним ключом фактического графа. Для отсутствующих или несовместимых требований и конфликтов ключей предусмотрены отдельные диагностические сообщения.

## Динамические импорты

Используйте `import()`, когда опциональный или привязанный к маршруту модуль должен загружаться отдельным JavaScript-чанком.

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

Среда выполнения загружает и выполняет `reports.module` до вызова `.use()`. Затем `.use()` синхронно запускает модуль, добавляет регистрации и возвращает контейнер с выведенным типом. Динамический импорт не делает сервисы асинхронными. Если асинхронна сама инициализация сервиса, используйте `registerAsyncFactory`.

В браузере такой подход используйте для маршрута или отдельной части приложения, если сборщик выделяет модуль в отдельный чанк и нигде нет его статического импорта. Собирайте контейнер этой части приложения после загрузки чанка. На сервере при обычном запуске предпочтительны статические импорты. Динамические полезны для необязательных возможностей, включаемых конфигурацией развёртывания, и serverless-обработчиков, где важен холодный старт: неиспользуемый код и его зависимости не загружаются. В обоих случаях завершите сборку контейнера до первого получения сервиса или `createScope()`. Не меняйте контейнер приложения при каждом запросе.

Если ключ выбирается во время выполнения, перед получением сервиса используйте [проверку типа через `.has()`](./type-safety#динамические-ключи).

## Проверка компилятором

Именованный модуль нельзя подключить, пока в графе нет объявленных требований:

```ts twoslash
// @errors: 2345
import { Container, type Module, type SpecMap } from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ feature: string }>

const addFeature: Module<Requirements, Provides> = (container) =>
  container.registerFactory('feature', (c) => c.get('config').env, ['config'])

new Container().use(addFeature) // [!code error]

const app = new Container()
  .registerValue('config', { env: 'test' })
  .use(addFeature)

const feature = app.get('feature')
//    ^?
```
