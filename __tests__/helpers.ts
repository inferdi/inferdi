import type {Lazy} from '../src/Container'

// Resource mocks for teardown tests. Each instance carries its own counters
// so assertions can verify how many times the disposer was invoked.

export class TrackableAsync {
  public asyncDisposeCalls = 0
  public async [Symbol.asyncDispose](): Promise<void> {
    this.asyncDisposeCalls++
  }
}

export class TrackableSync {
  public disposeCalls = 0
  public [Symbol.dispose](): void {
    this.disposeCalls++
  }
}

export class TrackablePlain {
  public disposeCalls = 0
  public dispose(): void {
    this.disposeCalls++
  }
}

// Plain .dispose() returning a Promise. Needed for the sync-misuse test:
// [Symbol.dispose]() must record the misuse SYNCHRONOUSLY and swallow unhandledRejection.
export class TrackableAsyncPlain {
  public disposeCalls = 0
  public async dispose(): Promise<void> {
    this.disposeCalls++
  }
}

// Resource that always fails on close. Used in the AggregateError test.
export class Throwing {
  public asyncDisposeCalls = 0
  constructor(public readonly msg: string) {}
  public async [Symbol.asyncDispose](): Promise<void> {
    this.asyncDisposeCalls++
    throw new Error(this.msg)
  }
}

// Logs disposal order. Used to verify LIFO.
export class OrderedDisposable {
  constructor(public readonly label: string, public readonly log: string[]) {}
  public async [Symbol.asyncDispose](): Promise<void> {
    this.log.push(this.label)
  }
}

// Resource implementing ALL three interfaces — for the priority test (only asyncDispose should be called).
export class TriProtocol {
  public asyncDisposeCalls = 0
  public symbolDisposeCalls = 0
  public plainDisposeCalls = 0
  public async [Symbol.asyncDispose](): Promise<void> {
    this.asyncDisposeCalls++
  }
  public [Symbol.dispose](): void {
    this.symbolDisposeCalls++
  }
  public dispose(): void {
    this.plainDisposeCalls++
  }
}

// GC availability check. If global gc is not exposed (--expose-gc not set),
// memory tests are skipped via describe.skipIf(!hasGc).
type GcFn = ((arg?: unknown) => void) | undefined
export const hasGc: boolean = typeof (globalThis as {gc?: GcFn}).gc === 'function'

const gc = (globalThis as {gc?: GcFn}).gc

// Force a major GC. Different Node versions accept different APIs:
//  • Node 21+: gc({type:'major', execution:'sync'}) — explicit major+sync
//  • Node <21: gc(true) — old boolean-hint API (true = full GC, false = scavenge)
//  • Any Node: gc() — no args, on Node <21 usually only scavenge (young-gen)
// Try all three and ignore failures — at least one of them will work.
function forceFullGC(): void {
  if (!gc) return
  const g = gc
  try {
    g({type: 'major', execution: 'sync'})
  } catch {
    /* noop */
  }
  try {
    g(true)
  } catch {
    /* noop */
  }
  try {
    g()
  } catch {
    /* noop */
  }
}

// Creates memory pressure — forces V8 to promote objects from young to old generation
// and then run a major GC. Needed in environments where gc() does only scavenge
// (Node 20 + Alpine musl is a known case).
function allocateMemoryPressure(): void {
  let chunks: unknown[] | null = []
  for (let i = 0; i < 2000; i++) {
    chunks!.push(new Array(100).fill(i))
  }
  // Release immediately — the next major GC must collect this along with our target.
  chunks = null
}

// Polls GC until the WeakRef dereferences to undefined or the timeout expires.
//
// Two important details:
// 1. Pre-drain the event loop — V8 may hold an async function's stack frames
//    until microtasks have fully drained. It is recommended to call this function
//    after the allocation was performed in a SEPARATE async function, not in an inline IIFE.
// 2. Memory pressure between iterations — forces a major GC in environments where gc()
//    by default does only minor/scavenge (Node 20, Alpine, musl).
export async function waitForGC(
  ref: WeakRef<object>,
  timeoutMs = 5000,
): Promise<boolean> {
  if (!gc) return false

  // Pre-drain: let V8 fully release the caller's stack frames.
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    allocateMemoryPressure()
    forceFullGC()
    await new Promise((resolve) => setImmediate(resolve))
    forceFullGC()
    await new Promise((resolve) => setTimeout(resolve, 10))

    if (ref.deref() === undefined) return true
  }

  return false
}

// Standard DI map used by most tests. Covers three kinds and a lazy alias.
// IMPORTANT: type alias, not interface — DependenciesMap (Record<string, unknown>) requires
// an implicit string index signature, which interface does not provide.
export type CommonDeps = {
  logger: Logger
  config: Config
  db: TrackableAsync
  dbLazy: Lazy<TrackableAsync>
  service: Service
}

export interface Logger {
  log(msg: string): void
}

export interface Config {
  port: number
}

export class ConsoleLogger implements Logger {
  public readonly messages: string[] = []
  public log(msg: string): void {
    this.messages.push(msg)
  }
}

export class AppConfig implements Config {
  constructor(public readonly port: number = 8080) {}
}

export class Service {
  constructor(public readonly logger: Logger) {}
  public run(): string {
    this.logger.log('run')
    return 'ok'
  }
}
