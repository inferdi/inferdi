---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/fullstack#breadcrumb"
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
          "name": "Full-Stack Frameworks"
          "item": "https://inferdi.com/guide/examples/fullstack"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/fullstack#article"
      "headline": "InferDI scopes in Next.js and Remix"
      "name": "Full-Stack Frameworks"
      "description": "Use InferDI scopes for loaders, actions, route handlers, and server actions in Next.js App Router and Remix, with a globalThis-cached root that survives HMR in development."
      "url": "https://inferdi.com/guide/examples/fullstack"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/fullstack"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Next.js, Remix, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Next.js, Remix, App Router, server actions, loaders, dependency injection"
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

# Full-Stack Frameworks

Full-stack examples use scopes for loaders, actions, route handlers, and server actions. Development builds cache the root on `globalThis` to avoid duplicate clients during HMR.

Both examples share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compare the operation boundary that each framework awaits.

| Example | Shows |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Next.js App Router request and Server Action scope boundaries |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Remix loader and action scope boundaries |

## Next.js App Router

<<< ../../../../../examples/fullstack/next-app-router.ts

Repository file: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../examples/fullstack/remix.ts

Repository file: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
