import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { buildRootContainer } from '../_shared/container.js'

const root = buildRootContainer()

export const cli = yargs(hideBin(process.argv))
  .command(
    'sync <target>',
    'Sync a target',
    (builder) =>
      builder
        .positional('target', { type: 'string', demandOption: true })
        .option('verbose', { type: 'boolean', default: false }),
    async (argv) => {
      /*
       * Each CLI invocation owns a fresh scope; `await using` disposes the
       * shared `Database` factory deterministically before the action
       * resolves (and therefore before the Node process exits)
       */
      await using scope = root.createScope()
      scope.get('request').requestId = `cli:sync:${Date.now()}`

      scope.get('audit').record('cli.sync', {
        target: argv.target,
        verbose: argv.verbose
      })
    }
  )
  .strict()
