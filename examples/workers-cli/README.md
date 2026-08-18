# Bots, Queues, and CLI

These adapters share the [`../_shared/container.ts`](../_shared/container.ts) builder. Bot updates, queue jobs, and CLI invocations are all "request-shaped" — one bounded unit of work — so they reuse the same `RequestContext`/`UserService`/`AuditService` graph the HTTP examples use.

Create one scope per bot update, queue job, or CLI command invocation. These are bounded async functions, so `await using` is the right tool: disposal lands exactly at function exit, both on success and throw.

Dispose the root after the worker or bot stops, or after the CLI parser finishes. The Commander and Yargs examples wrap parsing in `run()` functions, while BullMQ exposes `closeWorker()`. Operation scopes do not dispose root-owned singletons.

Do not use `override()` outside tests. The production pattern is `createRequestScope(root, {...})`.
