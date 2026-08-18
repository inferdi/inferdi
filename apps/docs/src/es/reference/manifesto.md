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
codificarla en las firmas públicas. Las comprobaciones en runtime existen para
los casts con `as`, los contenedores externos capturados, las claves dinámicas y
otros lugares donde TypeScript no puede ver el grafo.

### Propuesta de valor

El grafo es el tipo. Una clave ausente, una posición incorrecta en el constructor,
un registro duplicado o una fuga de un singleton hacia un servicio con scope
deberían fallar antes de que se ejecute el código de producción. InferDI también
mantiene pequeño el contrato en runtime: sin dependencias en runtime, sin
decoradores, sin reflexión de metadatos, sin trampas de proxy y sin maquinaria de
frameworks en el paquete core.

La resolución con acierto de caché sigue siendo una ruta rápida de un único
`Map.get()`. La construcción de clases usa llamadas directas `new Ctor(...)`
desplegadas por aridad para 0-7 dependencias y una ruta de cola medida para 8 o
más dependencias.

Si una funcionalidad debilita esas promesas, recházala o muévela fuera del core.

## 2. Pilares innegociables

### 2.1 Seguridad de tipos de extremo a extremo

Toda firma pública debe hacer que los estados de grafo inválidos sean
irrepresentables allí donde TypeScript pueda expresar la regla.

- `register*` acepta `key: K & NoKeyOverlap<K, keyof T>`, donde `NoKeyOverlap`
  comprueba `[K & keyof T]` de forma no distributiva. Se siguen admitiendo claves
  literales, amplias, de símbolo y de unión, pero cualquier solapamiento rechaza
  toda la clave candidata en vez de descartar en silencio un miembro de la unión.
- `DepsOf<AllowedDeps<T, L>, A>` comprueba una tupla `deps` contra los parámetros
  del constructor por posición y asignabilidad estructural.
- `AllowedDeps<T, L>` estrecha el contenedor que reciben las factorías. Dentro de
  una factoría singleton, `c.get('scoped')` es un error de tipo.
- La forma por cierre de `registerFactory` recibe el contenedor filtrado por
  lifetime. Su overload con dependencias recibe un resolver limitado a las
  claves sync declaradas; `registerAsyncFactory` recibe los valores posicionales
  resueltos en lugar de un contenedor. No mezcles estos contratos de callback.
- `Lazy`, `AsyncLazy`, `Lifetime`, `Spec`, `AsyncSpec`, `LazySpec`,
  `AsyncLazySpec`, `ScopeInputMap`, `WithRequirements`, `DependenciesMap`,
  `SpecMap`, `ContainerOptions`, `Module`, así como `Container.ReadyKeys`,
  `Container.SyncReadyKeys`, `Container.Resolve`, `Container.ResolveUnwrapped`,
  `Container.UnwrappedValue` y `Container.Providers`, son contratos públicos.
  Trata cualquier cambio en su asignabilidad o inferencia como un cambio de API,
  aunque no cambie el código en runtime.
- Los resolvers genéricos usan `Container.SyncReadyKeys<C>` para `get()` y
  `Container.ReadyKeys<C>` para `getAsync()`. `.has()` solo demuestra que existe
  un registro; no demuestra el modo sync ni satisface inputs de scope ausentes.
- Una superficie pública de tipos nueva o modificada necesita cobertura positiva
  y negativa con `// @ts-expect-error` en `container.test-d.ts` o en la suite de
  pruebas de tipos async declarativas. Los mensajes de diagnóstico públicos para
  módulos o inputs de scope también necesitan su fixture de diagnóstico del
  compilador, y las declaraciones emitidas deben seguir pasando
  `consumer-dts.ts` con TypeScript 5.2.

Los límites conocidos de TypeScript deben documentarse, no ocultarse. Por
ejemplo, dos dependencias con el mismo tipo estructural siguen siendo
intercambiables a menos que los usuarios introduzcan una distinción nominal,
como claves `unique symbol` o tipos de valor con marca.

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

El core tiene tres lifetimes de registro: `singleton`, `scoped` y `transient`.
Cada registro lleva su lifetime mediante `Spec<V, L>` y su propiedad pública
`lifetime`.

