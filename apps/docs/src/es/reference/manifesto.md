---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/reference/manifesto#breadcrumb"
      "itemListElement":
        - "@type": "ListItem"
          "position": 1
          "name": "Inicio"
          "item": "https://inferdi.com/es/"
        - "@type": "ListItem"
          "position": 2
          "name": "Referencia"
          "item": "https://inferdi.com/es/reference/api"
        - "@type": "ListItem"
          "position": 3
          "name": "Manifiesto arquitectónico del core de InferDI"
          "item": "https://inferdi.com/es/reference/manifesto"
    - "@type": "Article"
      "@id": "https://inferdi.com/es/reference/manifesto#article"
      "headline": "Manifiesto arquitectónico del core de InferDI"
      "name": "Manifiesto arquitectónico del core de InferDI"
      "description": "El manifiesto arquitectónico que sustenta a InferDI: todo lo que el compilador pueda verificar de forma estática debe verificarse de forma estática, con cero sobrecarga en tiempo de ejecución, cero dependencias, cero decoradores y las decisiones de compromiso conscientes que de ello se derivan."
      "url": "https://inferdi.com/es/reference/manifesto"
      "mainEntityOfPage": "https://inferdi.com/es/reference/manifesto"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-06-15"
      "keywords": "InferDI, manifiesto, arquitectura, principios de diseño, seguridad de tipos, cero sobrecarga, cero dependencias, inyección de dependencias"
      "articleSection": "Referencia"
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

# Manifiesto arquitectónico del core de InferDI

Este documento rige `@inferdi/inferdi` en `packages/inferdi`. Léelo antes de
revisar cualquier PR que toque la API pública, el sistema de tipos, la ruta de
resolución de `get()`, la forma de los registros, la semántica de scopes o el
comportamiento de limpieza.

## 1. Filosofía y promesa

### Misión

InferDI demuestra que la DI en TypeScript puede conservar la flexibilidad en
runtime sin renunciar a las garantías estáticas. El grafo de dependencias es un
tipo de TypeScript. Si el compilador puede verificar una regla, InferDI debe
codificar esa regla en las firmas públicas. Las comprobaciones en runtime
existen para los casts con `as`, los contenedores externos capturados, las
claves dinámicas y otros lugares donde TypeScript no puede ver el grafo.

### Propuesta de valor

El grafo es el tipo. Una clave que falta, una posición de constructor errónea,
un registro duplicado o una fuga de un singleton a un servicio con scope deberían
fallar antes de que se ejecute el código de producción. InferDI también mantiene
pequeño el contrato en runtime: sin dependencias en runtime, sin decoradores, sin
reflexión de metadatos, sin trampas de proxy y sin maquinaria de frameworks en el
paquete core.

La resolución con acierto de caché sigue siendo una ruta rápida de un único
`Map.get()`. La construcción de clases usa llamadas directas `new Ctor(...)`
desplegadas por aridad para 0-7 dependencias y una ruta de cola medida para 8 o
más dependencias.

Si una funcionalidad debilita esas promesas, recházala o muévela fuera del core.

## 2. Pilares innegociables

### 2.1 Seguridad de tipos de extremo a extremo

Toda firma pública debe hacer que los estados de grafo inválidos sean
irrepresentables allí donde TypeScript pueda expresar la regla.

- `register*` usa `K & ([K] extends [keyof T] ? never : unknown)` para que las
  claves duplicadas fallen en tiempo de compilación y la clave infractora siga
  siendo visible en el error.
- `DepsOf<AllowedDeps<T, Kind>, A>` comprueba una tupla `deps` contra los
  parámetros del constructor por posición y por asignabilidad estructural.
- `AllowedDeps<T, Kind>` estrecha el contenedor pasado a las factorías. Dentro de
  una factoría singleton, `c.get('scoped')` es un error de tipo.
- `Spec`, `LazySpec`, `SpecMap`, `Module`, `Container.Resolve`,
  `Container.ResolveUnwrapped`, `Container.UnwrappedValue` y
  `Container.Providers` forman parte del contrato. Trata los cambios en ellos
  como cambios de la API pública.
- Una superficie de tipos pública nueva o modificada necesita pruebas de tipos
  positivas y pruebas negativas con `// @ts-expect-error` en
  `packages/inferdi/__tests__/container.test-d.ts`.

