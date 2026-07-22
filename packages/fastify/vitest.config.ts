import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/index.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    },
    typecheck: {
      enabled: false,
      include: ['__tests__/**/*.test-d.ts'],
      tsconfig: './tsconfig.test.json',
      /*
       * The base tsconfig scopes the program to `src` (rootDir/include), so the
       * type tests in `__tests__` were never actually checked. `tsconfig.test.json`
       * widens the program to the test files. `ignoreSourceErrors` drops the
       * spurious `src/index.ts` diagnostics that the test files' global
       * `declare module 'fastify'` augmentation induces (the source build is
       * already covered by the `typecheck` script against the base tsconfig)
       */
      ignoreSourceErrors: true
    }
  }
})
