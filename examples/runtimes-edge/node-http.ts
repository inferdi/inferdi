import { createServer, type ServerResponse } from 'node:http'

import {
  buildRootContainer,
  createRequestScope
} from '../_shared/container.js'

const root = buildRootContainer()

function attachCleanup(res: ServerResponse, cleanup: () => void) {
  /*
   * 'finish' fires on normal completion, 'close' on client-side abort.
   * `dispose()` is idempotent — guarding once with a flag avoids issuing
   * two parallel disposal walks if both fire in quick succession
   */
  let done = false
  const once = () => {
    if (done) return
    done = true
    cleanup()
  }
  res.once('finish', once)
  res.once('close', once)
}

export const server = createServer((req, res) => {
  void (async () => {
    const scope = await createRequestScope(root, {
      requestId: req.headers['x-request-id'] as string | undefined ?? crypto.randomUUID()
    })

    attachCleanup(res, () => {
      scope.dispose().catch((err) => {
        console.error('Failed to dispose request scope', err)
      })
    })

    try {
      const body = await scope.get('users').profile('me')
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    } catch (error) {
      console.error(error)
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  })().catch((error) => {
    console.error(error)
    if (!res.headersSent) {
      res.writeHead(500)
    }
    res.end('Internal Server Error')
  })
})
