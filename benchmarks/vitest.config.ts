import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

export default defineConfig({
  // CRITICAL: vitest 4.x uses oxc by default (not esbuild). We disable both so the swc plugin
  // can transform .ts files with decorator-metadata emission. Otherwise oxc/esbuild would
  // strip the decorators BEFORE swc sees them.
  esbuild: false,
  oxc: false,
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
      module: { type: 'es6' },
    }),
  ],
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['src/benches/**/*.bench.ts', 'src/precondition/**/*.test.ts'],
    exclude: ['**/node_modules/**', '../**'],
    benchmark: {
      pool: 'forks',
      isolate: true,

      include: ['src/benches/**/*.bench.ts'],
      reporters: ['default'],
    },
  },
  resolve: {
    alias: {
      '@inferdi/inferdi': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
})
