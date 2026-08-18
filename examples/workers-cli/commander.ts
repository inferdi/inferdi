import { Command } from 'commander'

import { buildRootContainer } from '../_shared/container.js'

const root = buildRootContainer()

export const program = new Command()

program
  .command('import-users <file>')
  .option('--dry-run')
  .action(async (file: string, options: { dryRun?: boolean }) => {
    /* A command invocation owns one operation scope */
    await using scope = root.createScope({
      request: { requestId: `cli:import-users:${Date.now()}` }
    })

    scope.get('audit').record('cli.import-users.start', {
      file,
      dryRun: options.dryRun === true
    })

    /*
     * Real implementation would resolve `users` with `getAsync()` and stream
     * records from `file`. The minimal demo logs the operation lifecycle
     */
    scope.get('audit').record('cli.import-users.done', { file })
  })

export async function run(argv: string[] = process.argv) {
  try {
    await program.parseAsync(argv)
  } finally {
    await root.dispose()
  }
}
