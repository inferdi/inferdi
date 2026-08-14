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
