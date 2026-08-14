# JavaScript

InferDI написан на TypeScript, но JavaScript-проекты используют собранный npm-пакет через карту package exports.

| Пример | Что показывает |
| --- | --- |
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | ESM-импорт в Node с `// @ts-check` и типами конструкторов через JSDoc |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | CommonJS `require()` в Node через package exports |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | ESM для браузера через Vite или другой сборщик |

## Node ESM

<<< ../../../../../../examples/javascript/node-esm.mjs{ js}

Файл в репозитории: [`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../../examples/javascript/node-commonjs.cjs{ js}

Файл в репозитории: [`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## Браузер с Vite

<<< ../../../../../../examples/javascript/browser-vite.js

Файл в репозитории: [`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)
