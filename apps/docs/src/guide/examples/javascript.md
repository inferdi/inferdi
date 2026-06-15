---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/javascript#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guide"
          "item": "https://inferdi.com/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Examples"
          "item": "https://inferdi.com/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "JavaScript Usage"
          "item": "https://inferdi.com/guide/examples/javascript"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/javascript#article"
      "headline": "Using InferDI from JavaScript — ESM, CommonJS, and the browser"
      "name": "JavaScript Usage"
      "description": "Consume the built @inferdi/inferdi npm package from plain JavaScript: Node ESM with // @ts-check and JSDoc constructor types, CommonJS require() through the exports map, and browser ESM for Vite and other bundlers."
      "url": "https://inferdi.com/guide/examples/javascript"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/javascript"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "JavaScript, Node.js >=16, @inferdi/inferdi"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, JavaScript, ESM, CommonJS, JSDoc, ts-check, browser, Vite, dependency injection"
      "articleSection": "Examples"
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
