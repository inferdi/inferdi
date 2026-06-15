---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/installation#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Guía"
          "item": "https://inferdi.com/es/guide/quick-start"
        - "@type": "ListItem"
          "position": 3
          "name": "Instalación"
          "item": "https://inferdi.com/es/guide/installation"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/installation#article"
      "headline": "Instalar InferDI desde npm o JSR"
      "name": "Instalación"
      "description": "Instala @inferdi/inferdi y sus adaptadores de frameworks desde npm o JSR en Node.js, Bun y Deno. Nombres y versiones de paquete coincidentes, cero dependencias en tiempo de ejecución y sin paso de compilación ni reflect-metadata."
      "url": "https://inferdi.com/es/guide/installation"
      "mainEntityOfPage": "https://inferdi.com/es/guide/installation"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript >=5.6, Node.js >=16, Bun, Deno"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, instalación, npm, JSR, Node.js, Bun, Deno, inyección de dependencias TypeScript"
      "articleSection": "Guía"
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

# Instalación

InferDI se publica en npm y JSR con nombres de paquete y versiones coincidentes. Usa instalaciones compatibles con npm para Node y Bun, o JSR para Deno y runtimes que prefieran las fuentes en TypeScript.

## Node.js

```bash
npm install @inferdi/inferdi
pnpm add @inferdi/inferdi
yarn add @inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Bun

```bash
bun add @inferdi/inferdi
bun add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

## Deno

```bash
deno add jsr:@inferdi/inferdi
```

```ts
import { Container } from '@inferdi/inferdi'
```

También puedes importar directamente:

```ts
import { Container } from 'jsr:@inferdi/inferdi'
```

## Requisitos

| Runtime | Requisito |
| --- | --- |
| Node.js | 16 o más reciente para el paquete del núcleo |
| Bun | 1.0 o más reciente |
| Deno | 1.40 o más reciente |
| TypeScript | 5.2+ recomendado para la sintaxis `using` / `await using` |

En versiones de Node anteriores a `Symbol.dispose` y `Symbol.asyncDispose` nativos, InferDI instala un polyfill de símbolos al importar para que la interoperabilidad con Explicit Resource Management siga funcionando.

## Instalación de adaptadores

Instala el paquete del núcleo, el paquete del adaptador y el peer del framework:

```bash
pnpm add @inferdi/inferdi @inferdi/fastify fastify
pnpm add @inferdi/inferdi @inferdi/hono hono
pnpm add @inferdi/inferdi @inferdi/koa koa
pnpm add -D @types/koa
pnpm add @inferdi/inferdi @inferdi/express express
pnpm add -D @types/express
pnpm add @inferdi/inferdi @inferdi/elysia elysia
```

Cada adaptador tiene una página dedicada con sus reglas de tiempo de vida y su configuración de tipos.
