import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    exclude: ['**/benchmarks/**'],
    benchmark: {
      include: ['__tests__/**/*.bench.ts'],
      exclude: ['**/benchmarks/**']
    },
    execArgv: ['--expose-gc'],
    coverage: {
      provider: 'v8',
      include: ['src/Container.ts'],
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
       * The base tsconfig scopes the program to `src`, so the type tests in
       * `__tests__` were never actually checked. `tsconfig.test.json` widens the
       * program to the test files; `ignoreSourceErrors` drops `src` diagnostics
       * (already covered by the `typecheck` script) so a test file's global
       * module augmentation cannot fail the run
       */
      ignoreSourceErrors: true
    }
  }
})