- Un singleton no debe depender directamente de un servicio con scope o
  transitorio. `AllowedDeps<T, L>` lo impone en tiempo de compilación; el contrato
  checked por defecto lo impone en runtime para casts y registros dinámicos.
  Cualquier unión de lifetime objetivo que pueda incluir `'singleton'` usa el
  filtro seguro para singleton; solo una unión que excluya singleton puede
  aceptar dependencias de vida corta.
- `Lazy<V>` y `AsyncLazy<V>` preservan el lifetime del objetivo. Un consumidor
  singleton solo puede inyectar un companion gestionado cuyo estado completo de
  lifetime objetivo sea `'singleton'`. Los lifetimes scoped, transient, mixtos y
  las uniones de valores gestionados y no gestionados siguen siendo ilegales para
  consumidores singleton.
- El flag `Registration.lazy` en runtime debe ser `true` solo para companions
  lazy cuyo lifetime objetivo sea `'singleton'`.
- El flag `Registration.owned` en runtime es `true` solo para registros de clase
  o factoría cuyo valor creado pertenezca al contenedor. Es `false` para
  `registerValue`, `.override()`, companions lazy, inputs de scope y resultados
  transient.
- Los valores de `registerValue`, `.override()` y los inputs de scope tienen
  propietario externo. Los resultados transient pertenecen al llamador. Ninguno
  entra en la cola de limpieza.
- `.override()` es una vía de escape para pruebas. Debe preservar el estado
  original de `kind`, `lazy` y `async`; mantenerse local al scope; y rechazar
  inputs de scope declarados, claves desconocidas, contenedores liberados y claves
  presentes en la caché local del contenedor actual. La guarda de caché detecta
  registros singleton/scoped cacheados localmente, `registerValue` y overrides
  repetidos, pero no puede observar resoluciones transient ni valores propiedad
  de un ancestro resueltos desde un hijo checked. Aplica los overrides antes de
  resolver el grafo incluso cuando la guarda en runtime no pueda probar el
  momento.
- `dispose()` solo toca las instancias que pertenecen a ese contenedor. Los
  contenedores padre e hijo no se liberan entre sí.

#### 2.3.1 El modo async es estado de tipo

Los servicios async declarativos usan el mismo grafo, mapa de registros, caché,
búsqueda de scope, reglas de propiedad y ruta de liberación que los servicios
síncronos.

- `registerAsyncFactory` registra el tipo de valor final en `AsyncSpec<V, L>`, no
  `Promise<V>`. Su tupla de dependencias posicionales se comprueba como una tupla
  de constructor y permanece readonly porque el registro conserva las posiciones
  clasificadas.
- Los registros async singleton y scoped cachean una única Promise nativa, por lo
  que las llamadas concurrentes a `getAsync()` comparten la misma inicialización.
  Resolver solo un wrapper `AsyncLazy` no debe iniciar su objetivo.
- Una clase con una dependencia async declarativa se vuelve async de forma
  transitiva. Su objetivo se resuelve mediante `getAsync()` y su companion
  gestionado se convierte en `AsyncLazy`; una clase seleccionada por una unión de
  claves sync/async permanece conservadoramente mixta.
- `get()` rechaza las claves async declarativas en los tipos. `getAsync()` acepta
  cualquier clave preparada, devuelve una Promise y convierte los fallos
  síncronos del resolver en rechazos sin crear otro registro ni otra ruta de
  resolución.
- Un `registerFactory` que devuelve una Promise sigue siendo una entrada ordinaria
  del grafo síncrono cuyo valor es la propia Promise. No reclasifiques en silencio
  este contrato heredado como `AsyncSpec`.
- `Registration.async` es metadato frío añadido al final y usado para clasificar
  dependencias durante el registro. La ruta caliente de resolución nunca debe
  leerlo.

#### 2.3.2 La disponibilidad del scope es estado de tipo

Los inputs de scope describen valores propiedad de la aplicación que solo pasan
a estar disponibles al abrir scopes hijos.

- `declareScopeInputs<Inputs>()` existe solo en los tipos y no debe modificar el
  contenedor en runtime.
- Las declaraciones aceptan claves string o symbol finitas y obligatorias. Se
  rechazan las claves numéricas, `__proto__`, las firmas de índice amplias, las
  propiedades opcionales, las uniones con conjuntos de claves distintos y las
  colisiones con el grafo existente.
- `createScope(inputs)` puede proporcionar cualquier subconjunto de los inputs
  ausentes. La disponibilidad se propaga por los registros dependientes, los
  scopes anidados heredan los inputs ya proporcionados y solo las claves
  preparadas se pueden resolver.
