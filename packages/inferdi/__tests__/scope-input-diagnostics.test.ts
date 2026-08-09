import ts from 'typescript'
import {describe, expect, it} from 'vitest'

describe('scope-input diagnostics', () => {
  it('includes stable named diagnostic properties', () => {
    const fixture = `${process.cwd()}/__tests__/scope-input-diagnostics.fixture.ts`
    const source = `
      import {Container} from '../src/Container'

      const root = new Container()
        .declareScopeInputs<{request: {id: string}}>()

      new Container().declareScopeInputs<{request?: {id: string}}>()
      root.declareScopeInputs<{request: {id: string}}>()
      root.createScope({unknown: true})
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
    const messages = ts.getPreEmitDiagnostics(program).map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    )

    expect(messages.some((message) =>
      message.includes('Invalid scope input declaration')
    )).toBe(true)
    expect(messages.some((message) =>
      message.includes('Scope input key already exists')
    )).toBe(true)
    expect(messages.join('\n---\n')).toContain('Invalid scope input keys')
  })
})
