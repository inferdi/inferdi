import {describe, it, expect} from 'vitest'
import {Container} from '../src/Container'
import {hasGc, waitForGC} from './helpers'

// ────────────────────────────────────────────────────────────────────────────
// Phase 5 — Memory / GC
//
// Requires Node with --expose-gc. In vitest.config.ts we pass it through
// execArgv. In environments without gc the tests are skipped via describe.skipIf.
//
// IMPORTANT V8 pitfalls (empirically verified):
// 1. Allocation MUST happen inside a SEPARATE async function (not an inline IIFE)
//    — V8 inlines lambdas and keeps their scope alive until the caller returns.
// 2. BEFORE the first gc() a few `await setTimeout(0)` are needed so V8 drops
//    the stack frames of the called async function. waitForGC encapsulates this.
// 3. gc() is called with {type:'major', execution:'sync'} (Node 20+), twice.
// ────────────────────────────────────────────────────────────────────────────

// A separate function (not an IIFE!) — its scope is guaranteed to leave the stack after return.
async function allocateSingletonAndDispose(): Promise<WeakRef<object>> {
  class Heavy {
    public payload = new Array(1000).fill(0)
  }

  const c = new Container().registerClass('heavy', Heavy, [])
  const inst = c.get('heavy')
  const ref = new WeakRef(inst)
  await c.dispose()
  return ref
}

// The factory closure captures heavy. After dispose, regs.clear() must drop
// the reference to the closure so that heavy becomes GC-reachable.
async function allocateFactoryClosureAndDispose(): Promise<WeakRef<object>> {
  class Heavy {
    public payload = new Array(1000).fill(0)
  }
  class Wrapper {
    constructor(public readonly marker: object) {}
  }

  const heavy = new Heavy()
  const weak = new WeakRef(heavy)

  const c = new Container().registerFactory('w', () => {
    // Guaranteed capture of heavy in the closure.
    void heavy.payload.length
    return new Wrapper({ok: true})
  })

  c.get('w')
  await c.dispose()
  return weak
}

// Symbol-keyed singleton must be released after dispose just like a string-keyed one.
async function allocateSymbolKeyedSingletonAndDispose(): Promise<WeakRef<object>> {
  class Heavy {
    public payload = new Array(1000).fill(0)
  }

  const SYM = Symbol('heavy')
  const c = new Container().registerClass(SYM, Heavy, [])
  const ref = new WeakRef(c.get(SYM) as object)
  await c.dispose()
  return ref
}

describe.skipIf(!hasGc)('Phase 5 — memory leaks', () => {
  it('singleton instance is released after dispose (WeakRef.deref() → undefined)', async () => {
    const ref = await allocateSingletonAndDispose()
    expect(await waitForGC(ref)).toBe(true)
  })

  it('registerFactory closure is released after dispose (regs.clear actually works)', async () => {
    const ref = await allocateFactoryClosureAndDispose()
    expect(await waitForGC(ref)).toBe(true)
  })

  it('symbol-keyed singleton instance is released after dispose', async () => {
    const ref = await allocateSymbolKeyedSingletonAndDispose()
    expect(await waitForGC(ref)).toBe(true)
  })

  it('scoped instance from child is released after child.dispose (parent stays alive)', async () => {
    class Leaf {
      public payload = new Array(1000).fill(0)
    }

    // root outlives all following functions — intentionally held.
    const root = new Container().registerClass('leaf', Leaf, [], 'scoped')

    async function allocChildScoped(): Promise<WeakRef<object>> {
      const child = root.createScope()
      const leaf = child.get('leaf')
      const weak = new WeakRef(leaf)
      await child.dispose()
      return weak
    }

    const ref = await allocChildScoped()
    expect(await waitForGC(ref)).toBe(true)

    // Root is still alive and keeps working.
    const another = root.createScope()
    expect(another.get('leaf')).toBeInstanceOf(Leaf)
    await another.dispose()
    await root.dispose()
  })

  // A disposed scope held externally must NOT keep its parent from being GC'd.
  // Without nulling this.parent in dispose(), a saved reference to a disposed child
  // would keep root alive together with all its caches and registrations — a classic leak.
  it('disposed child does not retain root via the parent reference', async () => {
    class HeavyRoot {
      public payload = new Array(2000).fill(0)
    }

    async function buildAndDisposeChild(): Promise<{
      childRef: object
      rootWeak: WeakRef<object>
    }> {
      const root = new Container().registerClass('heavy', HeavyRoot, [], 'singleton')
      const heavy = root.get('heavy') // Held by root through owned + cache.
      void heavy
      const rootWeak = new WeakRef(root)

      const child = root.createScope()
      await child.dispose()
      // Return child outwards — simulating a leaked reference to a disposed scope.
      // root itself no longer has a name in this function's scope and should be
      // GC-reachable ONLY via child.parent — unless that has been cleared.
      return {childRef: child, rootWeak}
    }

    const {childRef, rootWeak} = await buildAndDisposeChild()
    // Keep childRef alive until the GC check so that the test really verifies the
    // absence of the parent reference, not a wholesale GC of the entire subtree.
    void childRef

    expect(await waitForGC(rootWeak)).toBe(true)
    // childRef is still in scope — yet root has already been collected because
    // child.parent was nulled out on dispose.
    void childRef
  })
})
