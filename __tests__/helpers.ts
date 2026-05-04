import type {Lazy} from '../src/Container'

// Моки ресурсов для teardown-тестов. Каждый инстанс несёт собственные счётчики,
// чтобы в assertion'ах можно было проверить кратность вызовов disposer'а.

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

// Плоский .dispose(), возвращающий Promise. Нужен для теста sync-misuse:
// [Symbol.dispose]() должен зафиксировать мисюз СИНХРОННО и погасить unhandledRejection.
export class TrackableAsyncPlain {
  public disposeCalls = 0
  public async dispose(): Promise<void> {
    this.disposeCalls++
  }
}

// Ресурс, который всегда падает на закрытии. Для AggregateError-теста.
export class Throwing {
  public asyncDisposeCalls = 0
  constructor(public readonly msg: string) {}
  public async [Symbol.asyncDispose](): Promise<void> {
    this.asyncDisposeCalls++
    throw new Error(this.msg)
  }
}

// Лог порядка уничтожения. Для проверки LIFO.
export class OrderedDisposable {
  constructor(public readonly label: string, public readonly log: string[]) {}
  public async [Symbol.asyncDispose](): Promise<void> {
    this.log.push(this.label)
  }
}

// Ресурс с ВСЕМИ тремя интерфейсами — для теста приоритета (вызываться должен только asyncDispose).
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

// Проверка доступности GC. Если глобальный gc не проброшен (--expose-gc не выставлен) —
// мемори-тесты скипаются через describe.skipIf(!hasGc).
type GcFn = ((arg?: unknown) => void) | undefined
export const hasGc: boolean = typeof (globalThis as {gc?: GcFn}).gc === 'function'

const gc = (globalThis as {gc?: GcFn}).gc

// Принудительный major-GC. Разные версии Node принимают разные API:
//  • Node 21+: gc({type:'major', execution:'sync'}) — явный major+sync
//  • Node <21: gc(true) — старый boolean-hint API (true = full GC, false = scavenge)
//  • Node любой: gc() — без args, в Node <21 обычно только scavenge (young-gen)
// Пробуем все три и игнорируем падения — хотя бы один из них сработает.
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

// Создаёт memory pressure — форсит V8 промотить объекты из young в old generation
// и затем сделать major GC. Нужно в окружениях, где gc() делает только scavenge
// (Node 20 + Alpine musl — известный кейс).
function allocateMemoryPressure(): void {
  let chunks: unknown[] | null = []
  for (let i = 0; i < 2000; i++) {
    chunks!.push(new Array(100).fill(i))
  }
  // Отпускаем сразу — следующий major GC обязан это забрать вместе с нашей целью.
  chunks = null
}

// Поллит GC до тех пор, пока WeakRef не разыменуется в undefined или не истечёт timeout.
//
// Две важные детали:
// 1. Pre-drain event loop'а — V8 может удерживать stack frames async-функции до
//    полного drain'а микротасок. Рекомендуется вызывать эту функцию после того,
//    как allocation был сделан в ОТДЕЛЬНОЙ async function, не в inline IIFE.
// 2. Memory pressure между итерациями — форсит major GC в окружениях, где gc()
//    по умолчанию делает только minor/scavenge (Node 20, Alpine, musl).
export async function waitForGC(
  ref: WeakRef<object>,
  timeoutMs = 5000,
): Promise<boolean> {
  if (!gc) return false

  // Pre-drain: даём V8 полностью сбросить stack frames вызывающей функции.
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

// Типовая DI-карта для большинства тестов. Покрывает три kind'а и lazy-алиас.
// ВАЖНО: type alias, не interface — DependenciesMap (Record<string, unknown>) требует
// implicit string index signature, которую interface не даёт.
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
