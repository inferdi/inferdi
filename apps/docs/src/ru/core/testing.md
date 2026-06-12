# Тестирование

Используйте `.override()`, когда тестам нужно заменить существующую регистрацию на мок.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

Значение override должно быть совместимо с исходным зарегистрированным типом. Отсутствующие ключи и несовместимые моки дают ошибки TypeScript.

## Когда делать override

Overrides должны происходить до первого resolve ключа:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

Вторая строка бросит ошибку. Поздний override расколол бы граф: существующие потребители держали бы старый экземпляр, а новые resolve возвращали бы мок.

## Владение

Override-значения принадлежат внешнему коду. Как и `registerValue`, override не добавляется в очередь dispose контейнера. Очистка остаётся за тестовой фикстурой.

## Локальность scope

Override меняет только контейнер, на котором вызван:

```ts
const scope = root.createScope().override('db', mockDb)
```

Корневой контейнер и соседние scopes не меняются. Overrides на уровне родителя видны через обычный поиск в родительском контейнере.
