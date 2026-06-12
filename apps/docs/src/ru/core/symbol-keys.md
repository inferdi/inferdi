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

## Lazy companion-ключи

Ключ lazy companion тоже может быть типа Symbol:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

Основной ключ и companion-ключ не обязаны быть одного вида.
