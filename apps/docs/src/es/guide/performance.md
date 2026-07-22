---
schema:
  "@context": "https://schema.org"
  "@graph":
    - "@type": "BreadcrumbList"
      "@id": "https://inferdi.com/es/guide/performance#breadcrumb"
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
          "name": "Rendimiento"
          "item": "https://inferdi.com/es/guide/performance"
    - "@type": "TechArticle"
      "@id": "https://inferdi.com/es/guide/performance#article"
      "headline": "Rendimiento de InferDI: una resolución caliente usa un Map.get()"
      "name": "Rendimiento"
      "description": "InferDI usa registros explícitos, servicios singleton y scoped en caché, llamadas directas al constructor para 0-7 dependencias y fábricas asíncronas con Promesas en caché."
      "url": "https://inferdi.com/es/guide/performance"
      "mainEntityOfPage": "https://inferdi.com/es/guide/performance"
      "inLanguage": "es-ES"
      "datePublished": "2026-06-12"
      "dateModified": "2026-07-21"
      "dependencies": "TypeScript >=5.2, Node.js >=16"
      "proficiencyLevel": "Expert"
      "keywords": "InferDI, rendimiento, benchmark, cero sobrecarga, ruta caliente, inyección de dependencias, V8, Map.get"
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

| Escenario | InferDI | InversifyJS | Typed Inject | Awilix (PROXY) | Awilix (CLASSIC) | TSyringe | TypeDI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **1. Resolución de singleton en caliente** (caché caliente) | **14.3 M** | 10.7 M | 7.0 M | 7.3 M | 6.7 M | 5.8 M | 6.45 M |
| **2. Resolución transitoria** (nueva instancia por llamada) | **9.75 M** | 6.1 M | 4.1 M | 3.45 M | 3.0 M | 2.5 M | 1.6 M |
| **3. Grafo profundo** (10 niveles, todo transitorio) | **2.3 M** | 1.5 M | 1.3 M | 716 k | 736 k | 643 k | 222 k |
| **4a. Grafo ancho** (4 deps, raíz transitoria) | **8.25 M** | 4.9 M | 3.4 M | 2.2 M | 2.3 M | 1.65 M | 1.1 M |
| **4b. Grafo ancho** (10 deps, raíz transitoria) | **3.5 M** | 1.9 M | 2.6 M | 1.2 M | 1.3 M | 938 k | 458 k |
| **5. Construcción del contenedor + primera resolución** | **400 k** | 13.2 k | 223 k | 10 k | 8.3 k | 206 k | 282 k |
| **6. Ciclo de vida con scope** (crear + resolver + limpiar) | **2.85 M** | 35 k | 2.45 M | 330 k | 430 k | 1.1 M | 665 k |
| **7. Resolución perezosa** (envoltorio diferido) | **11.8 M** | 7.6 M | 7.15 M | 5.6 M | 4.7 M | 4.25 M | 2.85 M |

## Qué muestran las cifras

- La resolución de singleton cacheado es 1,34 veces más rápida que la referencia más cercana, InversifyJS.
- La construcción del contenedor más la primera resolución favorece el registro plano. InferDI registra el grafo desde cero; las bibliotecas basadas en decoradores ya han pagado parte de su trabajo de registro durante la evaluación del módulo.
- Los escenarios de grafo ancho muestran por qué importa el desenrollado de aridad. Con cuatro dependencias, InferDI supera a la referencia más cercana en 1,68 veces. Con diez dependencias, recurre a `Reflect.construct` y sigue siendo 1,35 veces más rápido que Typed Inject.
- El ciclo de vida con scope incluye la creación del scope, la resolución y la limpieza. El escenario 6 incluye trabajo de liberación en cada iteración, por lo que mide la propiedad del scope en lugar de solo la resolución.
- InferDI lidera los 8 escenarios. Typed Inject sigue siendo la referencia no-InferDI más cercana en los flujos con scope y en el grafo ancho de diez dependencias; InversifyJS lo es en las resoluciones singleton cacheadas, transitorias, de grafo profundo y de grafo ancho con cuatro dependencias.

## Modo rápido

`new Container({ strict: false })` elimina la contabilidad de ciclos en runtime, el seguimiento de la pila de singletons y el `try`/`finally` alrededor de la ruta de resolución protegida. El README del paquete reporta resoluciones transitorias locales aproximadamente un 30 % más rápidas en un grafo transitorio plano. Las resoluciones de singleton y scoped cacheados no cambian, porque retornan antes de que se ejecuten esas comprobaciones.

Usa el modo rápido solo después de que las pruebas hayan ejercitado el grafo en el modo estricto por defecto. TypeScript no puede ver ciclos de singletons, ciclos transitorios, claves dinámicas, casts `as` ni factorías que capturen (close over) un contenedor externo más amplio.

Para una ruta de producción transitoria e intensiva que ya ha sido perfilada, `{ strict: false }` ofrece la configuración compatible más rápida tras esa verificación. Conserva el modo estricto durante el desarrollo y las pruebas. No mejora las resoluciones cacheadas de singleton ni scoped.

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
