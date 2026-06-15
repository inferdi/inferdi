---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/core/modules#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "コアコンセプト"
          "item": "https://inferdi.com/ja/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "モジュール"
          "item": "https://inferdi.com/ja/core/modules"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/core/modules#article"
      "headline": "InferDI のモジュール — .use() でビルダーを合成する"
      "name": "モジュール"
      "description": "大きなコンテナビルダーを .use() で小さな部品に分割しつつ、フルーエントチェーン全体で完全な型推論を維持する方法と、ジェネリックモジュールがなぜ既知の入力形状を必要とするのかを理解します。"
      "url": "https://inferdi.com/ja/core/modules"
      "mainEntityOfPage": "https://inferdi.com/ja/core/modules"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, モジュール, use, コンテナ合成, 型推論, Module 型, 依存性注入"
      "articleSection": "コアコンセプト"
      "isPartOf":
        "@type": "WebSite"
        "@id": "https://inferdi.com/#website"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "about":
        "@type": "SoftwareApplication"
        "name": "InferDI"
        "applicationCategory": "DeveloperApplication"
        "operatingSystem": "Node.js, Bun, Deno, Browser"
      "author":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
      "publisher":
        "@type": "Organization"
        "name": "InferDI"
        "url": "https://inferdi.com/"
        "logo":
          "@type": "ImageObject"
          "url": "https://inferdi.com/logo.png"
---

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
