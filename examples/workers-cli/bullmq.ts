import { Worker, type Job } from 'bullmq'

import {
  buildRootContainer,
  createRequestScope,
} from '../_shared/container.js'

const root = buildRootContainer()

export const worker = new Worker('email', async (job: Job<{ to: string }>) => {
  // Reuse the same per-request shape for jobs: jobId → requestId, payload
  // recipient → userId so AuditService records pick up the right user.
  await using scope = await createRequestScope(root, {
    requestId: job.id ?? `job:${job.name}`,
    userId: job.data.to,
  })

  scope.get('audit').record('email.sent', { name: job.name, to: job.data.to })
  // Real implementation would call scope.get('mailer').send(job.data).
})