Los límites conocidos de TypeScript deben documentarse, no ocultarse. Por
ejemplo, dos dependencias con el mismo tipo estructural siguen siendo
intercambiables a menos que los usuarios introduzcan una distinción nominal como
claves `unique symbol` o tipos de valor con marca (branded).

### 2.2 Cero decoradores, cero reflexión de metadatos

InferDI es TypeScript plano que apunta a ES2022. No añadas decoradores,
`reflect-metadata`, `experimentalDecorators`, `emitDecoratorMetadata`,
transformers de TS ni plugins del transpilador.

- El tipo del constructor es la fuente de verdad para los tipos de las
  dependencias.
- La tupla explícita `deps` es la fuente de verdad para el orden de los
  argumentos.
- El runtime no inspecciona los nombres de los parámetros del constructor, los
  metadatos emitidos ni los campos de la clase.

Los decoradores y los metadatos convierten a InferDI en una biblioteca distinta.
Añaden estado en runtime, requisitos de toolchain y coste de arranque en frío que
el paquete core rechaza.

### 2.3 El tiempo de vida es un tipo

El core tiene tres tipos de registro: `singleton`, `scoped` y `transient`. Cada
registro lleva su tiempo de vida a través de `Spec<V, Kind>`.

- Un singleton no debe depender directamente de un servicio con scope o
  transitorio. `AllowedDeps<T, Kind>` lo impone en tiempo de compilación;
  `strict: true` lo impone en runtime para casts y registros dinámicos.
- `Lazy<V>` preserva el tiempo de vida del objetivo. Un consumidor singleton solo
  puede inyectar `LazySpec<V, 'singleton'>`. `Lazy<scoped>` y `Lazy<transient>`
  siguen siendo legales para consumidores con scope y transitorios, y siguen
  siendo ilegales para consumidores singleton.
- El flag de runtime `Registration.lazy` debe ser `true` solo para companions
  lazy cuyo tipo de objetivo es `'singleton'`.
- Los valores de `registerValue` y `.override()` son de propiedad externa. No
  entran en la cola de limpieza.
- `.override()` es una vía de escape para pruebas. Debe preservar el `kind` y el
  flag `lazy` originales, mantenerse local al scope, rechazar claves
  desconocidas, rechazar contenedores liberados y rechazar claves ya resueltas en
  el mismo contenedor.
- `dispose()` solo toca las instancias que ese contenedor posee. Los contenedores
  padre e hijo no se liberan entre sí.

### 2.4 La ruta caliente de resolución se mantiene pequeña

La primera operación en `get()` es la búsqueda en la caché local:

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

No añadas trabajo antes de esa búsqueda.

- Los valores `undefined` explícitos se representan con `UNDEFINED_MARKER`; no
  reintroduzcas una segunda búsqueda `cache.has(key)` en la ruta de acierto de
  caché.
- `_disposed`, la búsqueda en el registro local, la búsqueda en el padre,
  `lookupCache`, las comprobaciones de ciclos, las comprobaciones de tiempo de
  vida y la mutación del singleton-stack viven todas después de la ruta rápida de
  caché.
- Los registros locales deben comprobarse antes que la búsqueda en la cadena de
  padres. `lookupCache` es un memo de ruta fría solo para los aciertos en el
  padre.
- La invocación del constructor se mantiene desplegada por aridad para 0-7
  argumentos. La ruta de 8 o más usa `Reflect.construct` con un array compacto
  construido mediante `push`.
- `get()` se mantiene síncrono. El array compartido `resolving` y el
  `singletonStack` funcionan únicamente porque una resolución se ejecuta de forma
  atómica en la pila de llamadas.
- `strict: false` puede eliminar las comprobaciones de ciclos y tiempo de vida en
  runtime tras la ruta rápida de caché. No debe cambiar la semántica observable
  de acierto de caché.

`packages/inferdi/__tests__/container.bench.ts` no está impuesto por CI. Quienes
revisan deben exigir salida de benchmark para los cambios en `get()`, en la forma
del objeto de registro, en la representación de la caché, en la búsqueda de
scopes, en los companions lazy o en la invocación del constructor. Una regresión
local superior al 5% en un escenario relevante bloquea el merge a menos que el PR
incluya una justificación escrita y acotada.

