import {bench, describe} from 'vitest'
import {Container} from '../src/Container'

// ────────────────────────────────────────────────────────────────────────────
// Phase 6 — Benchmarks
//
// Запускается через `npm run bench` (vitest bench). Не часть CI-прогона;
// цель — трекинг регрессий производительности при изменениях контейнера.
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
// Глубокий граф зависимостей: 50 звеньев, каждое зависит от предыдущего.
// Cold — первый резолв, проходит всю цепочку конструкторов.
// Hot — второй+ резолв, всё в кэше, должен быть ≈ O(1).
// ────────────────────────────────────────────────────────────────────────────

const DEPTH = 50
type DeepDeps = Record<string, {level: number}>

function buildDeepContainer(): {container: Container<DeepDeps>; topKey: string} {
  // Используем "wide" стартовый T = DeepDeps через явный каст. Регистрация по строковым
  // ключам через `as never` обходит Exclude<K, keyof T> (для бенчмарка важен runtime,
  // а не type-safety цикла регистрации).
  const container = new Container<DeepDeps>()

  // level0 — фундамент, без зависимостей
  container.registerFactory('level0' as never, () => ({level: 0}))

  for (let i = 1; i < DEPTH; i++) {
    const key = `level${i}`
    const parentKey = `level${i - 1}`
    container.registerFactory(key as never, (c) => ({level: c.get(parentKey).level + 1}))
  }

  return {container, topKey: `level${DEPTH - 1}`}
}

describe('deep graph resolution', () => {
  // Cold: новый контейнер на КАЖДЫЙ вызов.
  bench(
    `deep graph cold resolve (${DEPTH} уровней, первый get)`,
    () => {
      const {container, topKey} = buildDeepContainer()
      container.get(topKey)
    },
    {iterations: 200},
  )

  // Hot: один контейнер, прогретый кэш.
  const warm = buildDeepContainer()
  warm.container.get(warm.topKey)

  bench(`deep graph hot resolve (cached singleton, ${DEPTH} уровней)`, () => {
    warm.container.get(warm.topKey)
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Overhead DI vs raw instantiation — baseline для понимания "цены" контейнера.
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

  bench('container.get("top") (transient, новые Leaf/Mid/Top каждый раз)', () => {
    transientC.get('top')
  })

  const singletonC = new Container()
    .registerClass('leaf', Leaf, [])
    .registerClass('mid', Mid, ['leaf'])
    .registerClass('top', Top, ['mid'])
  singletonC.get('top') // прогрев

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

  // Прогретый scope: инстанс уже в scope.cache, идёт fast-path
  const warmScope = root.createScope()
  warmScope.get('svc')

  bench('scope.get("svc") (scoped cache hit)', () => {
    warmScope.get('svc')
  })

  // Fresh scope + первый резолв — стоимость создания scope'а + обхода вверх по parent'ам
  bench('root.createScope() + scope.get("svc") (первый резолв в свежем scope)', () => {
    const s = root.createScope()
    s.get('svc')
  })

  // Сравнение: scope.get против root.get singleton'а (обход через parent vs локальный кэш)
  const rootSingleton = new Container().registerClass('svc', Svc, [], 'singleton')
  const singletonChild = rootSingleton.createScope()
  singletonChild.get('svc') // прогрев owner-кэша (singleton живёт на root, а не на child)

  bench('scope.get("svc") → root (singleton, parent walk + cache hit на root)', () => {
    singletonChild.get('svc')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Lazy overhead — обёртка vs прямой резолв
// ────────────────────────────────────────────────────────────────────────────

describe('lazy overhead', () => {
  class Target {
    public value = 42
  }

  const c = new Container().registerClass('target', Target, [], 'singleton', true)
  c.get('target') // прогрев
  const wrapper = c.get('targetLazy')

  bench('container.get("target") (direct, cached singleton)', () => {
    c.get('target')
  })

  bench('wrapper.get() (lazy обёртка → резолв cached target)', () => {
    wrapper.get()
  })

  // Обёртка — transient: каждый get возвращает НОВЫЙ объект {get}. Замеряем стоимость
  // создания самой обёртки (одна аллокация + замыкание).
  bench('container.get("targetLazy") (создание новой transient обёртки)', () => {
    c.get('targetLazy')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Fan-out — широкий граф (class с 5-8 deps), сравниваем с chain
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

  // Warm-контейнер: top в кэше, benchmark меряет чистый hit
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

  // Cold: top строится впервые — стоимость цикла по deps + N рекурсивных get
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
// Error paths — missing key и cycle detection
// ────────────────────────────────────────────────────────────────────────────

describe('error paths', () => {
  // Отдельный контейнер — `get('missing')` пройдёт walk вверх (parent нет), потом throw
  const emptyC = new Container<Record<string, unknown>>()

  bench('get() missing key → throw "Key not found"', () => {
    try {
      emptyC.get('nonExistent')
    } catch {
      // baseline для измерения стоимости: Map miss + walk (owner=undefined) + throw + unwind
    }
  })

  // Сравнение: ручной throw без контейнера — показывает "голую" стоимость throw+catch
  bench('baseline: bare try/throw/catch (без контейнера)', () => {
    try {
      throw new Error('bare')
    } catch {
      // noop
    }
  })

  // Cycle: A → B → A. Детекция срабатывает на 3-м вызове get('a'), разворачивает 2 try-finally.
  class A {
    constructor(public b: B) {}
  }
  class B {
    constructor(public a: A) {}
  }

  // Циклическая регистрация невозможна в чистом fluent-стиле (a ссылается на b, который
  // регистрируется позже). Используем pre-declared T + `as never` каст для регистрации.
  const cycleC = new Container() as Container<{a: A; b: B}>
  cycleC.registerClass('a' as never, A, ['b' as never])
  cycleC.registerClass('b' as never, B, ['a' as never])

  bench('cycle detection (A → B → A, throw circular)', () => {
    try {
      cycleC.get('a')
    } catch {
      // finally в try-блоках get() корректно очищает resolving между итерациями
    }
  })

  // Для сравнения: успешный singleton-hit в том же контейнере — baseline, показывает
  // насколько error path дороже fast-path'а
  const happyC = new Container().registerValue('x', {value: 1})

  bench('baseline: successful get (singleton cached)', () => {
    happyC.get('x')
  })
})
