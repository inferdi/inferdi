# Rendimiento

Una resolución en caliente es un `Map.get(key)` seguido de un `new Ctor(...)` directo: no hay reflexión, ni tabla de metadatos, ni proxy de por medio. Las cifras de los benchmarks que aparecen a continuación se derivan de unas pocas decisiones concretas en runtime, no de un modo rápido especial al que tengas que adherirte:

| Decisión en runtime | Efecto |
| --- | --- |
| Registros explícitos | La construcción del contenedor es un `Map.set` plano por servicio. No hay efectos secundarios de decoradores, parsers de nombres de constructor ni tablas de metadatos que preparar. |
| Servicios singleton y scoped cacheados | Una resolución en caliente lee de `cache.get(key)` antes de que se ejecute la contabilidad de ciclos y tiempos de vida. El recurso a `cache.has(key)` existe solo para valores `undefined` explícitos. |
| Llamadas directas al constructor | Las clases con 0-7 dependencias usan una ruta `new Ctor(...)` directa. Los constructores más grandes recurren a `Reflect.construct`. |
| Factorías asíncronas | La `Promise` de la factoría se cachea tal cual, de modo que las llamadas concurrentes comparten una única inicialización en curso mientras `.get()` permanece síncrono. |
| Frontera del modo estricto | `strict: true` detecta ciclos y fugas de tiempo de vida. `strict: false` elimina esa contabilidad para grafos transitorios calientes ya auditados. |

![Resultados de los benchmarks](/benchmarking_results.png)

## Conjunto de benchmarks

El conjunto de benchmarks del repositorio compara InferDI con InversifyJS v8, Awilix v13 en modos PROXY y CLASSIC, TSyringe v4, TypeDI v0.10 y Typed Inject v5.

Todas las cifras son operaciones por segundo en Node 22. Más alto es mejor.

| Escenario | InferDI | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | InversifyJS | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. Resolución de singleton en caliente** (caché caliente) | **14.2 M** | 7.0 M | 7.2 M | 6.9 M | 6.3 M | 6.2 M | 6.4 M |
| **2. Resolución transitoria** (nueva instancia por llamada) | **8.4 M** | 4.3 M | 3.4 M | 2.9 M | 3.4 M | 2.4 M | 1.6 M |
| **3. Grafo profundo** (10 niveles, todo transitorio) | **1.85 M** | 1.28 M | 701 k | 739 k | 750 k | 601 k | 214 k |
| **4a. Grafo ancho** (4 deps, raíz transitoria) | **7.3 M** | 3.2 M | 2.2 M | 2.3 M | 2.3 M | 1.6 M | 1.1 M |
| **4b. Grafo ancho** (10 deps, raíz transitoria) | **3.5 M** | 2.6 M | 1.2 M | 1.3 M | 1.6 M | 1.0 M | 437 k |
| **5. Construcción del contenedor + primera resolución** | **400 k** | 228 k | 10 k | 8 k | 13 k | 202 k | 272 k |
| **6. Ciclo de vida con scope** (crear + resolver + limpiar) | **2.66 M** | 2.39 M | 492 k | 413 k | 28 k | 1.08 M | 637 k |
| **7. Resolución perezosa** (envoltorio diferido) | **12.1 M** | 7.0 M | 5.5 M | 4.7 M | 4.2 M | 4.0 M | 2.8 M |

## Qué muestran las cifras

- La resolución de singleton cacheado se ejecuta unas 2 veces más rápido que la referencia más cercana de este conjunto.
- La construcción del contenedor más la primera resolución favorece el registro plano. InferDI registra el grafo desde cero; las bibliotecas basadas en decoradores ya han pagado parte de su trabajo de registro durante la evaluación del módulo.
- Los escenarios de grafo ancho muestran por qué importa el desenrollado de aridad. Hasta siete dependencias, V8 puede insertar (inline) la llamada directa al constructor. Con diez dependencias, InferDI recurre a `Reflect.construct` y aún así lidera frente a las referencias listadas.
- El ciclo de vida con scope incluye la creación del scope, la resolución y la limpieza. El escenario 6 incluye trabajo de liberación en cada iteración, por lo que mide la propiedad del scope en lugar de solo la resolución.
- Typed Inject es la referencia no-InferDI más cercana. Su grafo conocido en tiempo de compilación lo mantiene competitivo en grafos profundos y flujos con scope.

## Modo rápido

`new Container({ strict: false })` elimina la contabilidad de ciclos en runtime, el seguimiento de la pila de singletons y el `try`/`finally` alrededor de la ruta de resolución protegida. El README del paquete reporta resoluciones transitorias locales aproximadamente un 30 % más rápidas en un grafo transitorio plano. Las resoluciones de singleton y scoped cacheados no cambian, porque retornan antes de que se ejecuten esas comprobaciones.

Usa el modo rápido solo después de que las pruebas hayan ejercitado el grafo en el modo estricto por defecto. TypeScript no puede ver ciclos de singletons, ciclos transitorios, claves dinámicas, casts `as` ni factorías que capturen (close over) un contenedor externo más amplio.

## Pequeños detalles de la ruta caliente

Las claves de tipo símbolo pueden ayudar en bucles de resolución muy ajustados porque `Map` las compara por identidad. Las claves de tipo cadena necesitan hashing y, en caso de colisión, comparación de caracteres. La mayoría de las aplicaciones no medirán ninguna diferencia, así que trata las claves de tipo símbolo como un cambio guiado por el profiler.

## Reproducir localmente

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run precondition
pnpm run bench
```

El workspace de benchmarks está intencionadamente aislado del workspace raíz de pnpm y tiene su propio lockfile. Consulta [benchmarks/README.md](https://github.com/inferdi/inferdi/blob/main/benchmarks/README.md) para la metodología, las notas sobre imparcialidad y las fuentes de los fixtures.
