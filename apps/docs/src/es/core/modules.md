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

Para módulos reutilizables de forma fija, usa el tipo exportado `Module<TIn, TOut>`.

```ts
import {
  Container,
  type Module,
  type SpecMap,
} from '@inferdi/inferdi'

type Base = SpecMap<{ config: { env: string } }>
type Added = SpecMap<{ mailer: Mailer }>

const addMailer: Module<Base, Added> = (c) => {
  const { env } = c.get('config')
  return env === 'test'
    ? c.registerClass('mailer', MockMailer, [])
    : c.registerClass('mailer', RealMailer, [])
}
```

Las funciones de módulo genéricas como `<T>(c: Container<T>) => ...` no pueden expresar la unicidad de claves dentro del cuerpo. Usa lambdas en línea o declaraciones de forma fija `Module<TIn, TOut>`.

## Comprobaciones dinámicas

`.has(key)` es un type guard para claves dinámicas:

```ts
declare const key: string | symbol

if (container.has(key)) {
  container.get(key)
}
```

`.has()` nunca resuelve el valor y devuelve `false` en contenedores liberados.
