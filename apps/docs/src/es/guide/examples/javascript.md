# Uso con JavaScript

InferDI está escrito en TypeScript, pero los proyectos de JavaScript consumen el paquete npm compilado a través del mapa de exports del paquete.

| Ejemplo | Muestra |
| --- | --- |
| [`node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs) | Importación ESM en Node con `// @ts-check` y tipos de constructor mediante JSDoc |
| [`node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs) | `require()` de CommonJS en Node a través del mapa de exports del paquete |
| [`browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js) | ESM orientado al navegador para Vite u otro bundler |

## Node ESM

<<< ../../../../../../examples/javascript/node-esm.mjs{ js}

Archivo del repositorio: [`examples/javascript/node-esm.mjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-esm.mjs)

## Node CommonJS

<<< ../../../../../../examples/javascript/node-commonjs.cjs{ js}

Archivo del repositorio: [`examples/javascript/node-commonjs.cjs`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/node-commonjs.cjs)

## Navegador con Vite

<<< ../../../../../../examples/javascript/browser-vite.js

Archivo del repositorio: [`examples/javascript/browser-vite.js`](https://github.com/inferdi/inferdi/blob/main/examples/javascript/browser-vite.js)
