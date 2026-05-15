// Reusable container builder for the framework adapters in examples/.
// Designed to be imported from backend/, api-layers/, fullstack/, runtimes-edge/,
// and workers-cli/ examples so each adapter shows ONLY the framework wiring
// — not yet another minimal copy of `class Logger { info() {} }`.
//
// This module demonstrates the InferDI features that matter in production:
//
//   1. registerValue('config', ...)  — static config (env-validated).
//   2. registerFactory('db', async ...) — async resource with LIFO disposal
//      via Symbol.asyncDispose. `await scope.dispose()` awaits the pool.
//   3. registerClass with a `Lazy<V>` companion — a singleton can take a
//      Lazy<transient> per the compile-time lifetime guard; injecting the
//      bare transient would be a TYPE error (see `// @ts-expect-error` below).
//   4. Module<TIn, TOut> — reusable registration unit composed via `.use()`.
//   5. createScope() + hydrate `scope.get('request')` — the recommended way
//      to thread per-request data through scoped services.
//   6. Container.Providers<...> — typed shape for mock-factory test fixtures.
//
// All adapters in this directory consume this builder; in your own project
// the same shape lives in `src/container.ts` and frameworks adapt to it.

import {
  Container,
  type Lazy,
  type Module,
  type Spec,
  type SpecMap,
} from '@inferdi/inferdi'

// ---------------------------------------------------------------------------
// 1. Config — env validated once at boot.
// ---------------------------------------------------------------------------

export type AppConfig = {
  readonly databaseUrl: string
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export function readConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const databaseUrl = env.DATABASE_URL ?? 'postgres://localhost/app'
  const raw = env.LOG_LEVEL ?? 'info'
  if (raw !== 'debug' && raw !== 'info' && raw !== 'warn' && raw !== 'error') {
    throw new Error(`Invalid LOG_LEVEL: ${raw}`)
  }
  return { databaseUrl, logLevel: raw }
}

// ---------------------------------------------------------------------------
// 2. Domain types — kept intentionally small so the focus stays on wiring.
//    `Database` implements Symbol.asyncDispose, so `await container.dispose()`
//    closes the pool. LIFO order across multiple owned instances is preserved.
// ---------------------------------------------------------------------------

export class Logger {
  constructor(private readonly config: AppConfig) {}

  private readonly rank = { debug: 0, info: 1, warn: 2, error: 3 } as const

  info(message: string, meta?: Record<string, unknown>) {
    if (this.rank[this.config.logLevel] > this.rank.info) return
    console.info(message, meta)
  }
  error(message: string, meta?: Record<string, unknown>) {
    console.error(message, meta)
  }
}

export class Database {
  // A real implementation would hold a `pg.Pool` here.
  constructor(private readonly config: AppConfig) {}

  async query<T>(_sql: string, _params: readonly unknown[] = []): Promise<readonly T[]> {
    return []
  }

  async [Symbol.asyncDispose]() {
    // await this.pool.end() — InferDI awaits this during scope/root disposal.
  }
}

// Per-call clock. Registered as `transient` because a singleton service that
// caches the very first `new Date()` is almost always a bug.
export class Clock {
  now(): Date { return new Date() }
}

// Per-request data. Hydrated immediately after `createScope()`. Registered
// as `scoped` so every request gets its own instance, and so child services
// can take it as a constructor dependency.
export class RequestContext {
  requestId = ''
  userId: string | undefined = undefined
  ip: string | undefined = undefined
}

// A long-lived service that needs a fresh `Date` on every call.
// `Clock` is transient → injecting it directly into a singleton is a TYPE
// error (see compile-time guard demo at the bottom of this file). The
// sanctioned escape is `Lazy<Clock>`: the wrapper is transient and safe
// to inject into a singleton, and `.get()` resolves a fresh Clock per call.
export class AuditService {
  constructor(
    private readonly logger: Logger,
    private readonly clockLazy: Lazy<Clock>,
  ) {}

  record(event: string, meta: Record<string, unknown> = {}) {
    this.logger.info(event, { at: this.clockLazy.get().now().toISOString(), ...meta })
  }
}