### 2.5 Cero dependencias en runtime

`@inferdi/inferdi` no tiene dependencias en runtime. Mantenlo así.

El bundle publicado debería mantenerse por debajo de 2.5KB gzipped. CI no impone
ese presupuesto hoy, así que quienes revisan deben comprobar el tamaño del bundle
en los PR que añaden código a la implementación del core o a los helpers
públicos.

## 3. Filtro de PR

Para cada PR que toque `packages/inferdi/src`, `packages/inferdi/package.json`,
`packages/inferdi/jsr.json` o las pruebas del core, responde estas preguntas en
la revisión:

1. ¿El cambio preserva las garantías del grafo en tiempo de compilación, o
   traslada una regla a comprobaciones de runtime sin una limitación documentada
   de TypeScript?
2. ¿Toca el comportamiento de acierto de caché de `get()`, la forma del objeto de
   registro, la búsqueda de scopes, la resolución lazy o la invocación del
   constructor? Si es así, ¿dónde está la evidencia de benchmark?
3. ¿Añade al paquete core una dependencia en runtime, soporte de decoradores,
   reflexión de metadatos, comportamiento de resolución basado en proxy o un
   requisito de transpilador?

Rechaza el PR si el #1 traslada una regla de tipos a runtime sin causa, el #2
carece de evidencia de benchmark, o el #3 es afirmativo.

## 4. Lista de verificación de control estricto

Cualquier cambio que coincida con un elemento de abajo necesita una
justificación explícita en el PR.

### Ruta caliente y forma en runtime

- [ ] ¿Se añadió trabajo antes de `cache.get(key)` en `get()`?
- [ ] ¿Cambió la forma de `UNDEFINED_MARKER`, `cache`, `regs`, `lookupCache` o
      `Registration`?
- [ ] ¿Cambió el orden de las propiedades de `Registration` respecto de
      `{kind, lazy, fn}`?
- [ ] ¿Se movió la búsqueda en el registro local después de la búsqueda en el
      padre?
- [ ] ¿Se añadió `Proxy`, `Reflect.get`, `Object.defineProperty` o una búsqueda
      de metadatos a la resolución?
- [ ] ¿Se convirtió `get()` en `async`?
- [ ] ¿Se eliminaron o reformularon las ramas desplegadas por aridad para 0-7
      argumentos del constructor?

### Sistema de tipos

- [ ] ¿Se debilitó el guard de claves duplicadas fuera de `.override()`?
- [ ] ¿Se estrechó `string | symbol` a `string` en alguna restricción pública de
      claves?
- [ ] ¿Se debilitó `AllowedDeps`, `LazySpec` o el filtrado de tiempos de vida?
- [ ] ¿Cambiaron `NoKeyOverlap`, `Module`, `SpecMap` o los tipos helper del
      namespace?
- [ ] ¿Se añadió un nuevo `any` no sólido, `unknown as` o `// @ts-ignore` en
      `src/`?
- [ ] ¿Cambió el comportamiento de un tipo público sin pruebas de tipos?

### Dependencias y build

- [ ] ¿Se añadió una dependencia en runtime a `packages/inferdi/package.json`?
- [ ] ¿Se añadió una peer dependency de `reflect-metadata`, `tslib` o glue de
      frameworks?
- [ ] ¿Se excedió el presupuesto del bundle sin aprobación en la revisión?
- [ ] ¿Se requirió un plugin de TS, un transformer, un flag de decoradores o
      emisión de metadatos?

### Ciclo de vida y liberación

- [ ] ¿`dispose()` o `[Symbol.dispose]()` dejaron de establecer `_disposed` antes
      de invocar a los disposers?
- [ ] ¿Se movió la limpieza de estado después de la invocación de los disposers?
- [ ] ¿Se eliminó el desacoplamiento del padre o la limpieza de `lookupCache`?
- [ ] ¿Cambió el orden de liberación LIFO?
- [ ] ¿Cambió el orden de sondeo de los disposers de `Symbol.asyncDispose` a
      `Symbol.dispose` a `.dispose()`?
