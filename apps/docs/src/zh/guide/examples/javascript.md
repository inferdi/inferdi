---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples/javascript#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "首页"
          "item": "https://inferdi.com/zh/"
        - "@type": "ListItem"
          "position": 2
          "name": "指南"
          "item": "https://inferdi.com/zh/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "示例"
          "item": "https://inferdi.com/zh/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "JavaScript 用法"
          "item": "https://inferdi.com/zh/guide/examples/javascript"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples/javascript#article"
      "headline": "在 JavaScript 中使用 InferDI — ESM、CommonJS 和浏览器"
      "name": "JavaScript 用法"
      "description": "从纯 JavaScript 使用已构建的 @inferdi/inferdi npm 包：配合 // @ts-check 和 JSDoc 构造函数类型的 Node ESM、通过 exports 映射的 CommonJS require()，以及面向 Vite 和其他打包工具的浏览器 ESM。"
      "url": "https://inferdi.com/zh/guide/examples/javascript"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples/javascript"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "JavaScript, Node.js >=16, @inferdi/inferdi"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, JavaScript, ESM, CommonJS, JSDoc, ts-check, 浏览器, Vite, 依赖注入"
      "articleSection": "示例"
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
