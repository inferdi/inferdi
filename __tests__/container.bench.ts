import {bench, describe} from 'vitest'
import {Container} from '../src/Container'

// ────────────────────────────────────────────────────────────────────────────
// Phase 6 — Benchmarks
//
// Run via `npm run bench` (vitest bench). Not part of the CI run; the goal is
// to track performance regressions across container changes.
// ────────────────────────────────────────────────────────────────────────────

describe('cradle vs get', () => {
  const c = new Container().registerValue('foo', {n: 42})
  const cradle = c.cradle

  bench('container.get("foo") (singleton, cache hit)', () => {
    c.get('foo')
  })

  bench('container.cradle.foo (Proxy trap)', () => {
    cradle.foo
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Deep dependency graph: 50 links, each depending on the previous one.
// Cold — first resolve, walks the full constructor chain.
// Hot — second+ resolve, fully cached, should be ≈ O(1).
// ────────────────────────────────────────────────────────────────────────────

const DEPTH = 50
type DeepDeps = Record<string, {level: number}>

function buildDeepContainer(): {container: Container<DeepDeps>; topKey: string} {
  // Use a "wide" starting T = DeepDeps via an explicit cast. Registering string
  // keys through `as never` bypasses Exclude<K, keyof T> (for the benchmark only
  // runtime matters, not type-safety of the registration loop).
  const container = new Container<DeepDeps>()

  // level0 — foundation, no dependencies
  container.registerFactory('level0' as never, () => ({level: 0}))

  for (let i = 1; i < DEPTH; i++) {
    const key = `level${i}`
    const parentKey = `level${i - 1}`
    container.registerFactory(key as never, (c) => ({level: c.get(parentKey).level + 1}))
  }

  return {container, topKey: `level${DEPTH - 1}`}
}

describe('deep graph resolution', () => {
  // Cold: a fresh container on EVERY call.
  bench(
    `deep graph cold resolve (${DEPTH} levels, first get)`,
    () => {
      const {container, topKey} = buildDeepContainer()
      container.get(topKey)
    },
    {iterations: 200},
  )

  // Hot: a single container with a warmed-up cache.
  const warm = buildDeepContainer()
  warm.container.get(warm.topKey)

  bench(`deep graph hot resolve (cached singleton, ${DEPTH} levels)`, () => {
    warm.container.get(warm.topKey)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// DI overhead vs raw instantiation — a baseline for understanding the container's "cost".
// ────────────────────────────────────────────────────────────────────────────

class Leaf {}
class Mid {
  constructor(public readonly leaf: Leaf) {}
}
class Top {
  constructor(public readonly mid: Mid) {}
}

describe('DI overhead vs raw new', () => {
  bench('raw: new Top(new Mid(new Leaf()))', () => {
    const _t = new Top(new Mid(new Leaf()))
    void _t
  })

  const transientC = new Container()
    .registerClass('leaf', Leaf, [], 'transient')
    .registerClass('mid', Mid, ['leaf'], 'transient')
    .registerClass('top', Top, ['mid'], 'transient')

  bench('container.get("top") (transient, new Leaf/Mid/Top each time)', () => {
    transientC.get('top')
  })

  const singletonC = new Container()
    .registerClass('leaf', Leaf, [])
    .registerClass('mid', Mid, ['leaf'])
    .registerClass('top', Top, ['mid'])
  singletonC.get('top') // warm-up

  bench('container.get("top") (singleton, cache hit)', () => {
    singletonC.get('top')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Scoped lifetime — cache hit vs creation
// ────────────────────────────────────────────────────────────────────────────

describe('scoped lifetime', () => {
  class Svc {
    public value = 0
  }

  const root = new Container().registerClass('svc', Svc, [], 'scoped')

  // Warmed-up scope: instance is already in scope.cache, takes the fast path.
  const warmScope = root.createScope()
  warmScope.get('svc')

  bench('scope.get("svc") (scoped cache hit)', () => {
    warmScope.get('svc')
  })

  // Fresh scope + first resolve — cost of scope creation + walking up through parents.
  bench('root.createScope() + scope.get("svc") (first resolve in a fresh scope)', () => {
    const s = root.createScope()
    s.get('svc')
  })

  // Comparison: scope.get vs root.get for a singleton (parent walk vs local cache).
  const rootSingleton = new Container().registerClass('svc', Svc, [], 'singleton')
  const singletonChild = rootSingleton.createScope()
  singletonChild.get('svc') // warm up the owner cache (singleton lives on root, not child)

  bench('scope.get("svc") → root (singleton, parent walk + cache hit on root)', () => {
    singletonChild.get('svc')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Lazy overhead — wrapper vs direct resolve
// ────────────────────────────────────────────────────────────────────────────

describe('lazy overhead', () => {
  class Target {
    public value = 42
  }

  const c = new Container().registerClass('target', Target, [], 'singleton', true)
  c.get('target') // warm-up
  const wrapper = c.get('targetLazy')

  bench('container.get("target") (direct, cached singleton)', () => {
    c.get('target')
  })

  bench('wrapper.get() (lazy wrapper → resolve cached target)', () => {
    wrapper.get()
  })

  // The wrapper is transient: each get returns a NEW {get} object. We measure the
  // cost of creating the wrapper itself (one allocation + closure).
  bench('container.get("targetLazy") (creation of a new transient wrapper)', () => {
    c.get('targetLazy')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Fan-out — wide graph (class with 5-8 deps), compared against the chain
// ────────────────────────────────────────────────────────────────────────────

describe('fan-out (wide graph)', () => {
  class D0 {}
  class D1 {}
  class D2 {}
  class D3 {}
  class D4 {}
  class D5 {}
  class D6 {}
  class D7 {}

  class Wide5 {
    constructor(
      public a: D0,
      public b: D1,
      public c: D2,
      public d: D3,
      public e: D4,
    ) {}
  }
  class Wide8 {
    constructor(
      public a: D0,
      public b: D1,
      public c: D2,
      public d: D3,
      public e: D4,
      public f: D5,
      public g: D6,
      public h: D7,
    ) {}
  }

  // Warm container: top is cached, benchmark measures a pure hit.
  const warm5 = new Container()
    .registerClass('d0', D0, [])
    .registerClass('d1', D1, [])
    .registerClass('d2', D2, [])
    .registerClass('d3', D3, [])
    .registerClass('d4', D4, [])
    .registerClass('top', Wide5, ['d0', 'd1', 'd2', 'd3', 'd4'])
  warm5.get('top')

  const warm8 = new Container()
    .registerClass('d0', D0, [])
    .registerClass('d1', D1, [])
    .registerClass('d2', D2, [])
    .registerClass('d3', D3, [])
    .registerClass('d4', D4, [])
    .registerClass('d5', D5, [])
    .registerClass('d6', D6, [])
    .registerClass('d7', D7, [])
    .registerClass('top', Wide8, ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'])
  warm8.get('top')

  bench('fan-out 5 deps, singleton cached', () => {
    warm5.get('top')
  })

  bench('fan-out 8 deps, singleton cached', () => {
    warm8.get('top')
  })

  // Cold: top is built for the first time — cost of iterating deps + N recursive gets.
  bench(
    'fan-out 5 deps cold (fresh container, first resolve)',
    () => {
      const c = new Container()
        .registerClass('d0', D0, [])
        .registerClass('d1', D1, [])
        .registerClass('d2', D2, [])
        .registerClass('d3', D3, [])
        .registerClass('d4', D4, [])
        .registerClass('top', Wide5, ['d0', 'd1', 'd2', 'd3', 'd4'])
      c.get('top')
    },
    {iterations: 500},
  )

  bench(
    'fan-out 8 deps cold (fresh container, first resolve)',
    () => {
      const c = new Container()
        .registerClass('d0', D0, [])
        .registerClass('d1', D1, [])
        .registerClass('d2', D2, [])
        .registerClass('d3', D3, [])
        .registerClass('d4', D4, [])
        .registerClass('d5', D5, [])
        .registerClass('d6', D6, [])
        .registerClass('d7', D7, [])
        .registerClass('top', Wide8, ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'])
      c.get('top')
    },
    {iterations: 500},
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Error paths — missing key and cycle detection
// ────────────────────────────────────────────────────────────────────────────

describe('error paths', () => {
  // Standalone container — `get('missing')` will walk up (no parent), then throw.
  const emptyC = new Container<Record<string, unknown>>()

  bench('get() missing key → throw "Key not found"', () => {
    try {
      emptyC.get('nonExistent')
    } catch {
      // baseline cost measurement: Map miss + walk (owner=undefined) + throw + unwind
    }
  })

  // Comparison: a manual throw without the container — shows the "bare" throw+catch cost.
  bench('baseline: bare try/throw/catch (no container)', () => {
    try {
      throw new Error('bare')
    } catch {
      // noop
    }
  })

  // Cycle: A → B → A. Detection triggers on the third get('a') call, unwinds 2 try-finally blocks.
  class A {
    constructor(public b: B) {}
  }
  class B {
    constructor(public a: A) {}
  }

  // Cyclic registration is impossible in pure fluent style (a references b, which is
  // registered later). We use a pre-declared T + `as never` cast for registration.
  const cycleC = new Container() as Container<{a: A; b: B}>
  cycleC.registerClass('a' as never, A, ['b' as never])
  cycleC.registerClass('b' as never, B, ['a' as never])

  bench('cycle detection (A → B → A, throw circular)', () => {
    try {
      cycleC.get('a')
    } catch {
      // finally in get()'s try-blocks correctly clears `resolving` between iterations
    }
  })

  // For comparison: a successful singleton hit on the same container — baseline showing
  // how much more expensive the error path is than the fast path.
  const happyC = new Container().registerValue('x', {value: 1})

  bench('baseline: successful get (singleton cached)', () => {
    happyC.get('x')
  })
})
