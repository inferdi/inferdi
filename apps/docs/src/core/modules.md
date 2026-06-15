---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/modules#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Core Concepts"
          "item": "https://inferdi.com/core/type-safety"
        - "@type": "ListItem"
          "position": 3
          "name": "Modules"
          "item": "https://inferdi.com/core/modules"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/modules#article"
      "headline": "Modules in InferDI — composing builders with .use()"
      "name": "Modules"
      "description": "Split a large container builder into smaller pieces with .use() while keeping full type inference across the fluent chain, and understand why generic modules need a known input shape."
      "url": "https://inferdi.com/core/modules"
      "mainEntityOfPage": "https://inferdi.com/core/modules"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, modules, use, container composition, type inference, Module type, dependency injection"
      "articleSection": "Core Concepts"
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

# Modules

Use `.use()` to split a large container builder into smaller pieces while keeping type inference across the fluent chain.

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

Inline lambdas are the most ergonomic shape. The lambda's container type is inferred from the call site, including keys registered earlier in the chain.

## Named Modules

For reusable fixed-shape modules, use the exported `Module<TIn, TOut>` type.

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

Generic module functions like `<T>(c: Container<T>) => ...` cannot express key uniqueness inside the body. Use inline lambdas or fixed-shape `Module<TIn, TOut>` declarations.

## Dynamic Checks

`.has(key)` is a type guard for dynamic keys:

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` never resolves the value and returns `false` on disposed containers.
