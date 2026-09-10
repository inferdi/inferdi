# Inicio rápido

Empieza con dos clases normales y una cadena de composición explícita. Los scopes de petición llegan después, cuando el grafo básico ya está claro.

## Instalación

::: code-group

```bash [pnpm]
pnpm add @inferdi/inferdi
```

```bash [npm]
npm install @inferdi/inferdi
```

```bash [yarn]
yarn add @inferdi/inferdi
```

:::

## Construir el grafo

<<< ../../../snippets/quick-start-sync.ts

`UserService` no importa InferDI. El código de composición elige `Logger`, da nombre a ambos registros y fija el orden del constructor. El tipo devuelto para `root` ya contiene los dos servicios.

Si cambias el constructor y olvidas actualizar el grafo, el error aparece donde ensamblas la aplicación:

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class Logger {
  info(message: string) {}
}

class UserService {
  constructor(readonly logger: Logger, readonly region: string) {}
}

new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger']) // [!code error]
```

Así funciona el estado de tipo del grafo: cada registro refina el tipo del contenedor y las operaciones posteriores deben encajar con lo ya declarado.

## Resolver servicios

`root.get('users')` devuelve `UserService` de forma síncrona. El tiempo de vida predeterminado es `singleton`, así que las llamadas posteriores reciben la instancia en caché.

Los datos de petición necesitan un límite más corto. Decláralos como entrada de scope y entrégalos al abrir un scope hijo:

<<< ../../../snippets/quick-start-scope.ts

El bloque `finally` cierra el hijo aunque falle el trabajo de la petición. `scope.dispose()` libera el `RequestLog` propiedad del scope; el valor `request` sigue siendo propiedad de la aplicación. Si tu toolchain de TypeScript admite Explicit Resource Management, puedes expresar el mismo cleanup con `await using`.

## Elegir tiempos de vida

| Tiempo de vida | Política de instancia | Dueño de la caché | Dueño del cleanup |
|---|---|---|---|
| `singleton` | una por dueño del registro | root o dueño del registro | ese contenedor |
| `scoped` | una por scope que resuelve | scope hijo | ese scope |
| `transient` | una por resolución | ninguno | llamador |

Los valores entregados mediante `registerValue`, `.override()` o entradas de scope también pertenecen a la aplicación. Un singleton no puede depender directamente de un servicio con scope o transitorio; InferDI rechaza la relación en los tipos y la comprueba otra vez en el contrato de runtime predeterminado.

## El siguiente paso {#siguiente-paso}

[Por qué InferDI](./why-inferdi) explica las decisiones de diseño y [Seguridad de tipos](../core/type-safety) cubre todas las comprobaciones del grafo. [Scopes y liberación](../core/scopes) detalla la propiedad; [Adaptadores](../adapters/) conecta los scopes con el ciclo de vida de la aplicación.
