# Rendimiento

## Resultado registrado

En la ejecución pública del **2026-08-17**, el contrato checked predeterminado resolvió un singleton caliente en una mediana de **6.233 ns/op**. Solo para ese escenario y las versiones registradas, los demás contenedores participantes midieron entre **1.76 y 13.05 veces** esa mediana. Estas cifras miden el coste del contenedor, no el throughput HTTP ni el rendimiento total de la aplicación. El [resultado original](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json) contiene las ocho rondas y los metadatos del entorno.

Una resolución en caliente lee `Map.get(key)` y llama a `new Ctor(...)` de forma directa cuando necesita construir el servicio. Los escenarios cubren estas decisiones del runtime:

| Decisión en runtime                    | Efecto                                                                                                                                                                                                 |
|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Registros explícitos                   | La construcción del contenedor es un `Map.set` plano por servicio. No hay efectos secundarios de decoradores, parsers de nombres de constructor ni tablas de metadatos que preparar.                   |
| Servicios singleton y scoped cacheados | Una resolución en caliente lee de `cache.get(key)` antes de que se ejecute la contabilidad de ciclos y tiempos de vida. Un `undefined` explícito se guarda como `UNDEFINED_MARKER` interno, así que el cache hit sigue usando una sola consulta. |
| Llamadas directas al constructor       | Las clases con 0-7 dependencias usan una ruta `new Ctor(...)` directa. Los constructores más grandes recurren a `Reflect.construct`.                                                                   |
| Factorías asíncronas                   | La `Promise` de la factoría se cachea tal cual, de modo que las llamadas concurrentes comparten una única inicialización en curso mientras `.get()` permanece síncrono.                                |
| Contrato de runtime                    | Default/`fast: false` mantiene los checks y una cadena de padres exacta y mutable. `fast: true` desactiva los checks y activa la búsqueda de scopes con topología fija.                                |

## Conjunto de benchmarks

El workspace comparativo mide `InferDI (fast)` e `InferDI (default)` junto con InversifyJS v8, Awilix v13 en modos PROXY y CLASSIC, TSyringe v4, TypeDI v0.10 y Typed Inject v5. El resultado sin procesar registra las versiones de los paquetes y el entorno de la máquina usado en esta ejecución.

**Corrección antes de medir**

Las pruebas de contrato de los adaptadores se ejecutan antes de Tinybench. Cada adaptador debe proporcionar el mismo grafo observable:

- `Logger`, `Config`, `Repo` y `Service` se comportan como singletons raíz
- los nodos transient producen instancias nuevas
- cada scope guarda su propio `ScopedService` en caché y comparte el logger raíz
- el acceso lazy aplaza la resolución del servicio de destino
- cada API de teardown declarada invoca el disposer del servicio scoped

Estas comprobaciones impiden que las diferencias de lifetime o identidad entren en la comparación de tiempos. Los escenarios miden el coste después de que cada adaptador supere el contrato.

**Diseño de la medición**

El runner público instala las dependencias con el lockfile congelado, comprueba los tipos del workspace de benchmarks, construye el artefacto ESM de producción de InferDI y ejecuta las pruebas de contrato contra ese artefacto. Después mide los sujetos bajo estas condiciones:

1. Un bloque de cuadrado latino equilibrado contiene ocho rondas, una por cada sujeto.
2. Cada sujeto ocupa una vez cada posición de inicio de proceso y sigue una vez a cada uno de los demás sujetos. `InferDI (fast)` precede a `InferDI (default)` en cuatro rondas y lo sigue en las otras cuatro.
3. Cada sujeto se ejecuta en un proceso de Node nuevo, por lo que las implementaciones no comparten feedback del JIT, cachés inline ni historial del GC.
4. Tinybench calienta cada escenario durante 50 ms y lo mide durante 100 ms. Cada muestra ejecuta un lote con un tamaño adecuado para esa operación.
5. Para cada combinación de sujeto, escenario y ronda, el runner divide la mediana de la duración del lote de Tinybench entre el tamaño del lote y registra el valor normalizado en `ns/op`.
6. El reporter agrega los ocho valores por ronda mediante la mediana y la desviación absoluta mediana (MAD).

