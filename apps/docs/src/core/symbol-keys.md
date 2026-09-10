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

| Pattern                         | Token                    |
|---------------------------------|--------------------------|
| Private module-local service    | `Symbol('name')`         |
| Shared identity without imports | `Symbol.for('name')`     |
| Nominal type-level distinction  | `unique symbol` constant |

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

Either key may be a string or symbol; the primary and companion do not need to
use the same key type.

Key collision checks keep the string and symbol domains separate. A broad `string` key can follow symbol-only registrations, but TypeScript rejects it after any string key because its runtime value may name that existing registration. Union keys follow the same rule: every possible member must be fresh. A `lazyKey` is checked against both the graph and its primary key.

## Same Value Shape {#same-value-shape}

A `unique symbol` makes a key nominal, but it does not make two structurally identical service values different constructor arguments. Brand the value contracts when their semantic order must be nominal:

```ts
type PrimaryDsn = string & { readonly __brand: 'primary' }
type ReplicaDsn = string & { readonly __brand: 'replica' }

class Queries {
  constructor(readonly primary: PrimaryDsn, readonly replica: ReplicaDsn) {}
}
```
