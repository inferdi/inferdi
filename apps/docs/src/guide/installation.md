---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/installation#breadcrumb"
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
          "name": "Installation"
          "item": "https://inferdi.com/guide/installation"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/installation#article"
      "headline": "Install InferDI from npm or JSR"
      "name": "Installation"
      "description": "Install @inferdi/inferdi and its framework adapters from npm or JSR across Node.js, Bun, and Deno. Matching package names and versions, zero runtime dependencies, and no build step or reflect-metadata required."
      "url": "https://inferdi.com/guide/installation"
      "mainEntityOfPage": "https://inferdi.com/guide/installation"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16, Bun, Deno"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, install, npm, JSR, Node.js, Bun, Deno, TypeScript dependency injection"
      "articleSection": "Guide"
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

# Installation

InferDI is published to npm and JSR with matching package names and matching versions. Use npm-compatible installs for Node and Bun, or JSR for Deno and runtimes that prefer TypeScript sources.

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

You can also import directly:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Requirements

| Runtime | Requirement |
| --- | --- |
| Node.js | 16 or newer for the core package |
| Bun | 1.0 or newer |
| Deno | 1.40 or newer |
| TypeScript | 5.6 or newer |

On Node versions before native `Symbol.dispose` and `Symbol.asyncDispose`, InferDI installs a symbol polyfill on import so Explicit Resource Management interop still works.

The published declarations reference the explicit-resource-management library themselves. Consumers targeting ES2022 do not need to add `ESNext.Disposable` to their TypeScript `lib` configuration.

## Adapter Installs

Install the core package, the adapter package, and the framework peer:

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

Each adapter has a dedicated page with its lifecycle rules and type setup.
