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
      "description": "Usa registerFactory cuando la construcción necesita más que new Ctor(...deps): leer varios valores, adaptar clientes de terceros, crear objetos de configuración o devolver una promesa que InferDI cachea sin modificar."
      "url": "https://inferdi.com/es/core/factories"
      "mainEntityOfPage": "https://inferdi.com/es/core/factories"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, factorías, registerFactory, factoría asíncrona, configuración, clientes de terceros, inyección de dependencias"
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

## Factorías asíncronas

Las factorías pueden devolver promesas. La propia promesa se cachea, de modo que los llamantes concurrentes comparten la inicialización:

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

const [a, b] = await Promise.all([c.get('db'), c.get('db')])
await c.dispose()
```

`.get()` se mantiene síncrono. Los llamantes esperan (await) el valor devuelto cuando el registro es asíncrono.

Los guards de ciclos y tiempos de vida solo reflejan la pila síncrona de la factoría. Después de `await`, `AllowedDeps` sigue protegiendo el código tipado normal, pero un cast con `as` o un contenedor externo capturado queda fuera del contexto del guard en runtime. Lee las dependencias en el preámbulo síncrono de la factoría.
