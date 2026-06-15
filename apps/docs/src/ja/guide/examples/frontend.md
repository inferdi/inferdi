---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/frontend#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "ホーム"
          "item": "https://inferdi.com/ja/"
        - "@type": "ListItem"
          "position": 2
          "name": "ガイド"
          "item": "https://inferdi.com/ja/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "例"
          "item": "https://inferdi.com/ja/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "フロントエンドフレームワーク"
          "item": "https://inferdi.com/ja/guide/examples/frontend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/frontend#article"
      "headline": "React、React Native、Vue での InferDI スコープ"
      "name": "フロントエンドフレームワーク"
      "description": "React、React Native、Vue 3 のページ、ルート、画面、機能の境界で InferDI スコープを作成し、スコープを子に提供してアンマウント時にクリーンアップを実行します。"
      "url": "https://inferdi.com/ja/guide/examples/frontend"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/frontend"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, React, React Native, Vue 3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, React, React Native, Vue 3, provide inject, 機能スコープ, 依存性注入"
      "articleSection": "例"
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

# フロントエンドフレームワーク

フロントエンドの例では、ページ、ルート、画面、または機能の境界でスコープを作成します。サーバーサイドの共有モジュールをインポートする代わりに、それぞれが小さな独自のビルダーを保持します。

各フレームワークがどこでスコープを作成し、どのようにスコープを子に提供し、アンマウント時にどのようにクリーンアップを実行するかを比較してください。

| 例 | 内容 |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | 遅延 `useState` とクリーンアップを伴う React の機能スコープ |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | React Native の画面スコープ |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Vue 3 の provide/inject によるスコープ境界 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Svelte の context によるスコープ境界 |

## React

<<< ../../../../../../examples/frontend/react.tsx

リポジトリのファイル: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

リポジトリのファイル: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

リポジトリのファイル: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

リポジトリのファイル: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
