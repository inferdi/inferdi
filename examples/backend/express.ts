import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer,
} from '../_shared/container.js'

const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      container: RequestContainer
    }
  }
}

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function withContainer(req: Request, res: Response, next: NextFunction) {
  void (async () => {
    const scope = await createRequestScope(root, {
      requestId: crypto.randomUUID(),
      // req.ip is `string | undefined` in @types/express — propagate that shape.
      ip: req.ip,
      userId: normalizeHeader(req.headers['x-user-id']),
    })

    let disposed = false
    const cleanup = () => {
      if (disposed) return
      disposed = true
      scope.dispose().catch((err) => {
        // Async cleanup runs after res.once('finish'/'close') has already returned,
        // so there is no handler to surface the rejection to — log it explicitly.
        console.error('Failed to dispose request scope', err)
      })
    }

    req.container = scope
    res.once('finish', cleanup)
    res.once('close', cleanup)
    next()
  })().catch(next)
}

export const app = express()

app.use(withContainer)

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.container.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
