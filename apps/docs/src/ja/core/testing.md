# テストとオーバーライド

テストで既存の登録をモックに置き換える必要がある場合は、`.override()` を使用します。

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

オーバーライドの値は、元々登録された型に代入可能でなければなりません。存在しないキーや互換性のないモックは TypeScript エラーになります。

## オーバーライドのタイミング

オーバーライドは、キーが解決される前に行わなければなりません:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

この 2 行目はスローします。遅れたオーバーライドはグラフを分裂させます。既存の利用者は古いインスタンスを保持し続ける一方で、後続の解決はモックを返すことになるためです。

## 所有権

オーバーライドの値は外部によって所有されます。`registerValue` と同様に、オーバーライドはコンテナの破棄キューに追加されません。クリーンアップはテストフィクスチャが所有します。

## スコープの局所性

オーバーライドは、呼び出されたコンテナのみを変更します:

```ts
const scope = root.createScope().override('db', mockDb)
```

ルートおよび兄弟スコープは変更されません。親レベルのオーバーライドは、通常の親ルックアップを通じて参照できます。
