---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/symbol-keys#breadcrumb"
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
          "name": "Claves Symbol"
          "item": "https://inferdi.com/es/core/symbol-keys"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/symbol-keys#article"
      "headline": "Claves Symbol en InferDI"
      "name": "Claves Symbol"
      "description": "Cada clave de registro puede ser un string o un symbol. Los strings van bien para servicios públicos de toda la aplicación; los symbols dan una identidad libre de colisiones, y las claves Symbol() locales siguen siendo recolectables por el recolector de basura junto con el contenedor."
      "url": "https://inferdi.com/es/core/symbol-keys"
      "mainEntityOfPage": "https://inferdi.com/es/core/symbol-keys"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, claves Symbol, Symbol, claves string, identidad, recolección de basura, inyección de dependencias"
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

# Claves Symbol

Cada clave de registro puede ser un `string` o un `symbol`. Los strings son cómodos para servicios públicos de toda la aplicación. Los symbols son útiles cuando importa la identidad.

```ts
const DB = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB, PgPool, ['config'])
  .registerClass(CACHE, RedisPool, [])
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)
c.get(CACHE)
c.get('repo')
```

## Cuándo usar symbols

| Patrón | Token |
| --- | --- |
| Servicio privado local al módulo | `Symbol('name')` |
| Identidad compartida sin imports | `Symbol.for('name')` |
| Distinción nominal a nivel de tipos | constante `unique symbol` |

Usa symbols locales para servicios privados recolectables. `Symbol.for(name)` se almacena en el registro global de symbols y nunca lo recolecta el recolector de basura.

## Acompañantes perezosos

La clave del acompañante perezoso también puede ser un symbol:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

La clave principal y la clave del acompañante no necesitan ser de la misma clase.