- Los valores proporcionados se copian superficialmente en la caché hija, siguen
  siendo propiedad de la aplicación, no pueden registrarse encima ni ser
  sustituidos con `.override()` y quedan excluidos de `Container.Providers<C>`.

#### 2.3.3 Los módulos son contratos de requisitos

`Module<TRequirements, TProvides>` describe una transformación reutilizable del
grafo, no un alias exacto de todo el contenedor.

- El grafo real puede contener entradas adicionales, pero cada requisito debe
  coincidir en asignabilidad del servicio, lifetime exacto, estado sync/async,
  modo lazy gestionado, identidad del input de scope y disponibilidad.
- El callback del módulo solo ve sus requisitos declarados. El grafo devuelto
  conserva todas las entradas reales y añade los outputs declarados.
- Las claves de output no deben colisionar con el grafo real. Los requisitos de
  inputs de scope que el llamador ya haya satisfecho se eliminan del estado de
  salida devuelto.
- Los helpers genéricos `<T>(c: Container<T>) => ...` no pueden demostrar claves
  nuevas arbitrarias frente al límite superior `DependenciesMap`. Usa lambdas
  inline en `.use()` o un `Module<TRequirements, TProvides>` con nombre.

### 2.4 La ruta caliente de resolución se mantiene pequeña

La primera operación en `get()` es la consulta de la caché local:

```ts
const cached = this.cache.get(key)
if (cached !== undefined) return ...
```

No añadas trabajo antes de esa consulta.

- Los valores `undefined` explícitos se representan con `UNDEFINED_MARKER`; no
  reintroduzcas una segunda consulta `cache.has(key)` en la ruta de acierto de
  caché.
- `_disposed`, la búsqueda del registro, la búsqueda del padre, las comprobaciones
  de ciclos y lifetime y la mutación de la pila de singletons ocurren después de
  la ruta rápida de caché.
- Los árboles por defecto comprueban los registros locales antes de recorrer la
  cadena exacta de padres. No conservan snapshots de búsqueda en el padre, así que
  las mutaciones siguen siendo observables sin invalidación ni metadatos de
  búsqueda por scope.
- La invocación del constructor permanece desplegada por aridad para 0-7
  argumentos. La ruta de 8 o más usa `Reflect.construct` con un array compacto
  construido mediante `push`.
- `get()` permanece síncrono. El array compartido `resolving` y `singletonStack`
  solo funcionan porque una resolución y cada preflight de dependencias async
  declarativas se ejecutan atómicamente en la pila de llamadas. `getAsync()`
  añade un límite de Promise alrededor del mismo resolver y nunca modifica esas
  pilas desde una continuation.
- Los registros async declarativos comparten `regs`, `cache`, búsqueda de scope,
  propiedad y liberación con los registros sync. `Registration.async` es metadato
  frío usado durante la clasificación de dependencias al registrar; `get()` nunca
  lo lee.
- `{fast: false}` es el contrato checked y mutable por defecto. `{fast: true}`
  elimina las comprobaciones de ciclos y lifetime después de la ruta rápida de
  caché local, lee directamente del propietario del registro y refleja los
  singletons delegados en la caché local. Un árbol fast es un contrato de grafo
  fijo: termina todos los `register*`, `.use()` y `.override()` antes de la primera
  resolución o `createScope()`, y libera los hijos antes que los ancestros. Solo
  el literal `true` lo habilita; los casts o valores de opción desconocidos
  conservan de forma segura el contrato checked.
- Mantén los campos calientes de `Registration` en el orden
  `{kind, lazy, fn, owned}`. El marcador opcional `async` solo puede añadirse
  después y debe permanecer fuera de la ruta de resolución.

`packages/inferdi/__tests__/container.bench.ts` no está impuesto por CI. Los
revisores deben exigir resultados de benchmarks para cambios en `get()`, la forma
del objeto de registro, la representación de la caché, la búsqueda de scope, los
companions lazy o la invocación del constructor. Una regresión local superior al
5% en un escenario relevante bloquea el merge salvo que el PR incluya una
justificación escrita y acotada.

### 2.5 Cero dependencias en runtime

`@inferdi/inferdi` no tiene dependencias en runtime. Debe seguir así.

