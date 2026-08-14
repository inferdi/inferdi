# JavaScript 用法

InferDI 使用 TypeScript 编写，但 JavaScript 项目通过 package exports 映射来使用已构建的 npm 包。

| 示例 | 展示内容 |
| --- | --- |
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | 在 Node 中使用 ESM 导入，配合 `// @ts-check` 和 JSDoc 构造函数类型 |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | 在 Node 中通过 package exports 映射使用 CommonJS `require()` |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | 面向浏览器的 ESM，适用于 Vite 或其他打包工具 |

## Node ESM

<<< ../../../../../../examples/javascript/node-esm.mjs{ js}

仓库文件：[`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../../examples/javascript/node-commonjs.cjs{ js}

仓库文件：[`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## 在浏览器中使用 Vite

<<< ../../../../../../examples/javascript/browser-vite.js

仓库文件：[`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)
