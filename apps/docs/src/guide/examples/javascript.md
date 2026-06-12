# JavaScript Usage

InferDI is authored in TypeScript, but JavaScript projects consume the built npm package through the package exports map.

| Example | Shows |
| --- | --- |
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | Node ESM import with `// @ts-check` and JSDoc constructor types |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | Node CommonJS `require()` through the package exports map |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | Browser-oriented ESM for Vite or another bundler |

## Node ESM

<<< ../../../../../examples/javascript/node-esm.mjs{ js}

Repository file: [`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../examples/javascript/node-commonjs.cjs{ js}

Repository file: [`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## Browser with Vite

<<< ../../../../../examples/javascript/browser-vite.js

Repository file: [`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)
