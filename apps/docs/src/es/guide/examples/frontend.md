# Frameworks de frontend

Los ejemplos de frontend crean scopes en los límites de página, ruta, pantalla o funcionalidad. Mantienen sus propios constructores pequeños en lugar de importar el módulo compartido del lado del servidor.

Compara dónde crea el scope cada framework, cómo se proporciona el scope a los hijos y cómo se ejecuta la limpieza al desmontar.

| Ejemplo | Muestra |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | Scope de funcionalidad en React con `useState` perezoso y limpieza |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | Scope de pantalla en React Native |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Límite de scope con provide/inject en Vue 3 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Límite de scope con context en Svelte |

## React

<<< ../../../../../../examples/frontend/react.tsx

Archivo del repositorio: [`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

Archivo del repositorio: [`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

Archivo del repositorio: [`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

Archivo del repositorio: [`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
