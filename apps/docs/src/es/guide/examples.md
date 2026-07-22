---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples#breadcrumb"
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
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples#article"
      "headline": "Ejemplos de InferDI — patrones de frameworks y runtimes"
      "name": "Ejemplos"
      "description": "Un mapa de los ejemplos de referencia de InferDI en backends, capas de API, frameworks full-stack, runtimes, frontends y workers. Cada grupo muestra dónde construir la raíz, crear un ámbito de petición y desecharlo."
      "url": "https://inferdi.com/es/guide/examples"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, ejemplos, patrones, inyección de dependencias, ámbito de petición, frameworks, runtimes"
      "articleSection": "Guía"
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

# Ejemplos

El repositorio mantiene los ejemplos como fragmentos de referencia exclusivos de GitHub. El paquete raíz no instala sus dependencias de framework, no comprueba los tipos del directorio `examples/` y no lo publica en npm.

Copia el patrón relevante en tu aplicación e instala allí las dependencias del framework.

Cada grupo a continuación refleja un directorio de [`examples/`](https://github.com/inferdi/inferdi/tree/main/examples). Abre la página de un grupo para comparar los ejemplos de ese grupo en una sola página.

## Empieza aquí

Lee primero [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). La mayoría de los ejemplos del lado del servidor importan este builder para que sus archivos puedan centrarse en el cableado del framework.

| Grupo | Qué comparar |
| --- | --- |
| [Uso en JavaScript](/es/guide/examples/javascript) | Uso con Node ESM, Node CommonJS y bundler de navegador |
| [Frameworks de backend](/es/guide/examples/backend) | Adaptadores de scope de petición para Fastify, Hono, Koa, Express y Elysia |
| [Capas de API](/es/guide/examples/api-layers) | Límites de scope de petición en tRPC, Apollo Server y GraphQL Yoga |
| [Frameworks full-stack](/es/guide/examples/fullstack) | Scopes de loader/action en Next.js App Router y Remix |
| [Runtimes y plataformas edge](/es/guide/examples/runtimes-edge) | Node HTTP, Bun, Deno, Cloudflare Workers, Vercel Edge, Deno Deploy y Supabase Edge |
| [Frameworks de frontend](/es/guide/examples/frontend) | Scopes de feature en React, React Native, Vue y Svelte |
| [Bots, colas y CLI](/es/guide/examples/workers-cli) | Scopes de operación en Telegraf, Grammy, BullMQ, Commander y Yargs |

## Cómo leer los grupos

Usa `examples/_shared/container.ts` como el grafo de la aplicación para los ejemplos del lado del servidor. Las páginas de grupo se centran en la propiedad del ciclo de vida: dónde se crea un scope, dónde se expone y dónde se libera.

Para los ejemplos del lado del servidor y de workers, compara los hooks del ciclo de vida del framework/plataforma. Para los ejemplos de frontend, compara los límites de montaje y desmontaje.
