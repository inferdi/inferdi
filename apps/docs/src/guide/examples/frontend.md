---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/frontend#breadcrumb"
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
          "name": "Frontend Frameworks"
          "item": "https://inferdi.com/guide/examples/frontend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/frontend#article"
      "headline": "InferDI scopes in React, React Native, and Vue"
      "name": "Frontend Frameworks"
      "description": "Create InferDI scopes at page, route, screen, or feature boundaries in React, React Native, and Vue 3 — providing the scope to children and running cleanup on unmount."
      "url": "https://inferdi.com/guide/examples/frontend"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/frontend"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, React, React Native, Vue 3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, React, React Native, Vue 3, provide inject, feature scope, dependency injection"
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

# Frontend Frameworks

Frontend examples create scopes at page, route, screen, or feature boundaries. They keep their own small builders instead of importing the server-side shared module.

Compare where each framework creates the scope, how the scope is provided to children, and how cleanup runs on unmount.

| Example | Shows |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | React feature scope with lazy `useState` and cleanup |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | React Native screen scope |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Vue 3 provide/inject scope boundary |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Svelte context scope boundary |

## React

<<< ../../../../../examples/frontend/react.tsx

Repository file: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../examples/frontend/react-native.tsx

Repository file: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../examples/frontend/vue.ts

Repository file: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../examples/frontend/svelte.ts

Repository file: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
