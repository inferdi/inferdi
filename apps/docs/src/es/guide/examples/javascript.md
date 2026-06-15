---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/javascript#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guía"
          "item": "https://inferdi.com/es/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Ejemplos"
          "item": "https://inferdi.com/es/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Uso con JavaScript"
          "item": "https://inferdi.com/es/guide/examples/javascript"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/javascript#article"
      "headline": "Uso de InferDI desde JavaScript — ESM, CommonJS y el navegador"
      "name": "Uso con JavaScript"
      "description": "Consume el paquete npm compilado @inferdi/inferdi desde JavaScript puro: ESM en Node con // @ts-check y tipos de constructor mediante JSDoc, require() de CommonJS a través del mapa de exports, y ESM para el navegador con Vite y otros bundlers."
      "url": "https://inferdi.com/es/guide/examples/javascript"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/javascript"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "JavaScript, Node.js >=16, @inferdi/inferdi"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, JavaScript, ESM, CommonJS, JSDoc, ts-check, navegador, Vite, inyección de dependencias"
      "articleSection": "Ejemplos"
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
