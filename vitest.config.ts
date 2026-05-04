import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    // memory.test.ts требует --expose-gc для WeakRef-проверок (через waitForGC).
    // Без флага describe.skipIf(!hasGc) скипает весь блок и теряем покрытие
    // соответствующих веток (resigns of regs/cache/owned, освобождение _cradle и parent).
    // В Vitest 4 execArgv стал top-level (раньше был в poolOptions.forks/threads).
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
      // Включаем только через `npm run test:types` — иначе обычный `vitest run`
      // тратит ~3-5s на полный type-pass, что замедляет watch-режим.
      enabled: false,
      include: ['__tests__/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
})
