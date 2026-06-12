# モジュール

`.use()` を使用すると、大きなコンテナビルダーを小さな部品に分割しつつ、フルーエントチェーン全体で型推論を維持できます。

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

インラインのラムダがもっとも扱いやすい形です。ラムダのコンテナ型は、チェーンの前段で登録されたキーを含めて、呼び出し箇所から推論されます。

## 名前付きモジュール

再利用可能で形が固定されたモジュールには、エクスポートされた `Module<TIn, TOut>` 型を使用します。

```ts
import {
  Container,
  type Module,
  type SpecMap,
} from '@inferdi/inferdi'

type Base = SpecMap<{ config: { env: string } }>
type Added = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Base, Added> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}
```

`<T>(c: Container<T>) => ...` のようなジェネリックなモジュール関数は、本体内でキーの一意性を表現できません。インラインのラムダ、または形が固定された `Module<TIn, TOut>` 宣言を使用してください。

## 動的チェック

`.has(key)` は、動的キーに対する型ガードです:

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` は決して値を解決せず、破棄済みのコンテナに対しては `false` を返します。
