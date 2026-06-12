---
layout: home

hero:
  name: InferDI
  text: La única DI ultrarrápida para el TypeScript moderno
  tagline: Crea aplicaciones con DI de nueva generación para cualquier runtime moderno, con una arquitectura ultrarrápida, lógica de dominio limpia y testabilidad de primera clase.
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
    details: "InferDI no tiene dependencias y se ejecuta en cualquier lugar: Node, Bun, Deno, navegadores, workers. Los adaptadores son pegamento opcional para el scope de petición, nunca un requisito."
    link: /es/adapters/
    linkText: Cómo funcionan los adaptadores
---
