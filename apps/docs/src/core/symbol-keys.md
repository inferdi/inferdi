# Symbol Keys

Every registration key can be a `string` or a `symbol`. Strings are convenient for app-wide public services. Symbols are useful when identity matters.

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

## When To Use Symbols

| Pattern | Token |
| --- | --- |
| Private module-local service | `Symbol('name')` |
| Shared identity without imports | `Symbol.for('name')` |
| Nominal type-level distinction | `unique symbol` constant |

Use local symbols for collectable private services. `Symbol.for(name)` is stored in the global symbol registry and is never garbage-collected.

## Lazy Companions

The lazy companion key can also be a symbol:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

The primary key and companion key do not need to be the same kind.