// Per-request service: takes request-scoped + singleton deps.
export class UserService {
  constructor(
    private readonly request: RequestContext,
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async profile(id: string) {
    this.audit.record('user.profile.read', { requestId: this.request.requestId })
    const rows = await this.db.query<{ id: string; name: string }>(
      'select id, name from users where id = $1',
      [id],
    )
    return rows[0] ?? { id, name: 'Unknown' }
  }
}

// ---------------------------------------------------------------------------
// 3. Module — group platform services so any adapter can `.use(coreModule)`.
//    The `Module<TIn, TOut>` signature documents what the module needs (TIn)
//    and what it adds (TOut), and the compiler enforces both.
// ---------------------------------------------------------------------------

type CoreIn = SpecMap<{ config: AppConfig }>
type CoreOut =
  & SpecMap<{ logger: Logger; db: Database; audit: AuditService }>
  & {
      clock: Spec<Clock, 'transient'>
      clockLazy: Spec<Lazy<Clock>, 'transient'>
    }

export const coreModule: Module<CoreIn, CoreOut> = (c) =>
  c
    .registerClass('logger', Logger, ['config'])
    // The pool is created synchronously and disposed asynchronously via
    // `Symbol.asyncDispose` — the common production shape. For a fully async
    // factory (`registerFactory('db', async (c) => …)`) `c.get('db')` would
    // return a `Promise<Database>` that callers await; the resolved instance
    // is still unwrapped and disposed correctly on `scope.dispose()`. The
    // sync factory keeps consumer signatures simple here.
    .registerFactory('db', (c) => new Database(c.get('config')))
    // Transient + Lazy companion under 'clockLazy'.
    .registerClass('clock', Clock, [], 'transient', 'clockLazy')
    // Singleton `audit` legally takes `clockLazy` (Lazy<Clock>); passing
    // 'clock' directly here would be a TYPE error — see demo below.
    .registerClass('audit', AuditService, ['logger', 'clockLazy'], 'singleton')

// ---------------------------------------------------------------------------
// 4. Root + per-request scope.
// ---------------------------------------------------------------------------

export function buildRootContainer(env: Record<string, string | undefined> = process.env) {
  return new Container()
    .registerValue('config', readConfig(env))
    .use(coreModule)
    .registerClass('request', RequestContext, [], 'scoped')
    .registerClass('users', UserService, ['request', 'db', 'audit'], 'scoped')
}

export type RootContainer = ReturnType<typeof buildRootContainer>

// Shape passed in by the framework adapter (Fastify request, Hono context, etc.).
// Kept as a structural record so adapters don't need to construct a RequestContext
// instance themselves — `createRequestScope` writes the fields into the scoped one.
export type RequestInit = {
  readonly requestId: string
  readonly userId?: string | undefined
  readonly ip?: string | undefined
}

export async function createRequestScope(root: RootContainer, init: RequestInit): Promise<RequestContainer> {
  const scope = root.createScope()
  try {
    const ctx = scope.get('request')
    ctx.requestId = init.requestId
    ctx.userId = init.userId
    ctx.ip = init.ip
    return scope
  } catch (error) {
    await scope.dispose()
    throw error
  }
}

export type RequestContainer = ReturnType<RootContainer['createScope']>

// ---------------------------------------------------------------------------
// 5. Compile-time lifetime guard — the heart of the library.
//    Uncomment any of these to see a TYPE error (no runtime needed):
// ---------------------------------------------------------------------------
//
// const broken = new Container()
//   .registerValue('config', readConfig())
//   .registerClass('clock', Clock, [], 'transient')
//   // @ts-expect-error: singleton "broken" cannot take transient "clock";
//   //                   the compiler rejects 'clock' in the deps tuple.
//   .registerClass('broken', AuditService, ['logger', 'clock'])
//
// const requestLeak = new Container()
//   .registerValue('config', readConfig())
//   .use(coreModule)
//   .registerClass('request', RequestContext, [], 'scoped')
//   // @ts-expect-error: singleton "auditWithReq" cannot take scoped "request".
//   .registerClass('auditWithReq', AuditService, ['logger', 'request'])
