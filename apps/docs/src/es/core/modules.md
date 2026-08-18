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

Si la clave se selecciona en runtime, usa el [type guard `.has()`](./type-safety#claves-dinámicas) antes de resolverla.
