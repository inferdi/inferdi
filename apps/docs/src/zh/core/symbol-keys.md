# Symbol 键

每个注册键都可以是 `string` 或 `symbol`。字符串便于用于全应用范围的公共服务。当标识本身很重要时，symbol 会很有用。

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

## 何时使用 Symbol

| 模式 | 令牌 |
| --- | --- |
| 模块本地的私有服务 | `Symbol('name')` |
| 无需导入即可共享标识 | `Symbol.for('name')` |
| 类型层面的标称区分 | `unique symbol` 常量 |

对可回收的私有服务使用局部 symbol。`Symbol.for(name)` 会存储在全局 symbol 注册表中，永远不会被垃圾回收。

## 惰性伴随项

惰性伴随项的键也可以是 symbol：

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

主键和伴随项键不需要是相同的种类。