Un valor menor de `ns/op` indica una operación más rápida. MAD muestra la dispersión alrededor de la mediana, pero no es un intervalo de confianza. El aislamiento de procesos y el orden de inicio equilibrado reducen el sesgo de medición sin eliminar los efectos de la planificación del sistema operativo, los cambios de frecuencia de la CPU, las decisiones del JIT o el momento de ejecución del GC.

**Límites de los escenarios**

Cada escenario aísla una parte del trabajo del contenedor. El código de producción combina varios de estos pasos según su modelo de lifetime.

| Grupo de carga | Escenarios | Trabajo del contenedor representado |
|---|---|---|
| Acceso en caliente | Resolución de singleton en caliente, resolución scoped en caliente, resolución lazy | Lectura de un servicio en caché o acceso mediante un wrapper lazy existente |
| Construcción de objetos | Resolución transient, grafo profundo, grafos anchos | Fallos de caché, recorrido de dependencias, preparación de argumentos y constructores |
| Inicio y acceso en frío | Registro, primera resolución | Configuración del grafo y primer llenado de las cachés |
| Ciclo de vida del scope | Creación del scope, primera resolución scoped, teardown síncrono y asíncrono | Propiedad del scope por petición o trabajo, desde su creación hasta la limpieza |

Los hooks de setup de Tinybench preparan los grafos fríos y los scopes fuera de cada región medida. La limpieza de los escenarios de registro y resolución también queda fuera de la medición. Los escenarios de teardown miden la propia limpieza.

TypeDI muestra `N/A` en Registration porque las definiciones de servicio comparables se ejecutan como efectos secundarios de decoradores durante la evaluación del módulo, una fase que el temporizador de registro excluye. Las filas de teardown incluyen las bibliotecas con un contrato público equivalente: InversifyJS muestra `N/A`, TypeDI participa en el teardown síncrono y Awilix, TSyringe y Typed Inject participan en el teardown asíncrono. InferDI expone ambos contratos de limpieza.

**Resultado público**

Cada celda contiene `mediana ± MAD` en `ns/op`. El factor entre paréntesis compara esa mediana con la menor mediana de la misma fila.