- [ ] ¿Los múltiples fallos de limpieza ya no se convierten en `AggregateError`?
- [ ] ¿La limpieza síncrona ya no reporta el mal uso de un recurso asíncrono?

### Vías de escape y uso dinámico

- [ ] ¿Se permitió `.override()` después del primer resolver?
- [ ] ¿`.override()` dejó de preservar `kind` o `lazy`?
- [ ] ¿`.has()` se convirtió en un resolutor o empezó a mutar cachés?
- [ ] ¿Se promovieron las claves construidas en runtime como la API principal?
- [ ] ¿Se añadió al core el auto-wire, la auto-inyección, la inyección por nombre
      de parámetro, el escaneo del sistema de archivos o el descubrimiento de
      módulos?

## 5. Compromisos conscientes

Documenta estas decisiones en lugar de "arreglarlas".

| Compromiso | Razón |
|---|---|
| Sin target ES5 o anterior a ES2022 | `Map`, `Symbol`, `WeakRef`, `Reflect.construct`, `Symbol.dispose` y `Symbol.asyncDispose` son fundamentales. El paquete solo aplica polyfill a los símbolos de liberación para los runtimes que carecen de ellos. Node 16+ sigue siendo el suelo. |
| Sin API de decoradores | La DI basada en decoradores es una biblioteca distinta. |
| Sin metadatos en runtime | Las firmas de los constructores y las tuplas explícitas `deps` proporcionan el grafo. La introspección en runtime añadiría dependencias y modos de fallo más débiles. |
| Sin distinción nominal para dependencias estructurales idénticas | TypeScript usa asignabilidad estructural. Si dos claves exponen la misma forma, `DepsOf` no puede conocer la intención semántica del usuario. Usa tipos con marca o claves `unique symbol` cuando el orden importe entre servicios de la misma forma. |
| Sin `get()` asíncrono | Los guards actuales de ciclos y tiempos de vida usan estado de pila de llamadas síncrono compartido. Una API de resolución asíncrona necesitaría una contabilidad separada por cada resolución. |
| Sin detección de ciclos entre factorías asíncronas | Tras un `await`, la pila de resolución síncrona ya no existe y las promesas pendientes pueden satisfacer llamadas `c.get()` posteriores. Detectar esto añadiría seguimiento asíncrono a la resolución. Separa el ciclo, eleva la inicialización compartida o usa `Lazy<singleton>` donde sea legal. |
| Sin ruptura automática de ciclos | Los ciclos son defectos arquitectónicos a menos que uno de los lados sea un companion singleton lazy explícito. InferDI detecta los ciclos de runtime soportados y los reporta; no inventa proxies ni instancias parciales. |
| Sin módulos genéricos `<T>(c: Container<T>) => ...` | `keyof T` colapsa al límite superior `DependenciesMap` dentro del cuerpo genérico. Usa lambdas `.use()` en línea o `Module<TIn, TOut>` con una forma de entrada conocida. |
| Sin API de resolutor de DI dinámico | `.has(key)` es la sonda dinámica autorizada. Las claves estáticas deberían usar `.get()` directamente. |
| Sin historia de override en producción | `.override()` existe para pruebas y fixtures de hot-reload. La selección del grafo en producción pertenece a `.use()` o al código normal del builder. |
| Sin liberación en cascada de padre a hijo | Cada contenedor posee sus propias instancias. La liberación en cascada convertiría a `dispose()` en un efecto secundario no local y rompería la propiedad del scope. |
| Sin hooks, interceptores ni middleware en la resolución | Eso es AOP. Añadiría trabajo a la ruta caliente y difuminaría el contrato del core. |
| Sin glue de frameworks en el core | Los adaptadores de frameworks pertenecen a los paquetes de adaptadores. El core se mantiene sin dependencias y agnóstico del framework. |

## 6. No objetivos

InferDI no se convertirá en:

- Un framework de IoC universal.
- Un contenedor de decoradores o de reflexión.
- Un sistema de contexto de petición o un reemplazo de `AsyncLocalStorage`.
- Un escáner de auto-wiring.
- Un host de plugins para middleware en tiempo de resolución.
- Una capa de compatibilidad para contenedores de DI heredados.

Regla final: el grafo es el tipo, y el tipo es el contrato.
