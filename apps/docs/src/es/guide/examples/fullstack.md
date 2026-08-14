# Frameworks full-stack

Los ejemplos full-stack usan scopes para loaders, actions, manejadores de rutas y server actions. Las builds de desarrollo cachean la raíz en `globalThis` para evitar clientes duplicados durante el HMR.

Ambos ejemplos comparten [`examples/_shared/container.ts`](https://github.com/inferdi/inferdi/blob/main/examples/_shared/container.ts). Compara el límite de operación que espera cada framework.

| Ejemplo | Muestra |
| --- | --- |
| [`next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts) | Límites de scope de petición y de Server Action en el App Router de Next.js |
| [`remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts) | Límites de scope de loader y action en Remix |

## Next.js App Router

<<< ../../../../../../examples/fullstack/next-app-router.ts

Archivo del repositorio: [`examples/fullstack/next-app-router.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/next-app-router.ts)

## Remix

<<< ../../../../../../examples/fullstack/remix.ts

Archivo del repositorio: [`examples/fullstack/remix.ts`](https://github.com/inferdi/inferdi/blob/main/examples/fullstack/remix.ts)
