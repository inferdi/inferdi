---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/examples/frontend#breadcrumb"
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
          "name": "Ejemplos"
          "item": "https://inferdi.com/es/guide/examples"
        - "@type": "ListItem"
          "position": 4
          "name": "Frameworks de frontend"
          "item": "https://inferdi.com/es/guide/examples/frontend"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/examples/frontend#article"
      "headline": "Scopes de InferDI en React, React Native y Vue"
      "name": "Frameworks de frontend"
      "description": "Crea scopes de InferDI en los límites de página, ruta, pantalla o funcionalidad en React, React Native y Vue 3 — proporcionando el scope a los hijos y ejecutando la limpieza al desmontar."
      "url": "https://inferdi.com/es/guide/examples/frontend"
      "mainEntityOfPage": "https://inferdi.com/es/guide/examples/frontend"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "dependencies": "TypeScript, React, React Native, Vue 3, @inferdi/inferdi"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, React, React Native, Vue 3, provide inject, scope de funcionalidad, inyección de dependencias"
      "articleSection": "Ejemplos"
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

# Frameworks de frontend

Los ejemplos de frontend crean scopes en los límites de página, ruta, pantalla o funcionalidad. Mantienen sus propios constructores pequeños en lugar de importar el módulo compartido del lado del servidor.

Compara dónde crea el scope cada framework, cómo se proporciona el scope a los hijos y cómo se ejecuta la limpieza al desmontar.

| Ejemplo | Muestra |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | Scope de funcionalidad en React con `useState` perezoso y limpieza |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | Scope de pantalla en React Native |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Límite de scope con provide/inject en Vue 3 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Límite de scope con context en Svelte |

## React

<<< ../../../../../../examples/frontend/react.tsx

Archivo del repositorio: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

Archivo del repositorio: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

Archivo del repositorio: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

Archivo del repositorio: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
