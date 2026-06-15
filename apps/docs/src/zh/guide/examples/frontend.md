---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/zh/guide/examples/frontend#breadcrumb"
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
          "name": "前端框架"
          "item": "https://inferdi.com/zh/guide/examples/frontend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/zh/guide/examples/frontend#article"
      "headline": "React、React Native 和 Vue 中的 InferDI 作用域"
      "name": "前端框架"
      "description": "在 React、React Native 和 Vue 3 中于页面、路由、屏幕或功能边界处创建 InferDI 作用域 —— 将作用域提供给子组件，并在卸载时执行清理。"
      "url": "https://inferdi.com/zh/guide/examples/frontend"
      "mainEntityOfPage": "https://inferdi.com/zh/guide/examples/frontend"
      "inLanguage": "zh-CN"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, React, React Native, Vue 3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, React, React Native, Vue 3, provide inject, 功能作用域, 依赖注入"
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

# 前端框架

前端示例在页面、路由、屏幕或功能边界处创建作用域。它们各自保留小型的构建器，而不是导入服务端的共享模块。

请对比每个框架在何处创建作用域、如何将作用域提供给子组件，以及在卸载时如何执行清理。

| 示例 | 展示内容 |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | React 功能作用域，配合惰性 `useState` 与清理 |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | React Native 屏幕作用域 |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Vue 3 provide/inject 作用域边界 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Svelte context 作用域边界 |

## React

<<< ../../../../../../examples/frontend/react.tsx

仓库文件：[`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

仓库文件：[`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

仓库文件：[`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

仓库文件：[`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
