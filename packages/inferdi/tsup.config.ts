import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: {
    banner: '/// <reference lib="esnext.disposable" />'
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'node16',
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  }
})
