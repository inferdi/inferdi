---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/testing#breadcrumb"
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
          "name": "Pruebas y overrides"
          "item": "https://inferdi.com/es/core/testing"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/testing#article"
      "headline": "Pruebas y overrides en InferDI — .override()"
      "name": "Pruebas y overrides"
      "description": "Usa .override() para reemplazar un registro existente por un mock en las pruebas, intercambiando implementaciones sin tocar el cableado de producción ni el resto del grafo tipado."
      "url": "https://inferdi.com/es/core/testing"
      "mainEntityOfPage": "https://inferdi.com/es/core/testing"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, pruebas, override, mocks, dobles de prueba, intercambiar implementación, inyección de dependencias"
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

# Pruebas y overrides

Usa `.override()` cuando las pruebas necesitan reemplazar un registro existente por un mock.

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

El valor del override debe ser asignable al tipo registrado original. Las claves ausentes y los mocks incompatibles son errores de TypeScript.

## Momento del override

Aplica los overrides antes de resolver el grafo de dependencias:

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

La segunda línea lanza una excepción porque el valor singleton ya está en la caché local de este contenedor. La comprobación se basa deliberadamente en esa caché: también detecta valores scoped almacenados en el scope actual, `registerValue` y overrides repetidos. Las resoluciones transient y los valores propiedad de un ancestro que se resuelven desde un hijo no se guardan en la caché local, por lo que no se registran. Un transient devuelto anteriormente permanece en manos de quien lo recibió, mientras que las resoluciones posteriores devuelven el mock. Este límite forma parte del contrato, pero no justifica overrides tardíos: aplicarlos antes de resolver el grafo evita dividirlo.

## Propiedad

Los valores de override son de propiedad externa. Al igual que `registerValue`, un override no se añade a la cola de liberación del contenedor. El fixture de prueba es dueño de su limpieza.

## Localidad del scope

Un override muta solo el contenedor sobre el que se invoca:

```ts
const scope = root.createScope().override('db', mockDb)
```

La raíz y los scopes hermanos no se ven afectados. Los overrides a nivel del padre son visibles a través de la búsqueda habitual en el padre.
