# Плохие практики

После каждого вызова `register*` используйте ссылку, которую вернул метод. Старая ссылка хранит прежний тип графа, хотя указывает на тот же объект контейнера.

<h6 id="stale-builder-references" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>

## Повторное использование старой ссылки

Каждый метод `register*` изменяет контейнер и возвращает тот же объект с расширенным обобщённым типом. TypeScript расширяет тип результата, но не меняет тип ссылок, созданных до вызова.

```ts
class Consumer {
  constructor(readonly dependency: number) {}
}

const base = new Container()
const syncGraph = base
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

// Код компилируется, потому что base по-прежнему имеет тип Container<{}>.
base.registerAsyncFactory('dependency', async () => 2, [])

// TypeScript видит number, но новая регистрация передаёт Promise<number>.
syncGraph.get('consumer').dependency
```

`base` и `syncGraph` указывают на один объект. Последний вызов перезаписывает фактическую регистрацию `dependency`, а тип `syncGraph` продолжает описывать исходный синхронный граф. Классы, зарегистрированные до перезаписи, сохраняют прежнюю классификацию зависимостей.

## Почему компилятор разрешает такой код

Проверка дубликатов использует ключи из типа графа у текущей ссылки. Тип `syncGraph` содержит `dependency`, поэтому регистрация этого ключа через `syncGraph` вызовет ошибку типа. Тип `base` остаётся `Container<{}>`, где `keyof T` равен `never`.

TypeScript не обновляет параметры типов у всех ссылок на мутабельный объект. В языке также нет линейных или аффинных типов, которые могли бы пометить `base` использованным после регистрации. InferDI не добавляет поиск по реестру в каждую регистрацию для отслеживания старых ссылок: такая проверка замедлила бы корректно собранные графы.

## Используйте последнюю возвращённую ссылку

Собирайте граф одной цепочкой и работайте с её результатом:

```ts
const container = new Container()
  .registerValue('dependency', 1)
  .registerClass('consumer', Consumer, ['dependency'])

container.get('consumer')
```

Не игнорируйте результат `register*` и не продолжайте регистрацию через старую ссылку. Модуль также должен возвращать контейнер после своей последней регистрации. Подробнее: [Модули](./modules).

## Не используйте `register*` для замены регистрации

Выбирайте каждую регистрацию в приложении один раз при сборке графа. Для выбора реализации по конфигурации используйте обычное ветвление или `.use()`.

В тестах можно вызвать `.override()` до разрешения графа, если замена сохраняет исходное время жизни, режим ленивой обёртки и синхронный или асинхронный режим. `.override()` не может превратить синхронную регистрацию в декларативную асинхронную. Подробнее: [Тестирование и подмена](./testing).

## Service locator в бизнес-логике

Контейнер в доменном сервисе скрывает настоящие зависимости и переносит ошибку отсутствующего ключа к месту вызова. Передавайте сам сервис:

```ts
class UserController {
  constructor(
    private readonly container: AppContainer // [!code --]
    private readonly users: UserRepo // [!code ++]
  ) {}

  show(id: string) {
    return this.container.get('users').find(id) // [!code --]
    return this.users.find(id) // [!code ++]
  }
}
```

Фабрики с доступом к контейнеру допустимы в корне композиции, если такой доступ нужен для сборки приложения.

## Глобальный скоуп запроса {#глобальныи-request-scope}

Изменяемый глобальный скоуп может передать данные одного параллельного запроса другому. Создавайте и закрывайте его на границе запроса:

```ts
let currentScope = root.createScope({ request }) // [!code warning]

async function handle(request: Request) {
  const scope = root.createScope({ request }) // [!code focus]
  try {
    return await scope.getAsync('handler')
  } finally {
    await scope.dispose()
  }
}
```

Фреймворк-адаптеры автоматизируют эту границу и сохраняют те же правила владения.

## Потеря конкретного типа контейнера

Аннотация `Container` стирает накопленное состояние графа. Сохраняйте выведенный тип результата функции сборки:

```ts
const buildContainer = (): Container => new Container() // [!code --]
const buildContainer = () => new Container() // [!code ++]
  .registerClass('users', UserRepo, [])

type AppContainer = ReturnType<typeof buildContainer>
```

Объявляйте типы контейнера и скоупа приложения через `ReturnType`. Не воспроизводите их параметры типов вручную.

## Потеря владения

Если создать скоуп и не предусмотреть освобождение ресурсов, принадлежащие ему scoped-экземпляры останутся неосвобождёнными. Организуйте очистку там же, где начинается и заканчивается работа со скоупом:

```ts
const scope = root.createScope({ request }) // [!code warning]
return scope.get('handler').run()

await using ownedScope = root.createScope({ request }) // [!code focus]
return ownedScope.get('handler').run()
```

Если ваши инструменты сборки не поддерживают `await using`, используйте `try/finally` и `await scope.dispose()`. Значения из `registerValue`, `.override()` и входных данных скоупа, а также transient-результаты принадлежат вызывающему коду. Их ресурсы он освобождает самостоятельно.
