import express from 'express'
import { inferdiExpress } from '@inferdi/express'

import {
  buildRootContainer,
  createRequestScope,
  type RequestContainer
} from '../_shared/container.js'

const root = buildRootContainer()

declare global {
  namespace Express {
    interface Request {
      di: RequestContainer
    }
  }
}

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export const app = express()

app.use(inferdiExpress({
  container: root,
  createScope: (root, req) =>
    createRequestScope(root, {
      requestId: crypto.randomUUID(),
      // req.ip is `string | undefined` in @types/express — propagate that shape
      ip: req.ip,
      userId: normalizeHeader(req.headers['x-user-id'])
    })
}))

app.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await req.di.get('users').profile(req.params.id))
  } catch (error) {
    next(error)
  }
})