![Resultados de los benchmarks](https://raw.githubusercontent.com/inferdi/inferdi/main/assets/benchmarking_results.jpg)

| Escenario | InferDI (fast) | InferDI (default) | InversifyJS | Awilix PROXY | Awilix CLASSIC | TSyringe | TypeDI | Typed Inject |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Resolución de singleton en caliente | 6.233 ± 0.091 (1.00×) | 6.233 ± 0.000 (1.00×) | 10.954 ± 0.321 (1.76×) | 40.425 ± 0.596 (6.49×) | 41.525 ± 0.367 (6.66×) | 81.354 ± 3.254 (13.05×) | 71.729 ± 0.962 (11.51×) | 48.354 ± 1.374 (7.76×) |
| Resolución transient | 41.798 ± 2.196 (1.00×) | 45.834 ± 1.284 (1.10×) | 79.566 ± 3.850 (1.90×) | 219.82 ± 8.250 (5.26×) | 227.15 ± 8.068 (5.43×) | 301.40 ± 16.682 (7.21×) | 519.75 ± 5.498 (12.43×) | 138.05 ± 1.464 (3.30×) |
| Grafo profundo (10 niveles) | 344.21 ± 11.460 (1.00×) | 445.50 ± 10.085 (1.29×) | 397.37 ± 7.795 (1.15×) | 1306.3 ± 16.500 (3.79×) | 1190.8 ± 12.375 (3.46×) | 1463.0 ± 34.835 (4.25×) | 4478.8 ± 26.582 (13.01×) | 717.75 ± 3.670 (2.09×) |
| Grafo ancho (4 dependencias) | 59.584 ± 1.282 (1.00×) | 71.316 ± 1.284 (1.20×) | 103.22 ± 2.932 (1.73×) | 331.10 ± 6.416 (5.56×) | 302.69 ± 5.498 (5.08×) | 457.97 ± 18.150 (7.69×) | 863.32 ± 12.832 (14.49×) | 197.63 ± 1.468 (3.32×) |
| Grafo ancho (10 dependencias) | 188.37 ± 4.125 (1.00×) | 200.74 ± 4.130 (1.07×) | 394.63 ± 4.580 (2.09×) | 681.08 ± 21.080 (3.62×) | 571.54 ± 12.830 (3.03×) | 979.46 ± 15.125 (5.20×) | 2234.1 ± 25.888 (11.86×) | 321.29 ± 4.585 (1.71×) |
| Registro | 2007.5 ± 27.500 (1.00×) | 2158.8 ± 13.750 (1.08×) | 61274.6 ± 1537.7 (30.52×) | 74763.4 ± 1024.4 (37.24×) | 95225.6 ± 467.45 (47.43×) | 3762.9 ± 36.650 (1.87×) | N/A | 3593.3 ± 18.300 (1.79×) |
| Primera resolución | 653.13 ± 24.745 (1.00×) | 794.98 ± 6.190 (1.22×) | 9967.4 ± 551.61 (15.26×) | 2434.9 ± 96.250 (3.73×) | 3044.2 ± 70.360 (4.66×) | 1236.8 ± 25.440 (1.89×) | 3322.9 ± 22.455 (5.09×) | 1275.3 ± 22.917 (1.95×) |
| Creación del scope | 79.750 ± 2.290 (1.00×) | 83.415 ± 5.505 (1.05×) | 6194.4 ± 167.98 (77.67×) | 1054.4 ± 16.960 (13.22×) | 1031.2 ± 7.790 (12.93×) | 503.26 ± 10.540 (6.31×) | 419.38 ± 3.210 (5.26×) | 164.08 ± 1.835 (2.06×) |
| Primera resolución scoped | 115.05 ± 1.830 (1.00×) | 128.34 ± 1.835 (1.12×) | 3048.6 ± 32.765 (26.50×) | 352.92 ± 1.835 (3.07×) | 362.54 ± 4.590 (3.15×) | 373.54 ± 11.915 (3.25×) | 296.08 ± 4.125 (2.57×) | 203.05 ± 0.920 (1.76×) |
| Resolución scoped en caliente | 8.387 ± 0.092 (1.05×) | 8.250 ± 0.046 (1.03×) | 30.204 ± 0.367 (3.79×) | 90.841 ± 1.421 (11.39×) | 95.242 ± 1.421 (11.94×) | 78.375 ± 2.429 (9.83×) | 92.630 ± 0.458 (11.61×) | 7.975 ± 0.092 (1.00×) |
| Teardown síncrono | 99.455 ± 1.370 (1.01×) | 98.085 ± 0.925 (1.00×) | N/A | N/A | N/A | N/A | 124.21 ± 3.665 (1.27×) | N/A |
| Teardown asíncrono | 242.91 ± 3.210 (1.00×) | 249.34 ± 1.840 (1.03×) | N/A | 860.52 ± 20.170 (3.54×) | 886.87 ± 13.750 (3.65×) | 1311.8 ± 10.080 (5.40×) | N/A | 721.42 ± 19.935 (2.97×) |
| Resolución lazy | 18.837 ± 0.458 (1.00×) | 19.020 ± 0.274 (1.01×) | 64.212 ± 3.621 (3.41×) | 115.68 ± 0.825 (6.14×) | 124.09 ± 3.231 (6.59×) | 155.01 ± 5.271 (8.23×) | 271.06 ± 3.941 (14.39×) | 76.496 ± 0.962 (4.06×) |

::: info Datos de origen
El gráfico y la tabla usan [`public-2026-08-17T16-46-00-483Z.json`](https://github.com/inferdi/inferdi/blob/main/benchmarks/results/public-2026-08-17T16-46-00-483Z.json). El resultado sin procesar contiene las ocho rondas, las mediciones normalizadas, las estadísticas de Tinybench, los metadatos del entorno y las versiones de las dependencias. El [README del workspace de benchmarks](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) documenta cada escenario, su correspondencia con producción y el cálculo del informe.
:::

**Interpretación del resultado**

Un modo de InferDI registra la menor mediana o empata con ella en 12 de los 13 escenarios. `InferDI (fast)` consigue ese resultado en 11 escenarios. Las ventajas más claras aparecen en el registro, la primera resolución, la construcción transient y de grafos, la creación del scope y la primera resolución scoped. Estas operaciones recorren código en el que influyen el registro plano de InferDI, las llamadas directas al constructor y su ruta corta tras un fallo de caché.

`Warm scoped resolve` es el único escenario donde ningún modo de InferDI obtiene la menor mediana. Typed Inject registra 7.975 ns, InferDI default 8.250 ns e InferDI fast 8.387 ns. Esta fila mide una lectura de caché desde un scope existente. No incluye la creación del scope, el primer fallo de caché scoped ni el teardown, costes que una misma petición de producción puede pagar por separado.

**Por qué `fast` no es menor en todas las filas**

`fast: true` modifica los fallos de caché protegidos, la construcción, la invalidación durante el registro y la búsqueda de padres en árboles de scopes fijos. Varios escenarios no ejecutan esas ramas después del calentamiento:

- La resolución de singleton en caliente devuelve el valor de `cache.get(key)` antes de leer el flag `fast`. Ambos modos registran la misma mediana de 6.233 ns.
- La resolución scoped en caliente usa la misma ruta de acierto de caché. Fast registra 8.387 ns y default 8.250 ns, una diferencia de 0.137 ns sobre la misma ruta de implementación. La diferencia está en la misma escala que los valores MAD registrados.
- El teardown síncrono usa la misma implementación de disposal en ambos modos. Su diferencia de medianas de 1.370 ns coincide con el MAD de fast en esta ejecución.
- El teardown asíncrono y la resolución lazy dan una pequeña ventaja a fast, aunque su trabajo en estado estable tampoco recibe un beneficio directo de desactivar los guards de resolución. Esas diferencias pequeñas requieren la misma cautela.

Los procesos de Node independientes pueden generar código JIT distinto para rutas idénticas o encontrar otros tiempos del scheduler y el GC. El orden de cuadrado latino y la mediana de ocho rondas reducen esos efectos sin eliminarlos. Las pequeñas inversiones en la resolución scoped en caliente y el teardown síncrono no demuestran una regresión del modo fast. Las ejecuciones repetidas en una máquina controlada aportan pruebas más sólidas para diferencias inferiores a un nanosegundo o de pocos puntos porcentuales.

Las diferencias entre fast y default aumentan cuando cambia la implementación. La mediana de default es 1.29× la de fast en el grafo transient de diez niveles, 1.22× en la primera resolución, 1.20× en el grafo ancho con cuatro dependencias y 1.12× en la primera resolución scoped. Esas direcciones concuerdan con la eliminación de la contabilidad de ciclos y lifetimes y con la búsqueda de scopes de topología fija.

**Relaciona el escenario con la aplicación**

El reporter no calcula una puntuación global porque las aplicaciones pagan combinaciones distintas de trabajo del contenedor. Un proceso de larga duración puede registrar una vez y dedicar la mayor parte del tiempo a lecturas de singletons en caliente. Un adaptador HTTP puede crear un scope, resolver un grafo scoped, leer valores scoped en caché y liberar el scope en cada petición. Un worker puede construir grafos transient sin abrir scopes.

No promedies los factores relativos entre filas. Los escenarios usan tamaños de lote distintos y aíslan regiones de medición independientes. Usa las filas que coincidan con el patrón de resolución medido en la aplicación y después perfila la aplicación completa con su framework y su I/O.

La comparación se aplica a las versiones de paquetes, adaptadores, fixtures y máquina registrados. Cada biblioteca conserva su modelo público de lifecycle, por lo que `N/A` indica que no existe una operación equivalente para esa fila. El benchmark mide el overhead del contenedor, no la latencia completa de una petición.

## `fast: true`

Consulta [Opciones del contenedor](../reference/api#opciones-del-contenedor) para
la referencia del argumento del constructor. Esta sección explica cómo afecta
esa elección al rendimiento.

`new Container({ fast: true })` elimina la contabilidad de ciclos en runtime, el seguimiento de la pila de singletons y el `try`/`finally` alrededor de la ruta de resolución protegida. Los scopes fijos leen directamente el registry owner, sin recorrer la cadena de padres, y reflejan los singletons delegados en la caché del scope. Los scopes predeterminados recorren su cadena exacta de padres en cada fallo local, por lo que las mutaciones siguen visibles. Los contenedores fast omiten la invalidación defensiva durante el registro. La deduplicación por identidad de instancias owned se mantiene durante el disposal.

El `new Container()` predeterminado y la forma explícita `{fast: false}` mantienen los checks de runtime y el grafo mutable.

Usa `fast: true` solo después de que las pruebas hayan ejercitado el grafo con `fast: false`. TypeScript no puede ver ciclos de singletons, ciclos transitorios, claves dinámicas, casts `as` ni factorías que capturen un contenedor externo más amplio. Registra cada clave de runtime una sola vez mediante una cadena fluent lineal, completa el registro antes de la primera resolución o creación de scope, mantén inmutable el árbol activado y elimina los scopes hijos antes que sus ancestros.

Tras esa verificación, `{fast: true}` puede reducir el coste del registro, los fallos de caché, la construcción del grafo y la búsqueda en scopes fijos de un grafo de producción perfilado. Los aciertos de caché en caliente y el disposal usan rutas comunes, por lo que conviene medir las etapas que dominan la aplicación antes de elegir el contrato de runtime. Conserva `fast: false` durante el desarrollo, las pruebas, el hot reload y en cualquier árbol que cambie después de activarse.

## Pequeños detalles de la ruta caliente

### Construcción de servicios transient

`registerClass` es la opción predeterminada para servicios transient. Cámbiala solo si el profiler identifica un grafo que resuelve con frecuencia muchas clases transient distintas con el mismo número de dependencias.

Para ese caso concreto de V8, una factoría explícita mantiene un punto de construcción distinto por servicio:

```ts
const container = new Container()
  .declareScopeInputs<{ context: RequestContext }>()
  .registerClass('schema', Schema, [])
  .registerFactory(
    'parseRequest',
    (c) => new ParseRequest(c.get('context'), c.get('schema')),
    ['context', 'schema'],
    'transient'
  )
```

La factoría repite las dependencias, así que úsala únicamente después de medir el artefacto real. Un helper genérico compartido elimina el punto de llamada independiente y anula esta optimización.

### Representación de las claves

Las claves de tipo símbolo pueden ayudar en bucles de resolución muy ajustados porque `Map` las compara por identidad. Las claves de tipo cadena necesitan hashing y, en caso de colisión, comparación de caracteres. La mayoría de las aplicaciones no medirán ninguna diferencia, así que trata las claves de tipo símbolo como un cambio guiado por el profiler.

## Reproducir localmente

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run bench:quick   # comprobación local del código fuente
pnpm run bench:public  # artefacto de producción, un proceso nuevo por sujeto
```

El workspace de benchmarks está intencionadamente aislado del workspace raíz de pnpm y tiene su propio lockfile. Consulta [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) para la metodología, las notas sobre imparcialidad y las fuentes de los fixtures.
