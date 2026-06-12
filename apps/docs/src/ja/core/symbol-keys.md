# Symbol キー

すべての登録キーは `string` または `symbol` にできます。文字列は、アプリ全体で公開されるサービスに便利です。Symbol は、同一性が重要な場合に役立ちます。

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

## Symbol を使うべきとき

| パターン | トークン |
| --- | --- |
| モジュールローカルなプライベートサービス | `Symbol('name')` |
| インポートなしで共有される同一性 | `Symbol.for('name')` |
| 公称的な型レベルの区別 | `unique symbol` 定数 |

回収可能なプライベートサービスには、ローカルな symbol を使用してください。`Symbol.for(name)` はグローバルな symbol レジストリに格納され、決してガベージコレクションされません。

## Lazy コンパニオン

lazy コンパニオンのキーも symbol にできます:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

主キーとコンパニオンキーは、同じ種類である必要はありません。