El bundle publicado debe mantenerse estrictamente por debajo de 3 KiB (3072
bytes) comprimido con gzip. CI impone este presupuesto con
`pnpm run test:bundle-size`; los revisores deben seguir inspeccionando los cambios
de tamaño en PR que añadan código a la implementación core o a helpers públicos.

### 2.6 La liberación hace cumplir la propiedad

La liberación solo cierra los valores cacheados que pertenecen al contenedor
actual. Es idempotente, segura ante reentradas e independiente entre padres e
hijos.

- Marca el contenedor como liberado, toma una copia de `owned` y elimina
  duplicados; después limpia `owned`, `cache`, `regs`, `scopeInputs` y `parent`
  antes de invocar los disposers del usuario. Una resolución reentrante debe ver
  de inmediato un contenedor desmontado.
- Conserva el orden LIFO de la primera creación. Las entradas de caché duplicadas
  y las distintas factorías async que resuelvan al mismo recurso deben cerrarlo
  una sola vez.
- `dispose()` async comparte una única Promise de finalización en curso, espera
  las Promises cacheadas de factorías async, prueba `Symbol.asyncDispose` →
  `Symbol.dispose` → `.dispose()`, continúa después de los fallos y lanza un error
  o un `AggregateError` si hay varios.
- `[Symbol.dispose]()` sync solo invoca protocolos síncronos. Una Promise cacheada
  o un `.dispose()` normal que devuelve una Promise se informa como uso incorrecto;
  no inicies una limpieza invisible en segundo plano para ocultar el error.
- `registerValue`, `.override()`, los inputs de scope, los wrappers lazy y los
  valores transient permanecen fuera de la limpieza del contenedor porque nunca
  se transfirió su propiedad.

## 3. Filtro de PR

Para cada PR que toque `packages/inferdi/src`, `packages/inferdi/package.json`,
`packages/inferdi/jsr.json` o las pruebas del core, responde estas preguntas en la
revisión:

1. ¿El cambio preserva las garantías del grafo en tiempo de compilación o mueve
   una regla a comprobaciones en runtime sin una limitación documentada de
   TypeScript?
2. ¿Toca el comportamiento de acierto de caché en `get()`, la forma del objeto de
   registro, la búsqueda de scope, la resolución lazy o la invocación del
   constructor? Si es así, ¿dónde están las pruebas de benchmark?
3. ¿Añade al paquete core una dependencia en runtime, soporte de decoradores,
   reflexión de metadatos, resolución basada en proxy o un requisito de
   transpilador?

Rechaza el PR si el punto 1 mueve una regla de tipos a runtime sin motivo, si el
punto 2 carece de evidencia de benchmark o si la respuesta al punto 3 es sí.

## 4. Checklist de control estricto

Cualquier cambio que coincida con un punto de esta lista necesita una
justificación explícita en el PR.

### Ruta caliente y forma en runtime

- [ ] ¿Se ha añadido trabajo antes de `cache.get(key)` en `get()`?
- [ ] ¿Han cambiado `UNDEFINED_MARKER`, `cache`, `regs`, la búsqueda del padre o
      la forma de `Registration`?
- [ ] ¿Ha cambiado el orden de propiedades calientes de `Registration` respecto
      a `{kind, lazy, fn, owned}`, o se ha movido el marcador opcional `async`
      antes de esos campos?
- [ ] ¿La búsqueda del registro local en el contrato checked se ha movido detrás
      de la búsqueda del padre?
- [ ] ¿Se han añadido `Proxy`, `Reflect.get`, `Object.defineProperty` o consultas
      de metadatos a la resolución?
- [ ] ¿Se ha convertido `get()` en `async`?
- [ ] ¿`get()` ha empezado a leer `Registration.async` o a calcular
      disponibilidad?
- [ ] ¿Se han eliminado o remodelado las ramas desplegadas por aridad para 0-7
      argumentos del constructor?
- [ ] ¿Los scopes fast han dejado de leer directamente al propietario del
      registro o de reflejar solo los singletons delegados?

### Sistema de tipos

- [ ] ¿Se ha debilitado la guarda contra claves duplicadas fuera de
      `.override()`?
- [ ] ¿Se ha estrechado `string | symbol` a `string` en alguna restricción pública
      de claves?
- [ ] ¿Se han debilitado `AllowedDeps`, `LazySpec`, `AsyncLazySpec`, la
      propagación async, la disponibilidad o el filtrado por lifetime?
