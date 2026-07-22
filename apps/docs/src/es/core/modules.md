---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/modules#breadcrumb"
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
          "name": "Módulos"
          "item": "https://inferdi.com/es/core/modules"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/modules#article"
      "headline": "Módulos en InferDI — componiendo constructores con .use()"
      "name": "Módulos"
      "description": "Divide un constructor de contenedor grande en piezas más pequeñas con .use() manteniendo la inferencia de tipos completa a lo largo de la cadena fluida, y comprende por qué los módulos genéricos necesitan una forma de entrada conocida."
      "url": "https://inferdi.com/es/core/modules"
      "mainEntityOfPage": "https://inferdi.com/es/core/modules"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, módulos, use, composición de contenedor, inferencia de tipos, tipo Module, inyección de dependencias"
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

# Módulos

Usa `.use()` para dividir un constructor de contenedor grande en piezas más pequeñas, manteniendo la inferencia de tipos a lo largo de la cadena fluida.

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

Las lambdas en línea son la forma más ergonómica. El tipo de contenedor de la lambda se infiere del lugar de la llamada, incluidas las claves registradas antes en la cadena.

## Módulos con nombre

Para módulos reutilizables de forma fija, usa el tipo exportado `Module<TIn, TOut>`.

```ts
import {
  Container,
  type Module,
  type SpecMap,
} from '@inferdi/inferdi'

type Base = SpecMap<{ config: { env: string } }>
type Added = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Base, Added> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}
```

Las funciones de módulo genéricas como `<T>(c: Container<T>) => ...` no pueden expresar la unicidad de claves dentro del cuerpo. Usa lambdas en línea o declaraciones de forma fija `Module<TIn, TOut>`.

## Comprobaciones dinámicas

`.has(key)` es un type guard para claves dinámicas:

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` nunca resuelve el valor y devuelve `false` en contenedores liberados.
