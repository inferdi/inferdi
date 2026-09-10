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

## Ключи ленивых обёрток {#lazy-companion-ключи}

Ключ ленивой обёртки тоже может иметь тип `symbol`:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

Основной ключ и ключ ленивой обёртки не обязаны быть одного вида.

Проверка конфликтов различает строковые и символьные ключи. Широкий тип `string` допустим, если в графе пока есть только символьные ключи. После любой строковой регистрации TypeScript его отклонит: фактическое значение может совпасть с существующим ключом. Если тип ключа представляет собой объединение, новым должен быть каждый возможный вариант. `lazyKey` проверяется на пересечение и с графом, и с основным ключом.

## Одинаковая форма значений {#same-value-shape}

`unique symbol` даёт номинальную идентичность ключу, но не различает два структурно одинаковых значения в аргументах конструктора. Если порядок должен быть номинальным, брендируйте контракты значений:

```ts
type PrimaryDsn = string & { readonly __brand: 'primary' }
type ReplicaDsn = string & { readonly __brand: 'replica' }

class Queries {
  constructor(readonly primary: PrimaryDsn, readonly replica: ReplicaDsn) {}
}
```