- [ ] ¿Han cambiado `NoKeyOverlap`, `ScopeInputMap`, `WithRequirements`, la
      compatibilidad de módulos, `SpecMap` o los tipos helper del namespace?
- [ ] ¿Las declaraciones de inputs de scope aceptan claves opcionales, numéricas,
      amplias, variantes o en colisión, o pueden resolverse antes de
      proporcionarlas?
- [ ] ¿Un módulo con nombre puede ocultar requisitos ausentes o incompatibles, o
      hacer colisionar sus outputs con el grafo real?
- [ ] ¿Se han añadido nuevos `any`, `unknown as` o `// @ts-ignore` inseguros en
      `src/`?
- [ ] ¿Ha cambiado el comportamiento público de tipos sin pruebas positivas y
      negativas, fixtures de diagnóstico donde correspondan y la comprobación
      del consumidor de declaraciones?

### Dependencias y build

- [ ] ¿Se ha añadido una dependencia en runtime a
      `packages/inferdi/package.json`?
- [ ] ¿Se ha añadido una peer dependency de `reflect-metadata`, `tslib` o glue de
      framework?
- [ ] ¿Se ha superado el presupuesto estricto de gzip `< 3 KiB` o se ha
      debilitado su comprobación en CI?
- [ ] ¿Se requiere un plugin o transformer de TS, un flag de decoradores o emisión
      de metadatos?

### Ciclo de vida y liberación

- [ ] ¿`dispose()` o `[Symbol.dispose]()` ha dejado de establecer `_disposed`
      antes de invocar los disposers?
- [ ] ¿La limpieza de `owned`, `cache`, `regs`, `scopeInputs` o `parent` se ha
      movido después de invocar el disposer?
- [ ] ¿Se ha eliminado la desconexión del padre?
- [ ] ¿La eliminación de duplicados de instancias propias ha dejado de conservar
      el orden LIFO de primera creación?
- [ ] ¿Ha cambiado el orden LIFO de liberación?
- [ ] ¿Ha cambiado el orden de prueba del disposer async de `Symbol.asyncDispose`
      a `Symbol.dispose` y después `.dispose()`?
- [ ] ¿Las Promises cacheadas de factorías async han dejado de esperarse antes de
      la prueba, o puede liberarse dos veces un recurso resuelto compartido?
- [ ] ¿Las llamadas concurrentes a `dispose()` async han dejado de compartir una
      Promise de finalización?
- [ ] ¿Varios fallos de limpieza han dejado de producir un `AggregateError`?
- [ ] ¿La limpieza sync ha dejado de informar del uso incorrecto de recursos
      async?

### Vías de escape y uso dinámico

- [ ] ¿Se ha debilitado la guarda temporal de caché local de `.override()` o se
      han ocultado sus límites documentados para resoluciones transient y
      propiedad de ancestros?
- [ ] ¿`.override()` ha dejado de preservar `kind`, `lazy` o `async`, ha dejado de
      ser local o está disponible para claves declaradas como inputs de scope?
- [ ] ¿`.has()` se ha convertido en un resolver o ha empezado a mutar cachés?
- [ ] ¿`.has()` ha empezado a afirmar disponibilidad o seguridad de resolución
      síncrona?
- [ ] ¿Un árbol fast se ha vuelto mutable tras activarse o se ha debilitado su
      contrato de liberar hijos antes que ancestros?
- [ ] ¿Se promueven las claves construidas en runtime como API principal?
- [ ] ¿Se han añadido al core auto-wire, auto-inject, inyección por nombres de
      parámetros, escaneo del sistema de archivos o descubrimiento de módulos?

## 5. Compromisos conscientes

Documenta estas decisiones en lugar de «arreglarlas».

