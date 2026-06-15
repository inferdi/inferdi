---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/guide/examples/runtimes-edge#breadcrumb"
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
          "name": "Runtimes and Edge Platforms"
          "item": "https://inferdi.com/guide/examples/runtimes-edge"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/guide/examples/runtimes-edge#article"
      "headline": "InferDI on Node, Bun, Deno, and edge runtimes"
      "name": "Runtimes and Edge Platforms"
      "description": "A module-level root and one scope per request across low-level Node HTTP, Bun serve, Deno HTTP, and edge functions — using await using for bounded handlers and explicit disposal for streaming or background work."
      "url": "https://inferdi.com/guide/examples/runtimes-edge"
      "mainEntityOfPage": "https://inferdi.com/guide/examples/runtimes-edge"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, Node.js, Bun, Deno, Supabase Edge Functions, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, runtimes, edge, Node HTTP, Bun, Deno, Supabase Edge Functions, await using, request scope"
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

# Runtimes and Edge Platforms

Runtime examples use a module-level root and create one scope per request. Bounded handlers can use `await using`; streaming or background work should dispose after that work settles.

Most examples share [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Supabase Edge Functions uses a local factory swap while keeping the same request-scope discipline.

| Example | Shows |
| --- | --- |
| [`node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts) | Low-level Node HTTP lifecycle with response cleanup |
| [`bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts) | Bun `serve` request scope |
| [`deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts) | Deno HTTP request scope |
| [`cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts) | Cloudflare Workers request scope and `ctx.waitUntil` sequencing |
| [`vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts) | Vercel Edge request scope and background cleanup |
| [`deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts) | Deno Deploy request scope and `info.waitUntil` cleanup |
| [`supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts) | Supabase Edge Functions with a custom factory swap |

## Node HTTP

<<< ../../../../../examples/runtimes-edge/node-http.ts

Repository file: [`examples/runtimes-edge/node-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/node-http.ts)

## Bun Serve

<<< ../../../../../examples/runtimes-edge/bun-serve.ts

Repository file: [`examples/runtimes-edge/bun-serve.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/bun-serve.ts)

## Deno HTTP

<<< ../../../../../examples/runtimes-edge/deno-http.ts

Repository file: [`examples/runtimes-edge/deno-http.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-http.ts)

## Cloudflare Workers

<<< ../../../../../examples/runtimes-edge/cloudflare-workers.ts

Repository file: [`examples/runtimes-edge/cloudflare-workers.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/cloudflare-workers.ts)

## Vercel Edge

<<< ../../../../../examples/runtimes-edge/vercel-edge.ts

Repository file: [`examples/runtimes-edge/vercel-edge.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/vercel-edge.ts)

## Deno Deploy

<<< ../../../../../examples/runtimes-edge/deno-deploy.ts

Repository file: [`examples/runtimes-edge/deno-deploy.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/deno-deploy.ts)

## Supabase Edge Functions

<<< ../../../../../examples/runtimes-edge/supabase-edge-functions.ts

Repository file: [`examples/runtimes-edge/supabase-edge-functions.ts`](https://github.com/inferdi/inferdi/blob/main/examples/runtimes-edge/supabase-edge-functions.ts)
