import {describe, it, expect} from 'vitest'
import {inspect} from 'node:util'
import {Container, type DependenciesMap} from '../src/Container'
import {
  AppConfig,
  ConsoleLogger,
  Service,
  TrackableAsync,
} from './helpers'

// ────────────────────────────────────────────────────────────────────────────
// Phase 1 — Functional
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 1 — Functional', () => {
  describe('registerClass', () => {
    it('резолвит класс с нулевой арностью', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.get('logger')).toBeInstanceOf(ConsoleLogger)
    })

    it('передаёт зависимости в конструктор в объявленном порядке', () => {
      const c = new Container()
        .registerClass('logger', ConsoleLogger, [])
        .registerClass('service', Service, ['logger'])

      const svc = c.get('service')

      expect(svc).toBeInstanceOf(Service)
      expect(svc.logger).toBe(c.get('logger'))
    })
  })

  // Arity unrolling в Container.registerClass — отдельные ветки for len === 0..4
  // и tail (len >= 5) через Reflect.construct. len === 0 и 1 уже проверены выше
  // (ConsoleLogger / Service); здесь дозакрываем 2, 3, 4 и tail.
  describe('arity unrolling — все ветки JIT-оптимизации', () => {
    it('len === 2: оба аргумента прокидываются в правильном порядке', () => {
      class Two {
        constructor(public a: number, public b: string) {}
      }
      const c = new Container()
        .registerValue('n', 1)
        .registerValue('s', 'x')
        .registerClass('two', Two, ['n', 's'])

      const inst = c.get('two')
      expect(inst.a).toBe(1)
      expect(inst.b).toBe('x')
    })

    it('len === 3', () => {
      class Three {
        constructor(public a: number, public b: string, public c: boolean) {}
      }
      const c = new Container()
        .registerValue('n', 1)
        .registerValue('s', 'x')
        .registerValue('bo', true)
        .registerClass('three', Three, ['n', 's', 'bo'])

      const inst = c.get('three')
      expect([inst.a, inst.b, inst.c]).toEqual([1, 'x', true])
    })

    it('len === 4', () => {
      class Four {
        constructor(
          public a: number,
          public b: string,
          public c: boolean,
          public d: number,
        ) {}
      }
      const c = new Container()
        .registerValue('n1', 1)
        .registerValue('s', 'x')
        .registerValue('bo', true)
        .registerValue('n2', 2)
        .registerClass('four', Four, ['n1', 's', 'bo', 'n2'])

      const inst = c.get('four')
      expect([inst.a, inst.b, inst.c, inst.d]).toEqual([1, 'x', true, 2])
    })

    it('len === 5: tail-ветка через Reflect.construct', () => {
      class Five {
        constructor(
          public a: number,
          public b: number,
          public c: number,
          public d: number,
          public e: number,
        ) {}
      }
      const c = new Container()
        .registerValue('a', 1)
        .registerValue('b', 2)
        .registerValue('c', 3)
        .registerValue('d', 4)
        .registerValue('e', 5)
        .registerClass('five', Five, ['a', 'b', 'c', 'd', 'e'])

      const inst = c.get('five')
      expect([inst.a, inst.b, inst.c, inst.d, inst.e]).toEqual([1, 2, 3, 4, 5])
    })

    it('len === 6: tail-ветка с большей арностью (стабильность)', () => {
      class Six {
        constructor(
          public a: number,
          public b: number,
          public c: number,
          public d: number,
          public e: number,
          public f: number,
        ) {}
      }
      const c = new Container()
        .registerValue('a', 1)
        .registerValue('b', 2)
        .registerValue('c', 3)
        .registerValue('d', 4)
        .registerValue('e', 5)
        .registerValue('f', 6)
        .registerClass('six', Six, ['a', 'b', 'c', 'd', 'e', 'f'])

      const inst = c.get('six')
      expect([inst.a, inst.b, inst.c, inst.d, inst.e, inst.f]).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('registerFactory', () => {
    it('фабрика получает контейнер и её результат доступен через get', () => {
      const c = new Container().registerFactory('config', () => ({port: 3000}))

      expect(c.get('config')).toEqual({port: 3000})
    })

    it('фабрика видит ранее зарегистрированные зависимости', () => {
      const c = new Container()
        .registerValue('base', 21)
        .registerFactory('doubled', (ctx) => ctx.get('base') * 2)

      expect(c.get('doubled')).toBe(42)
    })
  })

  describe('registerValue', () => {
    it('возвращает то же значение по ссылке', () => {
      const cfg = new AppConfig(9000)
      const c = new Container().registerValue('config', cfg)

      expect(c.get('config')).toBe(cfg)
    })

    it('значение доступно сразу через cache (fast-path)', () => {
      const value = {marker: Symbol('v')}
      const c = new Container().registerValue('v', value)

      expect(c.get('v')).toBe(value)
    })
  })

  describe('cradle', () => {
    it('cradle.key === get("key")', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.cradle.logger).toBe(c.get('logger'))
    })

    it('cradle игнорирует обращения по Symbol-ключам', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      const anyCradle = c.cradle as unknown as Record<symbol, unknown>
      expect(anyCradle[Symbol.iterator]).toBeUndefined()
      expect(anyCradle[Symbol.toStringTag]).toBeUndefined()
      expect(anyCradle[Symbol.toPrimitive]).toBeUndefined()
    })

    it('util.inspect(cradle) не падает (основной мотиватор Symbol-игнора)', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(() => inspect(c.cradle)).not.toThrow()
    })

    it('cradle — мемоизирован: повторное обращение возвращает тот же Proxy', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.cradle).toBe(c.cradle)
    })

    it('cradle на disposed-контейнере бросает сразу, не на следующем уровне', async () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])
      await c.dispose()

      expect(() => c.cradle).toThrow(/Container is disposed/)
    })

    it('cradle с числовым ключом резолвится (runtime: строка)', () => {
      const c = new Container().registerValue('404', 'Not Found')

      // В JS обращение по числу p[404] на этапе Proxy-trap прилетает как строка '404'.
      expect((c.cradle as Record<string, string>)[404]).toBe('Not Found')
    })
  })

  describe('unknown keys', () => {
    it('get() бросает "Key ... not found"', () => {
      const c = new Container().registerValue('known', 'x')
      // @ts-expect-error — пытаемся резолвить незарегистрированный ключ
      expect(() => c.get('unknown')).toThrow(/Key "unknown" not found/)
    })

    it('cradle.unknownKey возвращает undefined (soft-режим)', () => {
      // Soft-режим обязателен, иначе любые протокольные пробы (then/toJSON/...)
      // крашат приложение. Жёсткий throw остаётся в c.get().
      const c = new Container<Record<string, unknown>>()
      expect((c.cradle as Record<string, unknown>).unknownKey).toBeUndefined()
    })

    it('cradle.then возвращает undefined — Promise.resolve(cradle) не падает', async () => {
      const c = new Container().registerValue('foo', 1)

      // Без has-проверки в Proxy этот await крашил бы приложение, потому что
      // Promise.resolve(cradle) дёргает Get('then'), а 'then' не зарегистрирован.
      const adopted = await Promise.resolve(c.cradle)

      // Resolve адаптировал бы thenable, если бы .then оказался функцией.
      // У нас .then === undefined → resolve вернул сам proxy.
      expect(adopted.foo).toBe(1)
    })

    it('cradle поддерживает популярные протокольные пробы: toJSON, toString, valueOf', () => {
      const c = new Container().registerValue('foo', 1)
      const cr = c.cradle as Record<string, unknown>

      // Все эти ключи дёргаются JSON.stringify, console.log, +cradle, и т.п.
      // Soft-режим возвращает undefined, не throw.
      expect(cr.toJSON).toBeUndefined()
      expect(cr.toString).toBeUndefined()
      expect(cr.valueOf).toBeUndefined()
      expect(cr.then).toBeUndefined()
    })
  })

  describe('cycle detection', () => {
    it('A→B→C→A: бросает с цепочкой в сообщении', () => {
      class A {
        constructor(public b: B) {}
      }
      class B {
        constructor(public c: C) {}
      }
      class C {
        constructor(public a: A) {}
      }

      // Регистрация рекурсивных классов в fluent-стиле невозможна без приведения,
      // потому что 'b' нужен для 'a', но регистрируется позже. Используем pre-declared
      // тип через Container<{}> + явный каст в Container с известной формой —
      // проверяем именно runtime-поведение цикл-детекции.
      const c = new Container() as Container<{a: A; b: B; cc: C}>
      c.registerClass('a' as never, A, ['b' as never])
      c.registerClass('b' as never, B, ['cc' as never])
      c.registerClass('cc' as never, C, ['a' as never])

      expect(() => c.get('a')).toThrow(/Circular dependency detected: a -> b -> cc -> a/)
    })

    it('саморекурсия A→A — тоже ловится', () => {
      class A {
        constructor(_a: A) {}
      }
      const c = new Container() as Container<{a: A}>
      c.registerClass('a' as never, A, ['a' as never])

      expect(() => c.get('a')).toThrow(/Circular dependency detected: a -> a/)
    })

    it('сообщение содержит подсказку про Lazy', () => {
      class A {
        constructor(_a: A) {}
      }
      const c = new Container() as Container<{a: A}>
      c.registerClass('a' as never, A, ['a' as never])

      expect(() => c.get('a')).toThrow(/Lazy<T>/)
    })

    it('после исключения в цикле контейнер остаётся валидным (finally очищает resolving)', () => {
      class A {
        constructor(_a: A) {}
      }
      const c = new Container().registerValue('other', {ok: true}) as unknown as Container<{
        a: A
        other: {ok: true}
      }>
      c.registerClass('a' as never, A, ['a' as never])

      expect(() => c.get('a')).toThrow()
      // second resolve should still surface same error (not "already resolving")
      expect(() => c.get('a')).toThrow(/Circular/)
      // ни тот факт, что мы дергали broken ключ, не портит другие ключи
      expect(c.get('other').ok).toBe(true)
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Phase 2 — Lifetimes & Scopes
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 2 — Lifetimes', () => {
  describe('singleton (default)', () => {
    it('multiple get() возвращают один и тот же инстанс', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [])

      expect(c.get('logger')).toBe(c.get('logger'))
    })

    it('singleton работает и с registerFactory', () => {
      let calls = 0
      const c = new Container().registerFactory('obj', () => ({n: ++calls}), 'singleton')

      expect(c.get('obj')).toBe(c.get('obj'))
      expect(calls).toBe(1)
    })
  })

  describe('transient', () => {
    it('multiple get() возвращают новые инстансы', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [], 'transient')

      const a = c.get('logger')
      const b = c.get('logger')

      expect(a).not.toBe(b)
      expect(a).toBeInstanceOf(ConsoleLogger)
      expect(b).toBeInstanceOf(ConsoleLogger)
    })

    it('transient — каждая фабрика вызывается заново', () => {
      let calls = 0
      const c = new Container().registerFactory('obj', () => ({n: ++calls}), 'transient')

      c.get('obj')
      c.get('obj')
      c.get('obj')

      expect(calls).toBe(3)
    })
  })

  describe('scoped', () => {
    it('внутри одного scope — один инстанс', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [], 'scoped')

      const scope = c.createScope()

      expect(scope.get('logger')).toBe(scope.get('logger'))
    })

    it('разные scope — разные инстансы', () => {
      const c = new Container().registerClass('logger', ConsoleLogger, [], 'scoped')

      const s1 = c.createScope()
      const s2 = c.createScope()

      expect(s1.get('logger')).not.toBe(s2.get('logger'))
    })
  })

  describe('scope hierarchy', () => {
    it('зависимость, не найденная локально, резолвится из parent', () => {
      const root = new Container().registerClass('logger', ConsoleLogger, [])

      const child = root.createScope()

      // child не имеет локальной регистрации — walk вверх находит в root
      expect(child.get('logger')).toBe(root.get('logger'))
    })

    it('singleton, запрошенный из child, инстанцируется на owner (root)', () => {
      const root = new Container()
        .registerClass('logger', ConsoleLogger, [])
        .registerClass('service', Service, ['logger'])

      const child = root.createScope()

      // Инстанс должен быть общий: один и тот же между root и child
      expect(child.get('service')).toBe(root.get('service'))
      // И логгер общий (резолвится в контексте owner = root)
      expect(child.get('service').logger).toBe(root.get('logger'))
    })

    it('child-owned singleton живёт на child, не на root', () => {
      const root = new Container()
      const child = root.createScope().registerClass('childOnly', ConsoleLogger, [], 'singleton')

      const inst = child.get('childOnly')
      expect(inst).toBeInstanceOf(ConsoleLogger)
      // root не видит child-only регистрацию
      // @ts-expect-error — childOnly не в типе root
      expect(() => root.get('childOnly')).toThrow(/Key "childOnly" not found/)
    })

    it('scoped на root: в каждом child-scope свой инстанс', () => {
      const root = new Container().registerClass('logger', ConsoleLogger, [], 'scoped')

      const s1 = root.createScope()
      const s2 = root.createScope()

      expect(s1.get('logger')).not.toBe(s2.get('logger'))
    })

    it('hasKey walk: ключ резолвится через 3 уровня parent-chain', () => {
      // Изолированный тест на полный обход цепи в Container.hasKey() и в get()'s
      // walk-up: регистрация на root, обращение из l3 (3 уровня parent links).
      const root = new Container().registerValue('depth', 0)
      const l1 = root.createScope()
      const l2 = l1.createScope()
      const l3 = l2.createScope()

      // .get() уходит вверх по 3 уровням и находит регистрацию на root
      expect(l3.get('depth')).toBe(0)
      // cradle проксирует через hasKey() → тоже walk-up
      expect(l3.cradle.depth).toBe(0)
      // Любой из промежуточных уровней даёт то же значение
      expect(l1.get('depth')).toBe(0)
      expect(l2.get('depth')).toBe(0)
    })
  })

  describe('lifetime leak guard', () => {
    it('singleton → scoped: throws', () => {
      const c = new Container()
        .registerClass('scoped', ConsoleLogger, [], 'scoped')
        .registerClass('singleton', Service, ['scoped'], 'singleton')

      expect(() => c.get('singleton')).toThrow(
        /Singleton "singleton" cannot depend on scoped "scoped"/,
      )
    })

    it('singleton → transient: throws', () => {
      const c = new Container()
        .registerClass('transient', ConsoleLogger, [], 'transient')
        .registerClass('singleton', Service, ['transient'], 'singleton')

      expect(() => c.get('singleton')).toThrow(
        /Singleton "singleton" cannot depend on transient "transient"/,
      )
    })

    it('scoped → scoped: OK (оба короткоживущие в одном scope)', () => {
      const c = new Container()
        .registerClass('a', ConsoleLogger, [], 'scoped')
        .registerClass('b', Service, ['a'], 'scoped')

      const scope = c.createScope()
      expect(() => scope.get('b')).not.toThrow()
    })

    it('scoped → transient: OK (серая зона, разрешено)', () => {
      const c = new Container()
        .registerClass('a', ConsoleLogger, [], 'transient')
        .registerClass('b', Service, ['a'], 'scoped')

      const scope = c.createScope()
      expect(() => scope.get('b')).not.toThrow()
    })

    it('после leak-ошибки finally корректно очищает singletonStack', () => {
      const c = new Container()
        .registerClass('scoped', ConsoleLogger, [], 'scoped')
        .registerClass('singleton', Service, ['scoped'], 'singleton')
        .registerValue('other', {ok: true})

      expect(() => c.get('singleton')).toThrow()
      // singletonStack должен быть очищен — последующий scoped-резолв в другом контейнере
      // в том же дереве не должен глючить (косвенно — доступность other)
      expect(c.get('other').ok).toBe(true)
    })
  })

  describe('Lazy injection', () => {
    it('lazy-обёртка не инстанцирует таргет до первого .get()', () => {
      let created = 0
      class DbClass extends TrackableAsync {
        constructor() {
          super()
          created++
        }
      }
      const c = new Container().registerClass('db', DbClass, [], 'singleton', true)

      const wrapper = c.get('dbLazy')
      expect(created).toBe(0) // wrapper получен, но инстанс не создан
      expect(wrapper).toHaveProperty('get')

      const real = wrapper.get()
      expect(created).toBe(1)
      expect(real).toBeInstanceOf(DbClass)
    })

    it('lazy.get() — идемпотентен: тот же singleton', () => {
      const c = new Container().registerClass('db', TrackableAsync, [], 'singleton', true)

      const wrapper = c.get('dbLazy')
      expect(wrapper.get()).toBe(wrapper.get())
      expect(wrapper.get()).toBe(c.get('db'))
    })

    it('lazy: true легализует инжекцию short-lived в singleton', () => {
      class Holder {
        constructor(public readonly leakyLazy: { readonly get: () => ConsoleLogger }) {}
      }
      const c = new Container()
        .registerClass('leaky', ConsoleLogger, [], 'scoped', true)
        .registerClass('holder', Holder, ['leakyLazy'], 'singleton')

      // Без lazy-эскейпа это упало бы: Singleton "holder" cannot depend on scoped "leaky".
      expect(() => c.get('holder')).not.toThrow()
    })

    // ────────── Captured scope: ключевой инвариант ─────────
    it('Lazy, полученный в scopeA, резолвит таргет через scopeA — даже если .get() вызван позже', () => {
      const root = new Container().registerClass('svc', ConsoleLogger, [], 'scoped', true)

      const a = root.createScope()
      const b = root.createScope()

      const lazyFromA = a.get('svcLazy')
      const lazyFromB = b.get('svcLazy')

      const instA = lazyFromA.get()
      const instB = lazyFromB.get()

      // 1. Каждая обёртка резолвит СВОЙ scope → разные инстансы
      expect(instA).not.toBe(instB)

      // 2. lazyFromA.get() возвращает тот же инстанс, что и a.get('svc')
      expect(instA).toBe(a.get('svc'))

      // 3. lazyFromA.get() НЕ совпадает с b.get('svc') — captured scope, не dynamic
      expect(instA).not.toBe(b.get('svc'))

      // 4. повторные .get() идемпотентны в рамках одного scope
      expect(lazyFromA.get()).toBe(instA)
    })

    it('Lazy.get() после dispose захваченного scope → throws "Container is disposed"', async () => {
      const root = new Container().registerClass('svc', ConsoleLogger, [], 'scoped', true)

      const scope = root.createScope()
      const wrapper = scope.get('svcLazy')
      await scope.dispose()

      expect(() => wrapper.get()).toThrow(/Container is disposed/)
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Sanity: накопление T при chaining + auto-Lazy
// ────────────────────────────────────────────────────────────────────────────
describe('fluent shape', () => {
  it('registerClass + registerFactory + registerValue в chain — компилируется и резолвится', () => {
    const c = new Container()
      .registerClass('logger', ConsoleLogger, [])
      .registerFactory('config', () => new AppConfig(8080))
      .registerClass('db', TrackableAsync, [], 'singleton', true)
      .registerClass('service', Service, ['logger'])

    expect(c.get('logger')).toBeInstanceOf(ConsoleLogger)
    expect(c.get('config').port).toBe(8080)
    expect(c.get('db')).toBeInstanceOf(TrackableAsync)
    expect(c.get('service').run()).toBe('ok')
    // auto-Lazy: dbLazy выводится автоматически без явного объявления
    expect(c.get('dbLazy').get()).toBe(c.get('db'))
  })
})

// ────────────────────────────────────────────────────────────────────────────
// .use() — runtime-тест (типовой контракт уже проверен в container.test-d.ts).
// Покрывает Container.use(): runtime-делегацию модуль-функции и накопление T.
// ────────────────────────────────────────────────────────────────────────────
describe('use() — runtime', () => {
  it('inline-функция получает контейнер и возвращает расширенный', () => {
    const c = new Container()
      .registerValue('base', 21)
      .use((inner) => inner.registerFactory('doubled', (ctx) => ctx.get('base') * 2))

    expect(c.get('base')).toBe(21)
    expect(c.get('doubled')).toBe(42)
  })

  it('use может читать конфиг и решать, что регистрировать (branching)', () => {
    type Mode = 'A' | 'B'
    const env: Mode = 'A'
    const c = new Container()
      .registerValue('mode', env)
      .use((inner) =>
        inner.get('mode') === 'A'
          ? inner.registerValue('out', 'alpha' as const)
          : inner.registerValue('out', 'beta' as const),
      )

    expect(c.get('out')).toBe('alpha')
  })
})

// Подавляем unused warnings для импортов, используемых только в type-тестах
void ({} as DependenciesMap)
