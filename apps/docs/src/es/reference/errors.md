---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/reference/errors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Referencia"
          "item": "https://inferdi.com/es/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Errores"
          "item": "https://inferdi.com/es/reference/errors"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/reference/errors#article"
      "headline": "Referencia de errores de InferDI"
      "name": "Errores"
      "description": "Todos los errores explícitos que lanza InferDI ante un uso indebido del grafo y del ciclo de vida: clave desconocida, ciclo detectado, violación de tiempo de vida, contenedor liberado, con la forma del mensaje para que los errores de registro fallen pronto en las pruebas."
      "url": "https://inferdi.com/es/reference/errors"
      "mainEntityOfPage": "https://inferdi.com/es/reference/errors"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-31"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, errores, excepciones, clave desconocida, ciclo detectado, violación de tiempo de vida, contenedor liberado, inyección de dependencias"
      "articleSection": "Referencia"
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

# Errores

InferDI lanza errores explícitos ante el uso indebido del grafo y del ciclo de vida. Mantén estos mensajes visibles en las pruebas para que los errores de registro fallen pronto.

| Disparador | Forma del mensaje |
| --- | --- |
| `.get(k)` sobre una clave inexistente | `Key "k" not found` |
| Resolver en un contenedor liberado | `Container is disposed (key: "k")` |
| Resolver con un ancestro liberado | `Ancestor container is disposed (key: "k")` |
| `createScope()` después de liberar | `Cannot create scope from a disposed container` |
| Registro después de liberar | `Cannot register on a disposed container (key: "k")` |
| Clave scoped resuelta desde la raíz en modo estricto | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| Violación del tiempo de vida singleton | `Singleton "x" cannot depend on scoped "y"...` |
| Ciclo síncrono | `Circular dependency detected: a -> b -> a...` |
| Liberación síncrona sobre un recurso asíncrono | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Override tardío | `Cannot override "k" because it has already been resolved...` |
| Override en un contenedor liberado | `Cannot override on a disposed container (key: "k")` |

## Ciclos entre factorías asíncronas

Las dependencias declaradas en `registerAsyncFactory(..., deps, ...)` pasan por una fase previa síncrona. El detector de ciclos existente rechaza el ciclo antes de ejecutar el cuerpo de cualquier factoría.

No se detectan los ciclos creados después de un límite de Promise. Esto incluye callbacks de `registerFactory` que devuelven una Promise y contenedores capturados que se usan después de `await`. Si ambos lados se esperan mutuamente, quien llama recibe una Promise que nunca se resuelve.

Corrige los ciclos asíncronos a nivel arquitectónico:

- separa la inicialización compartida
- eleva uno de los lados a un servicio anterior
- usa `Lazy<singleton>` solo para dependencias singleton síncronas
- añade un watchdog de desarrollo con timeout alrededor de los `await` de nivel superior sospechosos

## Errores de limpieza en los adaptadores

Los errores de limpieza de un adaptador que ocurren después de producir una respuesta nunca se exponen al cliente. Se enrutan a `onDisposeError` o al sink de respaldo del adaptador.

Los fallos de configuración (setup) son distintos: se expone el error de setup original, y cualquier fallo de limpieza durante la liberación del setup se enruta al sink sin agregarse al error expuesto.
