---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/quick-start#breadcrumb"
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
          "name": "Inicio rápido"
          "item": "https://inferdi.com/es/guide/quick-start"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/quick-start#article"
      "headline": "Inicio rápido de InferDI: construye tu primer grafo de dependencias tipado"
      "name": "Inicio rápido"
      "description": "Construye un grafo de dependencias con la API fluida de InferDI. TypeScript verifica los argumentos del constructor al registrar servicios y un resolve cacheado usa un solo Map.get()."
      "url": "https://inferdi.com/es/guide/quick-start"
      "mainEntityOfPage": "https://inferdi.com/es/guide/quick-start"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Beginner"
      "keywords": "InferDI, inicio rápido, inyección de dependencias, DI con TypeScript, contenedor, API fluida, type-safe"
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

# Inicio rápido

Construyes el grafo de dependencias mediante una API fluida, y TypeScript lo comprueba a medida que avanzas: cada tupla de dependencias se contrasta con las posiciones del constructor del objetivo, de modo que un argumento intercambiado o ausente es un error de compilación, no una sorpresa en runtime. No hay decoradores `@Injectable()` ni `reflect-metadata`: el cableado es código corriente que el compilador puede leer.

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string,
  ) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

La llamada a `registerClass('userRepo', UserRepo, ['logger', 'dsn'])` se comprueba posicionalmente. Si cambias la tupla por `['dsn', 'logger']`, TypeScript informa del desajuste antes de que la aplicación se ejecute.

## Resolver valores

Usa `.get(key)` para la resolución:

```ts
const repo = container.get('userRepo')
```

La clave debe estar registrada en el tipo del contenedor. Las claves estáticas desconocidas son errores de compilación. Las claves dinámicas deben comprobarse con `.has(key)` antes de `.get(key)`.

## Elegir tiempos de vida

Los registros usan `singleton` por defecto. Pasa el tiempo de vida como cuarto argumento para las clases, o como tercer argumento para las factorías.

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| Tipo | Creado | Cacheado | Liberado por el contenedor |
| --- | --- | --- | --- |
| `singleton` | una vez por contenedor propietario | sí | sí |
| `scoped` | una vez por scope | sí | sí |
| `transient` | en cada resolución | no | no |

Los singletons no pueden depender directamente de servicios `scoped` o `transient`. Esa regla la imponen los tipos y, en modo estricto, las comprobaciones en runtime.
