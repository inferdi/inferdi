---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/lifetime-guards#breadcrumb"
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
          "name": "Guards de tiempo de vida"
          "item": "https://inferdi.com/es/core/lifetime-guards"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/lifetime-guards#article"
      "headline": "Guards de tiempo de vida en InferDI — singleton, scoped y transient"
      "name": "Guards de tiempo de vida"
      "description": "Los tres tiempos de vida de InferDI — singleton, scoped y transient — y los guards de compilación y de runtime que impiden que un servicio de vida más larga capture a uno de vida más corta y filtre estado entre peticiones."
      "url": "https://inferdi.com/es/core/lifetime-guards"
      "mainEntityOfPage": "https://inferdi.com/es/core/lifetime-guards"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, tiempos de vida, singleton, scoped, transient, guard de tiempo de vida, dependencia cautiva, inyección de dependencias"
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

# Guards de tiempo de vida

InferDI tiene tres tiempos de vida:

| Clase | Creado | Cacheado en | Liberado por el contenedor |
| --- | --- | --- | --- |
| `singleton` | una vez por contenedor propietario | contenedor propietario | sí |
| `scoped` | una vez por scope | scope | sí |
| `transient` | en cada resolución | nunca | no |

## La regla del tiempo de vida

Un singleton no puede depender directamente de un servicio `scoped` o `transient`. Un singleton se crea una vez y se comparte en cada petición, así que si captura un valor con scope — el contexto, el usuario o la transacción de la petición actual — el estado de esa única petición se filtra de forma silenciosa hacia todas las demás. InferDI hace que ese caso límite sea inexpresable en el sistema de tipos en lugar de dejarlo a la revisión de código.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

Ese registro lo rechaza TypeScript. En modo estricto, la misma forma se rechaza en runtime si un cast burla el sistema de tipos.

## Modo estricto

`strict: true` es el valor por defecto. Atrapa:

- violaciones de singleton a scoped o de singleton a transient introducidas por casts
- fugas de factorías que capturan un contenedor externo
- ciclos síncronos de singletons
- ciclos síncronos de transitorios
- mal uso de claves dinámicas que burla la comprobación estática

```ts
const root = new Container({ strict: true })
```

## Modo rápido

Usa `strict: false` solo después de que las pruebas demuestren la forma del grafo:

```ts
const root = new Container({ strict: false })
```

El modo rápido elimina del camino de resolución la contabilidad de ciclos y tiempos de vida en runtime. No cambia el contrato a nivel de tipos, pero tampoco puede defenderse frente a casts deshonestos, contenedores externos capturados o ciclos.

Flujo de trabajo recomendado: desarrolla y prueba en modo estricto, y luego cambia únicamente los grafos de producción sensibles al rendimiento tras una auditoría.
