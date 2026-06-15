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
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
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

`Lazy<T>` es un pequeño wrapper de resolución diferida. Resulta útil cuando hace falta retrasar el orden de construcción, o cuando dos servicios singleton necesitan referenciarse entre sí sin resolver ambos en los constructores.

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

Pasar un `lazyKey` crea un registro acompañante cuyo valor es `{ get: () => target }`.

## El tiempo de vida se preserva

Lazy no es una vía de escape para el tiempo de vida. Un singleton solo puede inyectar un acompañante `Lazy` de un destino singleton.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped', 'requestLazy')
  // Rejected: Lazy<scoped> is not safe for singleton consumers.
  .registerClass('app', AppService, ['requestLazy'], 'singleton')
```

Los consumidores con scope y transitorios pueden usar acompañantes perezosos para cualquier tiempo de vida porque no se cachean globalmente.

## Dependencias circulares

InferDI detecta los ciclos; no los rompe automáticamente. Para dos servicios singleton, pon `Lazy<singleton>` en un lado y mantén el otro directo. Para ciclos de factorías asíncronas, la solución recomendada es arquitectónica: divide la inicialización compartida, eleva uno de los lados o evita el ciclo.
