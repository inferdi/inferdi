# 前端框架

前端示例在页面、路由、屏幕或功能边界处创建作用域。它们各自保留小型的构建器，而不是导入服务端的共享模块。

请对比每个框架在何处创建作用域、如何将作用域提供给子组件，以及在卸载时如何执行清理。

| 示例 | 展示内容 |
| --- | --- |
| [`react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx) | React 功能作用域，配合惰性 `useState` 与清理 |
| [`react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx) | React Native 屏幕作用域 |
| [`vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts) | Vue 3 provide/inject 作用域边界 |
| [`svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts) | Svelte context 作用域边界 |

## React

<<< ../../../../../../examples/frontend/react.tsx

仓库文件：[`examples/frontend/react.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react.tsx)

## React Native

<<< ../../../../../../examples/frontend/react-native.tsx

仓库文件：[`examples/frontend/react-native.tsx`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/react-native.tsx)

## Vue

<<< ../../../../../../examples/frontend/vue.ts

仓库文件：[`examples/frontend/vue.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/vue.ts)

## Svelte

<<< ../../../../../../examples/frontend/svelte.ts

仓库文件：[`examples/frontend/svelte.ts`](https://github.com/inferdi/inferdi/blob/main/examples/frontend/svelte.ts)
