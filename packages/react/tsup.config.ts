import {defineConfig} from 'tsup'

export default defineConfig({
  entry: {index: 'src/index.ts'},
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: false,
  target: 'node16',
  external: ['react', '@inferdi/inferdi'],
  outExtension({format}) {
    return {js: format === 'cjs' ? '.cjs' : '.js'}
  }
})
