---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/core/testing#breadcrumb"
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
          "name": "Testing and Overrides"
          "item": "https://inferdi.com/core/testing"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/core/testing#article"
      "headline": "Testing and Overrides in InferDI — .override()"
      "name": "Testing and Overrides"
      "description": "Use .override() to replace an existing registration with a mock in tests, swapping implementations without touching production wiring or the rest of the typed graph."
      "url": "https://inferdi.com/core/testing"
      "mainEntityOfPage": "https://inferdi.com/core/testing"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, testing, override, mocks, test doubles, swap implementation, dependency injection"
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

# Testing and Overrides

Use `.override()` when tests need to replace an existing registration with a mock.

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

The override value must be assignable to the original registered type. Missing keys and incompatible mocks are TypeScript errors.

## Override Timing

Overrides must happen before the key is resolved:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

That second line throws. A late override would split the graph: existing consumers would hold the old instance while later resolves returned the mock.

## Ownership

Override values are externally owned. Like `registerValue`, an override is not added to the container's disposal queue. The test fixture owns its cleanup.

## Scope Locality

An override mutates only the container it is called on:

```ts
const scope = root.createScope().override('db', mockDb)
```

The root and sibling scopes are unchanged. Parent-level overrides are visible through the usual parent lookup.
