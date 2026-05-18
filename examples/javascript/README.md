# JavaScript Usage

InferDI is authored in TypeScript, but JavaScript projects consume the built npm package. Node ESM imports and browser bundlers resolve to `dist/index.js`; Node CommonJS `require()` resolves to `dist/index.cjs` through the package `exports` map. Your application does not execute `src/*.ts`.

Install it like any other npm package:

```bash
npm i @inferdi/inferdi
```

## Node ESM

Use [`node-esm.mjs`](./node-esm.mjs) when your Node project uses ESM, either via `.mjs` files or `"type": "module"` in `package.json`.

```js
import { Container } from '@inferdi/inferdi'
```

Run it directly:

```bash
node examples/javascript/node-esm.mjs
```

## Node CommonJS

Use [`node-commonjs.cjs`](./node-commonjs.cjs) when your Node project uses CommonJS.

```js
const { Container } = require('@inferdi/inferdi')
```

Run it directly:

```bash
node examples/javascript/node-commonjs.cjs
```

## Browser with Vite

Use [`browser-vite.js`](./browser-vite.js) for browser projects that resolve npm packages through Vite or another bundler.

```js
import { Container } from '@inferdi/inferdi'
```

Browsers do not resolve npm bare specifiers like `@inferdi/inferdi` by themselves. Vite, Rollup, Webpack, and similar tools rewrite that import to bundled browser JavaScript.

## Type Checking in JavaScript

All examples start with `// @ts-check` and use JSDoc constructor annotations. That lets TypeScript Language Server, which powers VS Code's JavaScript diagnostics, validate InferDI registrations without converting the file to TypeScript.

```js
// @ts-check

class UserService {
  /**
   * @param {Logger} logger
   * @param {string} apiToken
   */
  constructor(logger, apiToken) {}
}

new Container()
  .registerValue('token', 'secret-123')
  .registerClass('logger', Logger, [])
  .registerClass('userService', UserService, ['logger', 'token'])
```

For more complex helpers or factories, JSDoc type imports are valid JavaScript comments and improve autocomplete:

```js
/** @typedef {import('@inferdi/inferdi').Container} Container */
```

Runtime features work fully in JavaScript: scopes, singleton/scoped/transient lifetimes, factories, lazy companions, strict runtime guards, and disposal. The strongest graph checks still come from TypeScript, but `// @ts-check` plus JSDoc gives JavaScript projects useful editor feedback.
