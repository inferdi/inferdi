---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/lazy-injection#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Conceptos básicos"
          "item": "https://inferdi.com/es/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Inyección perezosa"
          "item": "https://inferdi.com/es/core/lazy-injection"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/lazy-injection#article"
      "headline": "Inyección perezosa en InferDI — Lazy<T>"
      "name": "Inyección perezosa"
      "description": "Lazy<T> es un wrapper de resolución diferida para retrasar el orden de construcción o permitir que dos singletons se referencien entre sí sin resolver ambos en sus constructores — sin romper el guard de tiempo de vida."
      "url": "https://inferdi.com/es/core/lazy-injection"
      "mainEntityOfPage": "https://inferdi.com/es/core/lazy-injection"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-11"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, inyección perezosa, Lazy, resolución diferida, dependencia circular, singleton, inyección de dependencias"
      "articleSection": "Conceptos básicos"
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

# Inyección perezosa

`Lazy<T>` y `AsyncLazy<T>` retrasan la resolución hasta `.get()`. Un destino sync devuelve `T`; un destino async declarativo devuelve `Promise<T>`. Una clase cuya clave pueda elegir ambos modos recibe `Lazy<T> | AsyncLazy<T>`.

```ts
import { Container, type Lazy } from '@inferdi/inferdi'

class Clock {
  now() {
    return Date.now()
  }
}

class Audit {
  constructor(private readonly clock: Lazy<Clock>) {}

  record(event: string) {
    console.log(event, this.clock.get().now())
  }
}

const c = new Container()
  .registerClass('clock', Clock, [], 'singleton', 'clockLazy')
  .registerClass('audit', Audit, ['clockLazy'], 'singleton')
```

Pasar un `lazyKey` a `registerClass`, `registerFactory` o `registerAsyncFactory` crea un registro acompañante cuyo valor es `{ get: () => target }`.

```ts
const c = new Container()
  .registerFactory('clock', () => new Clock(), 'singleton', 'clockLazy')
```

`registerAsyncFactory` recibe la clave acompañante como quinto argumento:

```ts
const c = new Container()
  .registerAsyncFactory('db', connectDatabase, [], undefined, 'dbLazy')

const dbLazy = c.get('dbLazy') // AsyncLazy<Database>
const db = await dbLazy.get()
```

Obtener o inyectar el wrapper no inicia la factoría. `.get()` devuelve la Promise
nativa en caché para destinos singleton y scoped, incluido un rechazo. Un destino
transient se inicia en cada llamada y queda en manos del caller. Un
`registerFactory` Promise-valued sigue produciendo `Lazy<Promise<T>>`.

## El tiempo de vida se preserva

Los acompañantes lazy conservan el tiempo de vida del destino. Un singleton solo puede inyectar `Lazy` o `AsyncLazy` de un destino singleton. TypeScript también rechaza unions con un lifetime posiblemente corto y unions de wrappers managed/unmanaged.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Los consumidores con scope y transitorios pueden usar acompañantes perezosos para cualquier tiempo de vida porque no se cachean globalmente.

El wrapper captura el contenedor que lo resolvió. Un wrapper obtenido del primer
scope hijo sigue usando ese scope después de crear otro. Tras liberar el scope
capturado, `AsyncLazy.get()` devuelve una Promise rechazada. El propietario libera
los destinos singleton/scoped resueltos y espera una inicialización ya iniciada.

## Dependencias circulares

InferDI detecta los ciclos síncronos, incluidas las dependencias async declarativas durante el preflight. Un ciclo dinámico mediante `AsyncLazy.get()` tras un límite Promise queda fuera del detector síncrono. Si una inicialización vuelve a obtener su propia Promise pendiente, ambas partes esperan sin terminar. Divide la inicialización compartida o elimina el ciclo. Consulta [Grafo de dependencias asíncrono](./async-dependency-graph).