| Compromiso | Motivo |
|---|---|
| Sin target ES5 ni anterior a ES2022 | `Map`, `Symbol`, `WeakRef`, `Reflect.construct`, `Symbol.dispose` y `Symbol.asyncDispose` son fundamentales. El paquete solo incluye polyfills de los símbolos de liberación en runtimes que no los tengan. Node 16+ sigue siendo el mínimo. |
| Sin API de decoradores | La DI basada en decoradores es otra biblioteca. |
| Sin metadatos en runtime | Las firmas de los constructores y las tuplas `deps` explícitas proporcionan el grafo. La introspección en runtime añadiría dependencias y modos de fallo más débiles. |
| Sin distinción nominal para dependencias estructurales idénticas | TypeScript usa asignabilidad estructural. Si dos claves exponen la misma forma, `DepsOf` no puede conocer la intención semántica del usuario. Usa tipos con marca o claves `unique symbol` cuando importe el orden entre servicios con la misma forma. |
| Sin `get()` async | `get()` permanece síncrono. `getAsync()` envuelve el mismo resolver síncrono y devuelve una Promise sin crear otro registro, caché o ruta de resolución. |
| Un `registerFactory` que devuelve una Promise sigue siendo estado de grafo síncrono | Las factorías existentes pueden exponer intencionadamente una Promise como valor de servicio. Solo `registerAsyncFactory` crea `AsyncSpec` y propagación async declarativa. |
| Sin detección de ciclos dinámicos tras un límite de Promise | Las aristas async declarativas pasan por un preflight síncrono y usan la guarda de ciclos existente. Las llamadas desde factorías heredadas cuyo valor es una Promise o desde contenedores capturados después de `await` ocurren cuando la pila de resolución ya se ha limpiado. Divide ese ciclo o eleva la inicialización compartida. |
| Sin detección de lifetime en runtime tras un límite async | `AllowedDeps` sigue bloqueando factorías tipadas inválidas, pero los casts con `as` y los contenedores externos capturados usados después de `await` se ejecutan cuando `singletonStack` ya se ha limpiado. Una defensa completa requeriría seguimiento de contexto async. Lee las dependencias en el preludio síncrono de la factoría. |
| Sin ruptura automática de ciclos | Los ciclos son defectos arquitectónicos salvo que un lado sea un companion lazy singleton explícito. InferDI detecta y comunica los ciclos admitidos en runtime; no inventa proxies ni instancias parciales. |
| Sin módulos genéricos `<T>(c: Container<T>) => ...` | `keyof T` se reduce al límite superior `DependenciesMap` dentro del cuerpo genérico. Usa lambdas inline en `.use()` o `Module<TRequirements, TProvides>` con requisitos declarados. |
| Sin fuente implícita de inputs de scope | `declareScopeInputs()` existe solo en los tipos. Las aplicaciones pasan de forma explícita sus valores a `createScope(inputs)`; el core no lee el contexto ambiental de request ni `AsyncLocalStorage`. |
| Sin API de resolver DI dinámico | `.has(key)` es la consulta de registro permitida. No demuestra disponibilidad ni modo sync; las claves estáticas preparadas deberían usar `.get()` o `.getAsync()` directamente. |
| Sin estrategia de override en producción | `.override()` existe para pruebas y fixtures de hot reload, y su comprobación temporal solo observa la caché local. La selección del grafo de producción pertenece a `.use()` o al código builder normal. |
| El modo fast es un contrato de grafo fijo | `{fast: true}` obtiene una búsqueda más plana y reflejo de singletons confiando en los invariantes de topología, ciclo de vida, ciclos y lifetime. El contrato checked y mutable sigue siendo el valor por defecto. |
| Sin liberación en cascada del padre a los hijos | Cada contenedor posee sus propias instancias. La liberación en cascada convertiría `dispose()` en un efecto lateral no local y rompería la propiedad del scope. |
| Sin hooks, interceptores ni middleware en la resolución | Eso es AOP. Añadiría trabajo a la ruta caliente y difuminaría el contrato del core. |
| Sin glue de frameworks en el core | Los adaptadores de frameworks pertenecen a paquetes de adaptadores. El core sigue sin dependencias y es agnóstico respecto a frameworks. |
| Sin motor de análisis del grafo en el core | Las notas del repositorio sobre un posible `@inferdi/graph` son propuestas, no la API actual. Cualquier companion futuro para desarrollo o CI debe permanecer fuera de la resolución de producción y no alterar la forma caliente del registro. |

## 6. No objetivos

InferDI no se convertirá en:

- Un framework IoC universal.
- Un contenedor de decoradores o reflexión.
- Un sistema de contexto de request ni un sustituto de `AsyncLocalStorage`.
- Un escáner de auto-wiring.
- Un DSL de definición de providers ni un sistema de descubrimiento de módulos en
  runtime.
- Un motor de análisis de grafos, reglas, informes o snapshots en el core de
  producción.
- Un host de plugins para middleware durante la resolución.
- Una capa de compatibilidad para contenedores DI heredados.

Regla final: el grafo es el tipo y el tipo es el contrato.
