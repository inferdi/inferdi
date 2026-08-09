---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/core/scopes#breadcrumb"
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
          "name": "Scopes y limpieza"
          "item": "https://inferdi.com/es/core/scopes"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/core/scopes#article"
      "headline": "Scopes y limpieza en InferDI"
      "name": "Scopes y limpieza"
      "description": "Un scope acota los servicios locales a una petición a una sola unidad de trabajo: un scope hijo hereda cada registro del padre, pero cachea sus propias instancias y es dueño de su limpieza, con disposal en LIFO y soporte para using y await using."
      "url": "https://inferdi.com/es/core/scopes"
      "mainEntityOfPage": "https://inferdi.com/es/core/scopes"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-08-09"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Intermediate"
      "keywords": "InferDI, scopes, limpieza, disposal, scope hijo, using, await using, LIFO, inyección de dependencias"
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

# Scopes y limpieza

Un scope acota el tiempo de vida de los servicios locales a una petición a una sola unidad de trabajo. Un scope hijo hereda cada registro del padre, pero cachea sus propias instancias con scope y es dueño de su limpieza, de modo que el scope creado para una petición nunca comparte estado con otra ni sobrevive a ella.

```ts
const root = new Container()
  .registerClass('db', Db, [])
  .registerClass('request', RequestContext, [], 'scoped')

async function handle(request: Request) {
  await using scope = root.createScope()
  const ctx = scope.get('request')
}
```

`db` es un singleton de raíz. `request` se crea una vez por scope y se libera cuando el scope se libera.

Los registros `scoped` pertenecen a scopes hijos. Con `strict: true` (el valor predeterminado), `root.get('request')` lanza `Scoped "request" cannot be resolved from the root container. Use createScope().` Resuelve la clave desde el contenedor que devuelve `createScope()`. `strict: false` omite esta comprobación en tiempo de ejecución.

## Inputs de scope y perfiles

Los inputs de scope representan valores externos que existen al abrir un scope, como una petición, el contexto de autenticación, un tenant o los datos de un job. `declareScopeInputs()` añade esas claves al grafo de tipos sin crear registros en tiempo de ejecución:

```ts
const root = new Container()
  .declareScopeInputs<{
    request: RequestContext
    auth: AuthContext
  }>()
  .registerClass('publicService', PublicService, ['request'], 'scoped')
  .registerClass('accountService', AccountService, ['request', 'auth'], 'scoped')
```

El mapa de declaración acepta claves string y symbol obligatorias y finitas. Rechaza claves opcionales, claves numéricas, `__proto__`, firmas de índice string/symbol amplias y uniones cuyas variantes usan conjuntos de claves distintos. Puedes declarar inputs en la raíz o en un hijo existente, pero la declaración no proporciona un valor.

`createScope(inputs)` acepta cualquier subconjunto de los inputs pendientes. InferDI propaga cada requisito por registros de clase, lazy companions y factories que declaran una tupla de dependencias:

```ts
const publicScope = root.createScope({request})
publicScope.get('publicService')

// @ts-expect-error: falta auth
publicScope.get('accountService')

const authenticatedScope = publicScope.createScope({auth})
authenticatedScope.get('accountService')

root.registerFactory(
  'userId',
  ['auth'],
  (c) => c.get('auth').userId,
  'scoped'
)
```

La tupla de factory solo interviene en los tipos. El callback recibe un resolver con `.get()` para las claves declaradas y `.has()` para sondeos. InferDI llama a `factory(container)` en tiempo de ejecución.

Usa funciones normales como perfiles con nombre:

```ts
const publicScope = (request: RequestContext) =>
  root.createScope({request})

const authenticatedScope = (
  request: RequestContext,
  auth: AuthContext
) => root.createScope({request, auth})
```

El hijo toma una copia superficial de las propiedades string y symbol propias y enumerables. Los hijos anidados heredan los inputs, pero crean sus propias instancias scoped. La aplicación conserva la propiedad de los inputs. Si refinas un scope mediante otro hijo, libera el hijo refinado antes que su padre.

El runtime no guarda el schema de inputs. JavaScript, `any` o un cast pueden añadir claves desconocidas o ocultar un registro en la cache del hijo. Pasa un record de datos pasivo: object spread invoca getters y Proxy traps, y las mutaciones reentrantes desde esos hooks quedan fuera del contrato. Strict Mode mantiene visibles en el hijo refinado los registros añadidos al hijo parcial. Fast Mode permite refinar inputs, pero conserva su regla de grafo inmutable: termina los registros antes del primer `.get()` o `.createScope()`.

## Propiedad

Cada contenedor libera solo las instancias que creó.

| Instancia | Propietario |
| --- | --- |
| Singleton de raíz | Contenedor raíz |
| Servicio con scope | Scope de petición |
| Singleton resuelto por primera vez en un hijo | Ese contenedor hijo |
| Transitorio | Llamante |

`root.dispose()` no cascadea hacia los scopes hijos ya creados. Libera los scopes en su propio límite de ciclo de vida.

## Gestión nativa de recursos

Container implementa ambos símbolos de liberación:

```ts
using syncScope = root.createScope()
await using asyncScope = root.createScope()
```

Usa `await using` o `await container.dispose()` cuando algún recurso propio pueda ser asíncrono.

## Protocolo de liberación

Las instancias propias se liberan en orden inverso al de creación. El contenedor sondea:

1. `Symbol.asyncDispose`
2. `Symbol.dispose`
3. `.dispose()`

Si fallan varios liberadores, InferDI los recopila en un `AggregateError` para que una limpieza fallida no impida cerrar los recursos posteriores.
