import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    execArgv: ['--expose-gc'],
    coverage: {
      provider: 'v8',
      include: ['src/Container.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    typecheck: {
      enabled: false,
      include: ['__tests__/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
})
