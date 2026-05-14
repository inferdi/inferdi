import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {Container} from '../src/Container'
import {
  OrderedDisposable,
  Throwing,
  TrackableAsync,
  TrackableAsyncPlain,
  TrackablePlain,
  TrackableSync,
  TriProtocol,
} from './helpers'

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 — Teardown / Disposal
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 3 — LIFO order', () => {
  it('registered A → B → C, dispose order C → B → A', async () => {
    const log: string[] = []
    const container = new Container()
      .registerFactory('a', () => new OrderedDisposable('A', log))
      .registerFactory('b', () => new OrderedDisposable('B', log))
      .registerFactory('c', () => new OrderedDisposable('C', log))

    // Resolve in A → B → C order
    container.get('a')
    container.get('b')
    container.get('c')

    await container.dispose()

    expect(log).toEqual(['C', 'B', 'A'])
  })
})

describe('Phase 3 — disposer protocol priority', () => {
  it('asyncDispose takes priority over Symbol.dispose and the plain dispose', async () => {
    const inst = new TriProtocol()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
    expect(inst.symbolDisposeCalls).toBe(0)
    expect(inst.plainDisposeCalls).toBe(0)
  })

  it('without asyncDispose, Symbol.dispose is called', async () => {
    const inst = new TrackableSync()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('without Symbol.*, the plain .dispose() is called', async () => {
    const inst = new TrackablePlain()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('a plain async dispose() is awaited inside async dispose', async () => {
    const inst = new TrackableAsyncPlain()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })
})

describe('Phase 3 — error aggregation', () => {
  it('1 failed disposer — the error is propagated as-is (not wrapped in AggregateError)', async () => {
    const c = new Container().registerFactory('a', () => new Throwing('boom'))
    c.get('a')

    await expect(c.dispose()).rejects.toThrow('boom')
    await expect(c.dispose()).resolves.toBeUndefined() // second time — no-op
  })

  it('≥2 failed disposers — AggregateError with all causes; the rest are still closed', async () => {
    const okInst = new TrackableAsync()
    const c = new Container()
      .registerFactory('ok', () => okInst)
      .registerFactory('err1', () => new Throwing('boom-1'))
      .registerFactory('err2', () => new Throwing('boom-2'))

    // Resolve in ok, err1, err2 order — dispose in reverse
    c.get('ok')
    c.get('err1')
    c.get('err2')

    let caught: unknown = null
    try {
      await c.dispose()
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AggregateError)
    const agg = caught as AggregateError
    expect(agg.errors).toHaveLength(2)
    expect(agg.errors.map((e: Error) => e.message).sort()).toEqual(['boom-1', 'boom-2'])
    // The ok resource must be closed even when others fail
    expect(okInst.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — duplicate dispose (Set deduplication)', () => {
  it('shared instance under two keys — dispose is called exactly ONCE', async () => {
    const shared = new TrackableAsync()
    const c = new Container()
      .registerFactory('a', () => shared)
      .registerFactory('b', () => shared)

    c.get('a')
    c.get('b')

    await c.dispose()

    expect(shared.asyncDisposeCalls).toBe(1)
  })

  it('three keys — still one dispose', async () => {
    const shared = new TrackableAsync()
    const c = new Container()
      .registerFactory('a', () => shared)
      .registerFactory('b', () => shared)
      .registerFactory('cc', () => shared)

    c.get('a')
    c.get('b')
    c.get('cc')

    await c.dispose()

    expect(shared.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — ownership boundaries', () => {
  it('registerValue is NOT included in teardown (external ownership)', async () => {
    const external = new TrackableAsync()
    const c = new Container().registerValue('external', external)

    // Access it just in case — warms up all paths
    c.get('external')

    await c.dispose()

    expect(external.asyncDisposeCalls).toBe(0)
  })

  it('transient instances are not tracked and not closed by the container', async () => {
    let created: TrackableAsync[] = []
    const c = new Container().registerFactory(
      't',
      () => {
        const inst = new TrackableAsync()
        created.push(inst)
        return inst
      },
      'transient',
    )

    c.get('t')
    c.get('t')
    c.get('t')

    await c.dispose()

    // None of the three transient instances must be touched
    for (const inst of created) {
      expect(inst.asyncDisposeCalls).toBe(0)
    }
  })

  it('scoped instance with scope.dispose — is closed', async () => {
    const root = new Container().registerClass('s', TrackableAsync, [], 'scoped')

    const scope = root.createScope()
    const inst = scope.get('s')

    await scope.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — scope hierarchy', () => {
  it('child.dispose() does NOT touch resources created on parent/root', async () => {
    const root = new Container()
      .registerClass('rootSvc', TrackableAsync, [], 'singleton')
      .registerClass('scopedSvc', TrackableAsync, [], 'scoped')

    const rootInst = root.get('rootSvc')
    const child = root.createScope()
    const childScopedInst = child.get('scopedSvc')

    await child.dispose()

    expect(childScopedInst.asyncDisposeCalls).toBe(1) // child closed its own scoped resource
    expect(rootInst.asyncDisposeCalls).toBe(0) // root is untouched
  })

  it('parent.dispose() works after a previously disposed child', async () => {
    const root = new Container()
      .registerClass('rootSvc', TrackableAsync, [], 'singleton')
      .registerClass('scopedSvc', TrackableAsync, [], 'scoped')

    const rootInst = root.get('rootSvc')
    const child = root.createScope()
    child.get('scopedSvc')

    await child.dispose()
    await expect(root.dispose()).resolves.toBeUndefined()

    expect(rootInst.asyncDisposeCalls).toBe(1)
  })

  it('parent.dispose() does NOT cascade into an unclosed child (documenting behavior)', async () => {
    const root = new Container().registerClass('scopedSvc', TrackableAsync, [], 'scoped')

    const child = root.createScope()
    const childInst = child.get('scopedSvc')

    await root.dispose()

    // Child stays valid until its own dispose
    expect(childInst.asyncDisposeCalls).toBe(0)
    expect(child.disposed).toBe(false)

    await child.dispose()
    expect(childInst.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — idempotency and blocking', () => {
  it('double dispose() — the second is a no-op', async () => {
    const inst = new TrackableAsync()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()
    await c.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
    expect(c.disposed).toBe(true)
  })

  it('get() after dispose — throws', async () => {
    const c = new Container().registerFactory('r', () => new TrackableAsync())
    await c.dispose()

    expect(() => c.get('r')).toThrow(/Container is disposed/)
  })

  it('createScope() after dispose — throws', async () => {
    const c = new Container().registerFactory('r', () => new TrackableAsync())
    await c.dispose()

    expect(() => c.createScope()).toThrow(/Cannot create scope from a disposed container/)
  })

  it('descendant.get() after parent dispose — throws "Ancestor container is disposed"', async () => {
    // Parent was torn down (regs.clear() emptied its registrations) while a child
    // scope is still live and reaching for a key registered on the parent. Without
    // the explicit ancestor check, the user would see a misleading "Key not found".
    const root = new Container().registerValue('cfg', {port: 8080})
    const scope = root.createScope()
    await root.dispose()

    expect(() => scope.get('cfg')).toThrow(/Ancestor container is disposed \(key: "cfg"\)/)
  })

  it('re-entrancy: disposer calls container.get — receives disposed, does not loop', async () => {
    let disposerCalled = 0
    let caughtInDisposer: unknown = null
    const saved: {container?: ReturnType<typeof build>} = {}
    class Reentrant {
      async [Symbol.asyncDispose](): Promise<void> {
        disposerCalled++
        try {
          saved.container!.get('r')
        } catch (e) {
          caughtInDisposer = e
        }
      }
    }
    function build() {
      return new Container().registerFactory('r', () => new Reentrant())
    }
    const c = build()
    saved.container = c
    c.get('r')

    await c.dispose()

    expect(disposerCalled).toBe(1)
    expect(caughtInDisposer).toBeInstanceOf(Error)
    expect((caughtInDisposer as Error).message).toMatch(/Container is disposed/)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Sync teardown via [Symbol.dispose]
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 3 — sync [Symbol.dispose]', () => {
  // Watch unhandledRejection to confirm we swallow promises from
  // an async plain .dispose() without flooding the event loop.
  let rejections: unknown[] = []
  let handler: (reason: unknown) => void

  beforeEach(() => {
    rejections = []
    handler = (reason) => rejections.push(reason)
    process.on('unhandledRejection', handler)
  })

  afterEach(() => {
    process.off('unhandledRejection', handler)
  })

  it('sync dispose only invokes sync [Symbol.dispose] / plain dispose', () => {
    const sync = new TrackableSync()
    const plain = new TrackablePlain()
    const asyncOnly = new TrackableAsync()

    const c = new Container()
      .registerFactory('s', () => sync)
      .registerFactory('p', () => plain)
      .registerFactory('a', () => asyncOnly)
    c.get('s')
    c.get('p')
    c.get('a')

    c[Symbol.dispose]()

    expect(sync.disposeCalls).toBe(1)
    expect(plain.disposeCalls).toBe(1)
    expect(asyncOnly.asyncDisposeCalls).toBe(0) // async-only is skipped
  })

  it('resource with only asyncDispose is skipped without errors', () => {
    const a = new TrackableAsync()
    const c = new Container().registerFactory('a', () => a)
    c.get('a')

    // Neither a throw nor an attempt to run Symbol.asyncDispose
    expect(() => c[Symbol.dispose]()).not.toThrow()
    expect(a.asyncDisposeCalls).toBe(0)
  })

  it('plain async dispose() in sync context — errors.push SYNCHRONOUSLY with an "await using" message', () => {
    const r = new TrackableAsyncPlain()
    const c = new Container().registerFactory('r', () => r)
    c.get('r')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)
    // The disposer was still invoked (it started the promise) — the counter went up
    expect(r.disposeCalls).toBe(1)
  })

  it('unhandledRejection from async-in-sync dispose is suppressed', async () => {
    // A resource whose plain dispose() returns a rejected Promise.
    // Without .catch(() => {}) inside Container — we would catch unhandledRejection.
    class RejectingPlain {
      public disposeCalls = 0
      public dispose(): Promise<void> {
        this.disposeCalls++
        return Promise.reject(new Error('rejected-during-dispose'))
      }
    }

    const r = new RejectingPlain()
    const c = new Container().registerFactory('r', () => r)
    c.get('r')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)

    // Wait for microtasks so the promise definitely settles. The error should be
    // caught by the internal .catch(() => {}) and NOT reach process unhandledRejection.
    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))

    expect(rejections).toHaveLength(0)
  })

  it('mixed scenario: one sync ok + one sync-misuse → AggregateError is not needed (1 error) or a plain throw', () => {
    const okSync = new TrackableSync()
    const asyncPlain = new TrackableAsyncPlain()

    const c = new Container()
      .registerFactory('ok', () => okSync)
      .registerFactory('bad', () => asyncPlain)
    c.get('ok')
    c.get('bad')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)
    expect(okSync.disposeCalls).toBe(1) // sync resource was still closed
  })

  it('double [Symbol.dispose] — no-op', () => {
    const r = new TrackableSync()
    const c = new Container().registerFactory('r', () => r)
    c.get('r')

    c[Symbol.dispose]()
    c[Symbol.dispose]()

    expect(r.disposeCalls).toBe(1)
    expect(c.disposed).toBe(true)
  })

  it('one sync disposer throws — the error is propagated as-is (not AggregateError)', () => {
    // Sync variant of an exception inside [Symbol.dispose]: covers the
    // catch → errors.push branch in Container[Symbol.dispose].
    class ThrowingSync {
      public [Symbol.dispose](): void {
        throw new Error('sync-boom')
      }
    }
    const c = new Container().registerFactory('r', () => new ThrowingSync())
    c.get('r')

    expect(() => c[Symbol.dispose]()).toThrow('sync-boom')
    expect(c.disposed).toBe(true)
  })

  it('two sync disposers throw — AggregateError with all causes', () => {
    // Covers the second `if (errors.length > 1)` branch and the AggregateError throw
    // in the sync variant of Container[Symbol.dispose].
    class ThrowingSync {
      constructor(private readonly msg: string) {}
      public [Symbol.dispose](): void {
        throw new Error(this.msg)
      }
    }
    const c = new Container()
      .registerFactory('a', () => new ThrowingSync('boom-1'))
      .registerFactory('b', () => new ThrowingSync('boom-2'))
    c.get('a')
    c.get('b')

    let caught: unknown = null
    try {
      c[Symbol.dispose]()
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AggregateError)
    const agg = caught as AggregateError
    expect(agg.errors.map((e: Error) => e.message).sort()).toEqual(['boom-1', 'boom-2'])
  })
})

describe('Phase 3 — symbol keys', () => {
  it('LIFO order is preserved when keys mix string and symbol', async () => {
    const log: string[] = []
    const SYM_B = Symbol('B')
    const c = new Container()
      .registerFactory('a', () => new OrderedDisposable('A', log))
      .registerFactory(SYM_B, () => new OrderedDisposable('B', log))
      .registerFactory('c', () => new OrderedDisposable('C', log))

    c.get('a')
    c.get(SYM_B)
    c.get('c')

    await c.dispose()

    expect(log).toEqual(['C', 'B', 'A'])
  })

  it('Symbol.dispose on a value registered under a symbol key is still called', async () => {
    const RES = Symbol('resource')
    const inst = new TrackableSync()
    const c = new Container().registerFactory(RES, () => inst)

    c.get(RES)
    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('symbol-keyed registerValue is NOT in the teardown queue', async () => {
    const SYM = Symbol('external')
    const ext = new TrackableAsync()
    const c = new Container().registerValue(SYM, ext)

    c.get(SYM)
    await c.dispose()

    expect(ext.asyncDisposeCalls).toBe(0)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 — async-factory Promise unwrap
//
// Async factories cache a Promise in `owned`. The async dispose() awaits it
// before probing the resolved instance for the disposer protocol; sync
// [Symbol.dispose] cannot await and surfaces the misuse as an Error.
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 3 — async-factory Promise unwrap', () => {
  let rejections: unknown[] = []
  let handler: (reason: unknown) => void

  beforeEach(() => {
    rejections = []
    handler = (reason) => rejections.push(reason)
    process.on('unhandledRejection', handler)
  })

  afterEach(() => {
    process.off('unhandledRejection', handler)
  })

  it('async dispose unwraps Promise<TrackableAsync> and calls [Symbol.asyncDispose]', async () => {
    const inst = new TrackableAsync()
    const c = new Container().registerFactory('r', async () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
  })

  it('async dispose unwraps Promise<TrackableSync> and calls [Symbol.dispose]', async () => {
    const inst = new TrackableSync()
    const c = new Container().registerFactory('r', async () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('async dispose unwraps Promise<TrackablePlain> and calls .dispose()', async () => {
    const inst = new TrackablePlain()
    const c = new Container().registerFactory('r', async () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('async dispose unwraps Promise<TrackableAsyncPlain> and awaits the plain async dispose()', async () => {
    const inst = new TrackableAsyncPlain()
    const c = new Container().registerFactory('r', async () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
    expect(rejections).toHaveLength(0)
  })

  it('async dispose: Promise<null> from async factory is skipped without error', async () => {
    const c = new Container().registerFactory('r', async () => null)
    c.get('r')

    await expect(c.dispose()).resolves.toBeUndefined()
    expect(c.disposed).toBe(true)
  })

  it('async dispose: Promise<undefined> from async factory is skipped without error', async () => {
    const c = new Container().registerFactory('r', async () => undefined)
    c.get('r')

    await expect(c.dispose()).resolves.toBeUndefined()
    expect(c.disposed).toBe(true)
  })

  it('async dispose: rejecting async factory — rejection propagates as the single error', async () => {
    const c = new Container().registerFactory('r', () =>
      Promise.reject(new Error('factory-boom')) as Promise<TrackableAsync>,
    )
    c.get('r')

    await expect(c.dispose()).rejects.toThrow('factory-boom')
  })

  it('async dispose: rejecting async factory + throwing sync resource — AggregateError aggregates both', async () => {
    const c = new Container()
      .registerFactory('rej', () =>
        Promise.reject(new Error('factory-boom')) as Promise<TrackableAsync>,
      )
      .registerFactory('thr', () => new Throwing('disposer-boom'))

    c.get('rej')
    c.get('thr')

    let caught: unknown = null
    try {
      await c.dispose()
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AggregateError)
    const agg = caught as AggregateError
    expect(agg.errors).toHaveLength(2)
    expect(agg.errors.map((e: Error) => e.message).sort()).toEqual(['disposer-boom', 'factory-boom'])
  })

  it('async dispose: LIFO order is preserved across a mix of sync and async-cached resources', async () => {
    const log: string[] = []
    const c = new Container()
      .registerFactory('a', () => new OrderedDisposable('A', log))
      .registerFactory('b', async () => new OrderedDisposable('B', log))
      .registerFactory('cc', () => new OrderedDisposable('C', log))

    c.get('a')
    c.get('b')
    c.get('cc')

    await c.dispose()

    expect(log).toEqual(['C', 'B', 'A'])
  })

  it('async dispose: shared Promise reference under two keys — dispose runs exactly once', async () => {
    const inst = new TrackableAsync()
    const shared = Promise.resolve(inst)
    const c = new Container()
      .registerFactory('a', () => shared)
      .registerFactory('b', () => shared)

    c.get('a')
    c.get('b')

    await c.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
  })

  it('async dispose: resolved instance throws inside [Symbol.asyncDispose] — error is collected', async () => {
    const c = new Container().registerFactory('r', async () => new Throwing('post-await-boom'))
    c.get('r')

    await expect(c.dispose()).rejects.toThrow('post-await-boom')
  })

  it('[Symbol.dispose] on a container with a Promise-cached resource — throws misuse error', () => {
    const c = new Container().registerFactory('r', async () => new TrackableAsync())
    c.get('r')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)
    expect(c.disposed).toBe(true)
  })

  it('[Symbol.dispose] on a Promise-cached resource leaves a working sync resource closed', () => {
    const okSync = new TrackableSync()
    const c = new Container()
      .registerFactory('async', async () => new TrackableAsync())
      .registerFactory('sync', () => okSync)

    c.get('async')
    c.get('sync')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)
    expect(okSync.disposeCalls).toBe(1)
  })

  it('[Symbol.dispose] on two Promise-cached resources — AggregateError with two misuse errors', () => {
    const c = new Container()
      .registerFactory('a', async () => new TrackableAsync())
      .registerFactory('b', async () => new TrackableAsync())

    c.get('a')
    c.get('b')

    let caught: unknown = null
    try {
      c[Symbol.dispose]()
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AggregateError)
    const agg = caught as AggregateError
    expect(agg.errors).toHaveLength(2)
    for (const e of agg.errors) {
      expect((e as Error).message).toMatch(/await using/i)
    }
  })
})

describe('Phase 3 — TC39 using / await using', () => {
  it('await using correctly invokes asyncDispose on block exit', async () => {
    const inst = new TrackableAsync()
    const outer = new Container().registerFactory('r', () => inst)

    {
      await using scope = outer.createScope()
      // scope creates its own scoped instance (NOT the same one as outer)
      scope.get('r') // resolves via parent, singleton lives on outer → not in owned scope
      // Explicitly verify that scope's dispose runs even when it has no owned resources
      void scope
    }
    // At this point scope must be disposed. inst belongs to outer — not yet closed.
    expect(inst.asyncDisposeCalls).toBe(0)

    await outer.dispose()
    expect(inst.asyncDisposeCalls).toBe(1)
  })
})
