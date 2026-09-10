# Utilisation en JavaScript

InferDI est écrit en TypeScript, mais les projets JavaScript utilisent le paquet npm compilé via sa table d’exports.

| Exemple | Contenu |
|---|---|
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | Import ESM Node avec `// @ts-check` et types de constructeur en JSDoc |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | `require()` CommonJS Node via la table d’exports |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | ESM pour navigateur avec Vite ou un autre bundler |

## Node ESM

<<< ../../../../../../examples/javascript/node-esm.mjs{ js}

Fichier du dépôt : [`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../../examples/javascript/node-commonjs.cjs{ js}

Fichier du dépôt : [`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## Navigateur avec Vite

<<< ../../../../../../examples/javascript/browser-vite.js

Fichier du dépôt : [`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)

