# Raíz de composición

La raíz de composición es el límite donde la aplicación elige y conecta implementaciones concretas. El dominio declara lo que necesita, infraestructura aporta una implementación e InferDI solo aparece en el código de ensamblado.

## Contrato de dominio

El dominio posee la interfaz porque el caso de uso depende de ella. Este archivo no importa el contenedor ni el framework.

::: code-group

<<< ../../../snippets/composition/domain.ts [domain.ts]

:::

## Implementación de infraestructura

Infraestructura implementa el contrato del dominio. Un adaptador real usaría un cliente de base de datos; el ejemplo pequeño deja visible la llamada.

::: code-group

<<< ../../../snippets/composition/infrastructure.ts [infrastructure.ts]

:::

## Composición de la aplicación

Solo este archivo importa InferDI. Elige `PostgresUserStore`, le entrega el DSN y lo conecta con `GetGreeting`.

::: code-group

<<< ../../../snippets/composition/container.ts [container.ts]

:::

La tupla de cada registro se comprueba contra su constructor. Al cambiar `GetGreeting` o `PostgresUserStore`, el cableado obsoleto falla en este límite.

## Usar el servicio en el límite

Una ruta HTTP, un comando CLI o un consumidor de cola resuelve el servicio superior. La operación de negocio sigue usando un método normal.

::: code-group

<<< ../../../snippets/composition/entry.ts [entry.ts]

:::

Abre aquí un scope hijo cuando la operación necesite entradas de una petición o trabajo. Libéralo en el mismo límite o deja que un adaptador lo ate al ciclo de vida del framework.

## Probar el dominio directamente

La prueba unitaria no construye un contenedor. Pasa un `UserStore` falso a la misma clase `GetGreeting` utilizada en producción.

::: code-group

<<< ../../../snippets/composition/domain.test.ts [domain.test.ts]

:::

Usa `.override()` en pruebas de integración que ejecuten el grafo real con una implementación sustituida. Para un solo servicio de dominio, la construcción directa suele ser más clara. Continúa con [Pruebas y overrides](../core/testing).
