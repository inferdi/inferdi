import { Command } from 'commander'

import { buildRootContainer } from '../_shared/container.js'

const root = buildRootContainer()

export const program = new Command()

program
  .command('import-users <file>')
  .option('--dry-run')
  .action(async (file: string, options: { dryRun?: boolean }) => {
    /*
     * A CLI invocation is a bounded async unit: `await using` ties scope
     * disposal to the action function's exit (success or throw), so the
     * async `Database` factory in the shared root is closed before the
     * process exits
     */
    await using scope = root.createScope()
    const ctx = scope.get('request')
    ctx.requestId = `cli:import-users:${Date.now()}`

    scope.get('audit').record('cli.import-users.start', {
      file,
      dryRun: options.dryRun === true
    })

    /*
     * Real implementation would stream `file` through scope.get('users')
     * and write to scope.get('db'). The minimal demo just logs
     */
    scope.get('audit').record('cli.import-users.done', { file })
  })
