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
      /* Each command invocation owns one operation scope */
      await using scope = root.createScope({
        request: { requestId: `cli:sync:${Date.now()}` }
      })

      scope.get('audit').record('cli.sync', {
        target: argv.target,
        verbose: argv.verbose
      })
    }
  )
  .strict()

export async function run() {
  try {
    await cli.parseAsync()
  } finally {
    await root.dispose()
  }
}
