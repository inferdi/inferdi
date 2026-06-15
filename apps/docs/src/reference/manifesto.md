---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/reference/manifesto#breadcrumb"
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
          "name": "Manifesto"
          "item": "https://inferdi.com/reference/manifesto"
    - "@type": "Article"
      "@id": "https://inferdi.com/reference/manifesto#article"
      "headline": "InferDI Core Architectural Manifesto"
      "name": "InferDI Core Architectural Manifesto"
      "description": "The architectural manifesto behind InferDI: anything the compiler can verify statically must be verified statically, with zero runtime overhead, zero dependencies, zero decorators, and the conscious trade-offs that follow."
      "url": "https://inferdi.com/reference/manifesto"
      "mainEntityOfPage": "https://inferdi.com/reference/manifesto"
      "inLanguage": "en-US"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, manifesto, architecture, design principles, type safety, zero overhead, zero dependencies, dependency injection"
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

<!--@include: ../../../../MANIFESTO.md-->
