import ts from 'typescript'
import {describe, expect, it} from 'vitest'

describe('module diagnostics', () => {
  it('includes stable requirement and collision properties', () => {
    const fixture = `${process.cwd()}/__tests__/module-diagnostics.fixture.ts`
    const source = `
      import {Container, type Module, type Spec} from '../src/Container'

      type Requirements = {config: Spec<{env: string}>}
      type Provides = {service: Spec<{run(): void}>}
      const module: Module<Requirements, Provides> = (container) =>
        container.registerValue('service', {run() {}})

      new Container().use(module)
      new Container()
        .registerFactory('config', () => ({env: 'test'}), 'transient')
        .use(module)
      new Container()
        .registerValue('config', {env: 'test'})
        .registerValue('service', {run() {}})
        .use(module)
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
    const messages = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    ).join('\n---\n')

    expect(diagnostics).toHaveLength(3)
    expect(diagnostics.every((diagnostic) => diagnostic.file?.fileName === fixture)).toBe(true)
    expect(messages).toContain('Missing module requirements')
    expect(messages).toContain('Incompatible module requirements')
    expect(messages).toContain('Module output keys collide with the container graph')
  })
})
