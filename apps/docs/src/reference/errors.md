---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/reference/errors#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Home"
          "item": "https://inferdi.com/"
        - "@type": "ListItem"
          "position": 2
          "name": "Reference"
          "item": "https://inferdi.com/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Errors"
          "item": "https://inferdi.com/reference/errors"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/reference/errors#article"
      "headline": "InferDI Errors reference"
      "name": "Errors"
      "description": "Every explicit error InferDI throws for graph and lifecycle misuse — unknown key, cycle detected, lifetime violation, disposed container — with the message shape so registration mistakes fail early in tests."
      "url": "https://inferdi.com/reference/errors"
      "mainEntityOfPage": "https://inferdi.com/reference/errors"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-31"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, errors, exceptions, unknown key, cycle detected, lifetime violation, disposed container, dependency injection"
      "articleSection": "Reference"
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

# Errors

InferDI throws explicit errors for graph and lifecycle misuse. Keep these messages visible in tests so registration mistakes fail early.

| Trigger | Message shape |
| --- | --- |
| `.get(k)` on missing key | `Key "k" not found` |
| Disposed container resolve | `Container is disposed (key: "k")` |
| Disposed ancestor resolve | `Ancestor container is disposed (key: "k")` |
| `createScope()` after dispose | `Cannot create scope from a disposed container` |
| Registration after dispose | `Cannot register on a disposed container (key: "k")` |
| Root resolves a scoped key in strict mode | `Scoped "k" cannot be resolved from the root container. Use createScope().` |
| Singleton lifetime violation | `Singleton "x" cannot depend on scoped "y"...` |
| Synchronous cycle | `Circular dependency detected: a -> b -> a...` |
| Sync dispose over async resource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Late override | `Cannot override "k" because it has already been resolved...` |
| Override on disposed container | `Cannot override on a disposed container (key: "k")` |

## Async Factory Cycles

Declarative edges listed in `registerAsyncFactory(..., deps, ...)` are resolved by a synchronous preflight, so the existing cycle guard rejects cycles before any factory body starts.

Cycles created after a Promise boundary are not detected. This includes calls from Promise-valued `registerFactory` callbacks and captured containers used after `await`. If both sides wait for each other, callers observe a pending Promise that never resolves.

Fix async cycles architecturally:

- split shared initialization
- hoist one side into an earlier service
- use `Lazy<singleton>` only for synchronous singleton edges
- add a development watchdog timeout around suspicious top-level awaits

## Adapter Cleanup Errors

Adapter cleanup errors after a response is produced are never surfaced to the client. They are routed to `onDisposeError` or the adapter's fallback sink.

Setup failures are different: the original setup error is surfaced, and any cleanup failure during setup teardown is routed to the sink without being aggregated into the surfaced error.
