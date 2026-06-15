---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/fullstack#breadcrumb"
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
          "name": "Frameworks full-stack"
          "item": "https://inferdi.com/es/guide/examples/fullstack"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/fullstack#article"
      "headline": "Scopes de InferDI en Next.js y Remix"
      "name": "Frameworks full-stack"
      "description": "Usa scopes de InferDI para loaders, actions, manejadores de rutas y server actions en el App Router de Next.js y en Remix, con una raíz cacheada en globalThis que sobrevive al HMR en desarrollo."
      "url": "https://inferdi.com/es/guide/examples/fullstack"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/fullstack"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Next.js, Remix, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, Next.js, Remix, App Router, server actions, loaders, inyección de dependencias"
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

# Frameworks full-stack

Los ejemplos full-stack usan scopes para loaders, actions, manejadores de rutas y server actions. Las builds de desarrollo cachean la raíz en `globalThis` para evitar clientes duplicados durante el HMR.

Ambos ejemplos comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compara el límite de operación que espera cada framework.

| Ejemplo | Muestra |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Límites de scope de petición y de Server Action en el App Router de Next.js |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Límites de scope de loader y action en Remix |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

Archivo del repositorio: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

Archivo del repositorio: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
