---
layout: home

hero:
  name: InferDI
  text: Inyección de dependencias tipada para TypeScript moderno
  tagline: Registra servicios de forma explícita, deja que TypeScript compruebe el grafo y conserva una ruta de resolución pequeña.
  image:
    src: /logo.png
    alt: InferDI
  actions:
    - theme: brand
      text: Empezar
      link: /es/guide/quick-start
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/inferdi/inferdi

features:
  - icon:
      src: /fastify.png
      alt: Fastify
    title: Fastify
    details: >-
      Fastify está diseñado para la velocidad, así que la capa de DI no debería estorbar. El adaptador de Fastify v5 se integra en plugins y hooks, crea un scope de petición tipado en onRequest y lo limpia en onResponse.
    link: /es/adapters/fastify
    linkText: Adaptador de Fastify
  - icon:
      src: /hono.png
      alt: Hono
    title: Hono
    details: >-
      Las aplicaciones edge necesitan poco pegamento y arranques rápidos. El adaptador de Hono v4 guarda el scope de petición en variables de contexto, encaja en despliegues de Workers y Bun, y mantiene tipos estrictos en el límite de red.
    link: /es/adapters/hono
    linkText: Adaptador de Hono
  - icon:
      src: /koa.png
      alt: Koa
    title: Koa
    details: >-
      Koa funciona mejor cuando la cadena de middleware se mantiene pequeña y explícita. El adaptador de Koa v3 vincula el contexto de petición a tus servicios mediante un scope tipado sin ocultar el flujo de control asíncrono.
    link: /es/adapters/koa
    linkText: Adaptador de Koa
  - icon:
      src: /express.png
      alt: Express
    title: Express
    details: >-
      Express 5 sigue siendo la opción por defecto familiar para muchas aplicaciones Node. Este adaptador da a esas cadenas de middleware un scope de petición tipado, para que los servicios dejen de filtrarse a través de globales, factorías hechas a mano e imports dispersos.
    link: /es/adapters/express
    linkText: Adaptador de Express
  - icon:
      src: /elysia.png
      alt: Elysia
    title: Elysia
    details: >-
      Elysia v1 ya ofrece tipos de ruta precisos a las aplicaciones Bun. El adaptador lleva esa cadena de tipos hasta tus servicios, conectando cada petición a un scope de DI para que el autocompletado siga el camino desde el handler hasta la lógica de negocio.
    link: /es/adapters/elysia
    linkText: Adaptador de Elysia
  - icon:
      src: /puzzle.png
      alt: Framework-agnostic core
    title: Núcleo agnóstico al framework
    details: "InferDI no tiene dependencias en runtime y se ejecuta en Node, Bun, Deno, navegadores y workers. Los adaptadores añaden ciclo de vida opcional para el scope de petición."
    link: /es/adapters/
    linkText: Cómo funcionan los adaptadores
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "WebSite"
      "@id": "https://inferdi.com/#website"
      "url": "https://inferdi.com/es/"
      "name": "InferDI"
      "description": "Inyección de dependencias sin decoradores y fuertemente tipada para el TypeScript moderno."
      "inLanguage": "es-ES"
      "publisher":
        "@id": "https://inferdi.com/#organization"
      "potentialAction":
        "@type": "SearchAction"
        "target":
          "@type": "EntryPoint"
          "urlTemplate": "https://inferdi.com/?q={search_term_string}"
        "query-input": "required name=search_term_string"
    - "@type": "Organization"
      "@id": "https://inferdi.com/#organization"
      "name": "InferDI"
      "url": "https://inferdi.com/"
      "logo":
        "@type": "ImageObject"
        "url": "https://inferdi.com/logo.png"
      "sameAs":
        - "https://github.com/inferdi/inferdi"
        - "https://twitter.com/inferdi_ts"
    - "@type": "SoftwareApplication"
      "@id": "https://inferdi.com/#software"
      "name": "InferDI"
      "applicationCategory": "DeveloperApplication"
      "operatingSystem": "Node.js, Bun, Deno, Browser, Edge runtimes"
      "softwareVersion": "5.0.6"
      "programmingLanguage": "TypeScript"
      "url": "https://inferdi.com/"
      "downloadUrl": "https://www.npmjs.com/package/@inferdi/inferdi"
      "description": "Contenedor de DI para TypeScript sin dependencias en runtime, sin decoradores y fuertemente tipado. TypeScript comprueba el orden de argumentos, las claves y las dependencias de tiempo de vida al registrar servicios."
      "license": "https://github.com/inferdi/inferdi/blob/main/LICENSE"
      "author":
        "@id": "https://inferdi.com/#organization"
---
