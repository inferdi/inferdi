// Companion to ./container.ts. Demonstrates the test-only features that
// production code SHOULD NOT touch but tests rely on heavily:
//
//   1. .override(key, value) — replace a registered key with a mock. Walks
//      up to find the original `kind`, preserves it on the local override,
//      and refuses if the key has already been resolved on this container.
//   2. Container.Providers<typeof builder> — typed mock-factory fixture.
//   3. Container.Resolve<typeof builder> — flat `{ key: ServiceType }` view
//      of the registered map, useful for typing handler arguments in tests.
//
// Production code in adapters does not import from here; it stays in test
// files and fixtures.

import type { Container } from '@inferdi/inferdi'

import {
  AuditService,
  buildRootContainer,
  Clock,
  Database,
  Logger,
  type RootContainer,
  UserService,
} from './container.js'

// --- Mock implementations ---------------------------------------------------
//
// Each mock structurally satisfies the production class. The compile-time
// guard rejects any mock that drops a public method — no `as any` needed.

class MockLogger implements Pick<Logger, 'info' | 'error'> {
  readonly entries: { level: 'info' | 'error'; message: string; meta: Record<string, unknown> | undefined }[] = []
  info(message: string, meta?: Record<string, unknown>) {
    this.entries.push({ level: 'info', message, meta })
  }
  error(message: string, meta?: Record<string, unknown>) {
    this.entries.push({ level: 'error', message, meta })
  }
}

class MockDatabase implements Pick<Database, 'query' | typeof Symbol.asyncDispose> {
  closed = false
  async query<T>(_sql: string, _params: readonly unknown[] = []): Promise<readonly T[]> {
    return [{ id: '1', name: 'Mock User' }] as unknown as readonly T[]
  }
  async [Symbol.asyncDispose]() {
    this.closed = true
  }
}

class MockClock {
  constructor(private readonly fixedNow: Date) {}
  now() { return this.fixedNow }
}

// --- Pattern 1: per-test override -------------------------------------------
//
// Override walks up the chain, so you can build the production root and only
// swap the keys a given test cares about. The override refuses to run if any
// of the keys have already been resolved on the container — that catches the
// "mock applied too late" bug at the throw site, not in some downstream
// assertion.

export function buildTestContainer(): RootContainer {
  const logger = new MockLogger()
  const db = new MockDatabase()
  const clock = new MockClock(new Date('2026-05-15T00:00:00Z'))

  return buildRootContainer()
    .override('logger', logger as unknown as Logger)
    .override('db', db as unknown as Database)
    // 'clock' is transient — the override replaces the factory result for
    // every .get('clock') call.
    .override('clock', clock as unknown as Clock)
}

// --- Pattern 2: typed providers fixture ------------------------------------
//
// `Container.Providers<typeof builder>` is a record of zero-arg thunks, one
// per registered key. The compiler forces every key to be covered with a
// thunk returning the correct shape (including `{ get: () => Clock }` for
// the `clockLazy` companion). Useful when the test suite drives a stub
// container builder by injecting providers.

type ProviderMap = Container.Providers<RootContainer>

export const mockProviders: ProviderMap = {
  config: () => ({ databaseUrl: 'memory://test', logLevel: 'debug' }),
  logger: () => new MockLogger() as unknown as Logger,
  db: () => new MockDatabase() as unknown as Database,
  clock: () => new MockClock(new Date('2026-05-15T00:00:00Z')) as unknown as Clock,
  clockLazy: () => ({ get: () => new MockClock(new Date('2026-05-15T00:00:00Z')) as unknown as Clock }),
  audit: () => ({ record: () => {} }) as unknown as AuditService,
  request: () => ({ requestId: 'test', userId: undefined, ip: undefined }),
  users: () => ({ profile: async () => ({ id: 'test', name: 'Test User' }) }) as unknown as UserService,
}

// --- Pattern 3: flat Resolve view for typing handler args -------------------
//
// `Container.Resolve<typeof builder>` flattens the type-level map to
// `{ key: ServiceType }`. Useful when a test helper takes "everything the
// container would resolve" as a single record rather than a container.

export type AppServices = Container.Resolve<RootContainer>
// AppServices = {
//   config: AppConfig
//   logger: Logger
//   db: Database
//   clock: Clock
//   clockLazy: Lazy<Clock>
//   audit: AuditService
//   request: RequestContext
//   users: UserService
// }
