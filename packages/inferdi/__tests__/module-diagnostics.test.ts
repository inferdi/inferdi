import ts from 'typescript'
import {describe, expect, it} from 'vitest'

const modules = {
  direct: `
      const module: Module<Requirements, Provides> = (container) =>
        container.registerValue('service', {run() {}})`,
  aliased: `
      type ServiceModule = Module<Requirements, Provides>
      const module: ServiceModule = (container) =>
        container.registerValue('service', {run() {}})`,
  inferred: `
      const module = (container: Container<Requirements>) =>
        container.registerValue('service', {run() {}})`
}

function diagnose(declarations: string) {
  const fixture = `${process.cwd()}/__tests__/module-diagnostics.fixture.ts`
  const source = `
      import {Container, type Module, type Spec} from '../src/Container'

      type Requirements = {config: Spec<{env: string}>}
      type Provides = {service: Spec<{run(): void}>}
      ${declarations}
    `
  const options = {
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.esnext.disposable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    noErrorTruncation: true,
    skipLibCheck: true
  } satisfies ts.CompilerOptions
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)

  host.fileExists = (fileName) => fileName === fixture || fileExists(fileName)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === fixture
      ? ts.createSourceFile(fileName, source, languageVersion, true)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)

  const program = ts.createProgram([fixture], options, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)

  expect(diagnostics.every((diagnostic) => diagnostic.file?.fileName === fixture)).toBe(true)

  return diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  )
}

describe('module diagnostics', () => {
  it.each(Object.entries(modules))('includes stable requirement and collision properties for %s modules', (_, declaration) => {
    const messages = diagnose(`
      ${declaration}

      new Container().use(module)
      new Container()
        .registerFactory('config', () => ({env: 'test'}), 'transient')
        .use(module)
      new Container()
        .registerValue('config', {env: 'test'})
        .registerValue('service', {run() {}})
        .use(module)
    `)

    expect(messages).toEqual([
      expect.stringContaining('Missing module requirements'),
      expect.stringContaining('Incompatible module requirements'),
      expect.stringContaining('Module output keys collide with the container graph')
    ])
  })

  it('checks every module in a union, every returned graph and every branch', () => {
    const messages = diagnose(`
      const dropping = (_container: Container<Requirements>) =>
        new Container().registerValue('service', {run() {}})
      const first = (container: Container<Requirements>) =>
        container.registerValue('service', {run() {}})
      const second = (container: Container<{other: Spec<string>}>) =>
        container.registerValue('service', {run() {}})
      const branching = (container: Container<Requirements>) =>
        container.get('config').env === 'test'
          ? container.registerValue('service', {run() {}}).registerValue('fixture', true)
          : container.registerValue('service', {run() {}})
      const base = new Container().registerValue('config', {env: 'test'})

      base.use(dropping)
      base.use(Math.random() > 0.5 ? first : second)
      base.registerValue('fixture', false).use(branching)
    `)

    expect(messages).toEqual([
      expect.stringContaining('Module result drops requirements'),
      expect.stringContaining('Missing module requirements'),
      expect.stringContaining('Module output keys collide with the container graph')
    ])
  })
})
