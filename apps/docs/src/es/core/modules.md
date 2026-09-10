# Módulos

Usa `.use()` para dividir un constructor de contenedor grande en piezas más pequeñas, manteniendo la inferencia de tipos a lo largo de la cadena fluida.

```ts
const appContainer = new Container()
  .registerValue('config', { env: 'production' as 'production' | 'test' })
  .use((c) => c.registerClass('db', Database, []))
  .use((c) => {
    const { env } = c.get('config')
    return env === 'test'
      ? c.registerClass('mailer', MockMailer, [])
      : c.registerClass('mailer', RealMailer, [])
  })
```

Las lambdas en línea son la forma más ergonómica. El tipo de contenedor de la lambda se infiere del lugar de la llamada, incluidas las claves registradas antes en la cadena.

## Módulos con nombre

Los módulos con nombre declaran solo sus requisitos y resultados con `Module<TRequirements, TProvides>`. El grafo real puede contener registros adicionales, que se conservan en el resultado.

```ts
import {
  Container,
  type Module,
  type SpecMap
} from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Requirements, Provides> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}

const app = new Container()
  .registerValue('config', { env: 'test' })
  .registerValue('metrics', new Metrics())
  .use(addMailer) // keeps config + metrics and adds mailer
```

El callback solo ve `Container<TRequirements>`. Los requisitos se comprueban por tipo de servicio, lifetime exacto, modo sync/async, modo managed-lazy y disponibilidad de scope inputs. Los outputs no pueden colisionar con ninguna clave del grafo real; requisitos ausentes, incompatibles y colisiones tienen diagnósticos con nombre.

## Importaciones dinámicas

Usa `import()` cuando un módulo opcional o específico de una ruta deba cargarse como un chunk de JavaScript separado.

```ts
const { reportsModule } = await import('./reports.module')
const container = new Container().use(reportsModule)
```

El runtime carga y evalúa `reports.module` antes de ejecutar `.use()`. Después, `.use()` ejecuta el módulo de forma síncrona, añade sus registros y devuelve el contenedor con el tipo inferido. Una importación dinámica no convierte esos servicios en asíncronos; usa `registerAsyncFactory` cuando la inicialización del propio servicio sea asíncrona.

En el navegador, usa este patrón en el límite de una ruta o funcionalidad, y solo si el bundler genera un chunk separado que ningún otro código importa de forma estática. Construye el contenedor de la funcionalidad después de cargar ese chunk. En un backend, prefiere importaciones estáticas durante un inicio normal. Una importación dinámica resulta útil para funcionalidades opcionales elegidas por la configuración del despliegue o para rutas serverless sensibles al cold start, donde el código y las dependencias sin usar deben permanecer sin cargar. En ambos runtimes, monta el contenedor antes de la primera resolución o de llamar a `createScope()`; no modifiques el contenedor de la aplicación en cada petición.

Si la clave se selecciona en runtime, usa el [type guard `.has()`](./type-safety#claves-dinámicas) antes de resolverla.

## Comprobación del compilador

Un módulo con nombre no se puede instalar hasta que el grafo contenga sus requisitos declarados:

```ts twoslash
// @errors: 2345
import { Container, type Module, type SpecMap } from '@inferdi/inferdi'

type Requirements = SpecMap<{ config: { env: string } }>
type Provides = SpecMap<{ feature: string }>

const addFeature: Module<Requirements, Provides> = (container) =>
  container.registerFactory('feature', (c) => c.get('config').env, ['config'])

new Container().use(addFeature) // [!code error]

const app = new Container()
  .registerValue('config', { env: 'test' })
  .use(addFeature)

const feature = app.get('feature')
//    ^?
```
