---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/ja/guide/examples/javascript#breadcrumb"
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
          "name": "JavaScript での利用"
          "item": "https://inferdi.com/ja/guide/examples/javascript"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/ja/guide/examples/javascript#article"
      "headline": "JavaScript から InferDI を使う — ESM、CommonJS、ブラウザ"
      "name": "JavaScript での利用"
      "description": "ビルド済みの @inferdi/inferdi npm パッケージを素の JavaScript から利用します。// @ts-check と JSDoc のコンストラクター型を使った Node ESM、exports マップ経由の CommonJS require()、そして Vite やその他のバンドラー向けのブラウザ ESM。"
      "url": "https://inferdi.com/ja/guide/examples/javascript"
      "mainEntityOfPage": "https://inferdi.com/ja/guide/examples/javascript"
      "inLanguage": "ja-JP"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "JavaScript, Node.js >=16, @inferdi/inferdi"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, JavaScript, ESM, CommonJS, JSDoc, ts-check, ブラウザ, Vite, 依存性注入"
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

# JavaScript での利用

InferDI は TypeScript で書かれていますが、JavaScript プロジェクトはパッケージの exports マップを通じてビルド済みの npm パッケージを利用します。

| 例 | 内容 |
| --- | --- |
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | `// @ts-check` と JSDoc のコンストラクタ型を用いた Node の ESM インポート |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | パッケージの exports マップを通じた Node の CommonJS `require()` |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | Vite やその他のバンドラー向けのブラウザ指向 ESM |

## Node ESM

<<< ../../../../../../examples/javascript/node-esm.mjs{ js}

リポジトリのファイル: [`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../../examples/javascript/node-commonjs.cjs{ js}

リポジトリのファイル: [`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## ブラウザでの Vite 利用

<<< ../../../../../../examples/javascript/browser-vite.js

リポジトリのファイル: [`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)
