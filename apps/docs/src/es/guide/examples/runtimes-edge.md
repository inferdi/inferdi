---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/runtimes-edge#breadcrumb"
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
          "name": "Runtimes y plataformas edge"
          "item": "https://inferdi.com/es/guide/examples/runtimes-edge"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/runtimes-edge#article"
      "headline": "InferDI en Node, Bun, Deno y runtimes edge"
      "name": "Runtimes y plataformas edge"
      "description": "Una raíz a nivel de módulo y un scope por petición en HTTP de bajo nivel de Node, Bun serve, HTTP de Deno y funciones edge — usando await using para manejadores acotados y liberación explícita para trabajo en streaming o en segundo plano."
      "url": "https://inferdi.com/es/guide/examples/runtimes-edge"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/runtimes-edge"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Node.js, Bun, Deno, Supabase Edge Functions, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, runtimes, edge, Node HTTP, Bun, Deno, Supabase Edge Functions, await using, scope de petición"
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

# Runtimes y plataformas edge

Los ejemplos de runtime usan una raíz a nivel de módulo y crean un scope por petición. Los manejadores acotados pueden usar `await using`; el trabajo en streaming o en segundo plano debe liberarse una vez que ese trabajo termine.

La mayoría de los ejemplos comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Supabase Edge Functions usa un cambio de factoría local manteniendo la misma disciplina de scope de petición.

| Ejemplo | Muestra |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | Ciclo de vida HTTP de bajo nivel en Node con limpieza en la respuesta |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Scope de petición de `serve` de Bun |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Scope de petición HTTP de Deno |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Scope de petición de Cloudflare Workers y secuenciación de `ctx.waitUntil` |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Scope de petición de Vercel Edge y limpieza en segundo plano |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Scope de petición de Deno Deploy y limpieza con `info.waitUntil` |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions con un cambio de factoría personalizado |

## Node HTTP

<<< ../../../../../../examples/runtimes-edge/node-http.ts

Archivo del repositorio: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../../examples/runtimes-edge/bun-serve.ts

Archivo del repositorio: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../../examples/runtimes-edge/deno-http.ts

Archivo del repositorio: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

<<< ../../../../../../examples/runtimes-edge/cloudflare-workers.ts

Archivo del repositorio: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../../examples/runtimes-edge/vercel-edge.ts

Archivo del repositorio: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../../examples/runtimes-edge/deno-deploy.ts

Archivo del repositorio: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Archivo del repositorio: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
