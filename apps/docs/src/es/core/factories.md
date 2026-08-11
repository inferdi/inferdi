---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/factories#breadcrumb"
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
          "name": "Factorías"
          "item": "https://inferdi.com/es/core/factories"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/factories#article"
      "headline": "Factorías en InferDI — registerFactory"
      "name": "Factorías"
      "description": "Usa registerFactory para construcción síncrona y registerAsyncFactory para un grafo asíncrono declarativo."
      "url": "https://inferdi.com/es/core/factories"
      "mainEntityOfPage": "https://inferdi.com/es/core/factories"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, factorías, registerFactory, registerAsyncFactory, getAsync, AsyncSpec, inyección de dependencias"
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

# Factorías

Usa `registerFactory` cuando la construcción necesita más que `new Ctor(...deps)`: leer varios valores, adaptar clientes de terceros, crear objetos de configuración o devolver una promesa.

```ts
const container = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepo, ['pgPool'])
```

El valor devuelto por la factoría se convierte en el tipo resuelto de la clave.

## Grafos transitorios calientes

`registerClass` es la opción predeterminada para servicios transitorios. Úsalo mientras el perfilado no muestre que la construcción ocupa una parte relevante de una ruta caliente.

V8 puede ralentizar un patrón concreto: un grafo resuelve repetidamente muchas clases transitorias distintas con el mismo número de dependencias. Si el perfilado y el artefacto compilado de la aplicación confirman ese hotspot, registra solo esos servicios con factorías:

```ts
const container = new Container()
  .registerClass('context', RequestContext, [], 'scoped')
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    'transient',
  )
```

Cada factoría debe contener su propia llamada a `new Service(...)`. No dirijas varios servicios a un helper genérico de construcción si esta optimización importa. Las factorías repiten el cableado de dependencias; resérvalas para hotspots medidos.

## Tiempos de vida de las factorías

Las factorías usan el mismo modelo de tiempo de vida que las clases:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

Dentro de una factoría de singleton, el parámetro `c` se restringe a dependencias seguras para singletons. Las claves con scope y transitorias no se autocompletan y TypeScript las rechaza.

Pasa un cuarto argumento opcional `lazyKey` para registrar un acompañante `Lazy<V>` que conserva el tiempo de vida, igual que con `registerClass`:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get() // Cache
```

Para usar el tiempo de vida singleton predeterminado, pasa `undefined` antes de la clave acompañante: `registerFactory('cache', factory, undefined, 'cacheLazy')`.

## Vincular interfaces

Las interfaces de TypeScript se borran durante la compilación y no tienen ningún valor en runtime que pasar como constructor. En su lugar, vincula una interfaz a su implementación mediante un tipo de factoría explícito:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

Los consumidores de `'mailer'` ven la abstracción `Mailer`, no la clase concreta.

## Factorías síncronas con valor Promise

`registerFactory` trata la Promise devuelta como el valor del servicio. La clave sigue siendo síncrona, `get()` devuelve la Promise y otra factoría recibe el mismo objeto.

```ts
const c = new Container()
  .registerFactory('dbPromise', () => connectDatabase())

const promise = c.get('dbPromise') // Promise<Database>
```

Esta forma conserva el caché single-flight. Un ciclo creado después de `await` mediante un contenedor capturado queda fuera de las comprobaciones síncronas de ciclos y tiempos de vida.

## Grafo asíncrono declarativo

`registerAsyncFactory` guarda el tipo final del servicio en `AsyncSpec` y recibe valores posicionales de dependencias. Un registro `registerClass` que depende de una clave asíncrona propaga ese estado por el grafo de clases.

```ts
class Repository {
  constructor(readonly db: Database) {}
}

const root = new Container()
  .registerValue('config', {url: 'postgres://localhost/app'})
  .declareScopeInputs<{request: RequestContext}>()
  .registerAsyncFactory(
    'db',
    async (config) => connectDatabase(config.url),
    ['config']
  )
  .registerAsyncFactory(
    'session',
    async (request) => loadSession(request),
    ['request'],
    'scoped'
  )
  .registerClass('repository', Repository, ['db'])

const scope = root.createScope({request})
const repository = await scope.getAsync('repository')

// @ts-expect-error — las claves del grafo asíncrono requieren getAsync()
scope.get('repository')
```

`getAsync()` acepta claves síncronas y asíncronas listas y devuelve una Promise. TypeScript rechaza `get()` si una clave o unión de claves puede contener `AsyncSpec`. `has()` solo demuestra que existe un registro; no demuestra que la clave sea síncrona ni proporciona inputs de scope pendientes.

El contenedor inicia las dependencias declaradas en el orden de la tupla y espera solo los registros marcados como asíncronos declarativos. Los registros singleton y scoped guardan una Promise nativa. Los transient se inician en cada llamada y pertenecen al llamante. Los ciclos declarativos y las infracciones de tiempo de vida en frío fallan durante el preflight síncrono.

El callback asíncrono no recibe el contenedor. Las llamadas mediante contenedores capturados después del límite de Promise crean aristas dinámicas fuera del análisis. InferDI no añade `Lazy<T>` asíncrono, reintentos, cancelación ni rollback. Si otro sibling falla durante el preflight, las inicializaciones iniciadas conservan su caché y propiedad; un transient asíncrono puede continuar sin un handle de teardown.

Los registros asíncronos singleton y scoped que pertenecen al contenedor mantienen la Promise en caché después de completarse. Cierra el contenedor con `await using`, `await container.dispose()` o `Symbol.asyncDispose`. El `using` síncrono informa que no puede desenvolver la Promise en caché.

Pasa tuplas readonly a `registerAsyncFactory` y a `registerClass` cuando la tupla pueda seleccionar una clave asíncrona. InferDI conserva la referencia a la tupla y clasifica las posiciones asíncronas una sola vez; los literales inline se infieren como readonly automáticamente.
