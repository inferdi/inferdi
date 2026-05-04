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

describe('Phase 3 — LIFO порядок', () => {
  it('регистрация A → B → C, dispose в порядке C → B → A', async () => {
    const log: string[] = []
    const container = new Container()
      .registerFactory('a', () => new OrderedDisposable('A', log))
      .registerFactory('b', () => new OrderedDisposable('B', log))
      .registerFactory('c', () => new OrderedDisposable('C', log))

    // Резолвим в порядке A → B → C
    container.get('a')
    container.get('b')
    container.get('c')

    await container.dispose()

    expect(log).toEqual(['C', 'B', 'A'])
  })
})

describe('Phase 3 — приоритет disposer-протоколов', () => {
  it('asyncDispose имеет приоритет над Symbol.dispose и плоским dispose', async () => {
    const inst = new TriProtocol()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
    expect(inst.symbolDisposeCalls).toBe(0)
    expect(inst.plainDisposeCalls).toBe(0)
  })

  it('без asyncDispose вызывается Symbol.dispose', async () => {
    const inst = new TrackableSync()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('без Symbol.* вызывается плоский .dispose()', async () => {
    const inst = new TrackablePlain()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })

  it('плоский async dispose() ожидается (awaited) в async dispose', async () => {
    const inst = new TrackableAsyncPlain()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()

    expect(inst.disposeCalls).toBe(1)
  })
})

describe('Phase 3 — агрегация ошибок', () => {
  it('1 упавший disposer — ошибка прокидывается как есть (не в AggregateError)', async () => {
    const c = new Container().registerFactory('a', () => new Throwing('boom'))
    c.get('a')

    await expect(c.dispose()).rejects.toThrow('boom')
    await expect(c.dispose()).resolves.toBeUndefined() // повторно — no-op
  })

  it('≥2 упавших disposer — AggregateError со всеми причинами; остальные закрываются', async () => {
    const okInst = new TrackableAsync()
    const c = new Container()
      .registerFactory('ok', () => okInst)
      .registerFactory('err1', () => new Throwing('boom-1'))
      .registerFactory('err2', () => new Throwing('boom-2'))

    // Резолвим в порядке ok, err1, err2 — dispose в обратном
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
    // ok-ресурс должен быть закрыт даже при падении других
    expect(okInst.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — duplicate dispose (Set дедупликация)', () => {
  it('shared инстанс под двумя ключами — dispose вызывается ровно ОДИН раз', async () => {
    const shared = new TrackableAsync()
    const c = new Container()
      .registerFactory('a', () => shared)
      .registerFactory('b', () => shared)

    c.get('a')
    c.get('b')

    await c.dispose()

    expect(shared.asyncDisposeCalls).toBe(1)
  })

  it('три ключа — всё ещё один dispose', async () => {
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

describe('Phase 3 — границы владения', () => {
  it('registerValue НЕ попадает в teardown (внешнее владение)', async () => {
    const external = new TrackableAsync()
    const c = new Container().registerValue('external', external)

    // Обращение — чтобы на всякий случай прогреть все пути
    c.get('external')

    await c.dispose()

    expect(external.asyncDisposeCalls).toBe(0)
  })

  it('transient инстансы не трекаются и не закрываются контейнером', async () => {
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

    // Ни один из трёх transient-инстансов не должен быть тронут
    for (const inst of created) {
      expect(inst.asyncDisposeCalls).toBe(0)
    }
  })

  it('scoped-инстанс с scope.dispose — закрывается', async () => {
    const root = new Container().registerClass('s', TrackableAsync, [], 'scoped')

    const scope = root.createScope()
    const inst = scope.get('s')

    await scope.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — scope hierarchy', () => {
  it('child.dispose() НЕ трогает ресурсы, созданные на parent/root', async () => {
    const root = new Container()
      .registerClass('rootSvc', TrackableAsync, [], 'singleton')
      .registerClass('scopedSvc', TrackableAsync, [], 'scoped')

    const rootInst = root.get('rootSvc')
    const child = root.createScope()
    const childScopedInst = child.get('scopedSvc')

    await child.dispose()

    expect(childScopedInst.asyncDisposeCalls).toBe(1) // child закрыл своего scoped
    expect(rootInst.asyncDisposeCalls).toBe(0) // root нетронут
  })

  it('parent.dispose() работает после ранее dispose-нутого child', async () => {
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

  it('parent.dispose() НЕ каскадирует в незакрытый child (документируем поведение)', async () => {
    const root = new Container().registerClass('scopedSvc', TrackableAsync, [], 'scoped')

    const child = root.createScope()
    const childInst = child.get('scopedSvc')

    await root.dispose()

    // Child остался валиден до своего собственного dispose
    expect(childInst.asyncDisposeCalls).toBe(0)
    expect(child.disposed).toBe(false)

    await child.dispose()
    expect(childInst.asyncDisposeCalls).toBe(1)
  })
})

describe('Phase 3 — идемпотентность и блокировка', () => {
  it('двойной dispose() — второй — no-op', async () => {
    const inst = new TrackableAsync()
    const c = new Container().registerFactory('r', () => inst)
    c.get('r')

    await c.dispose()
    await c.dispose()

    expect(inst.asyncDisposeCalls).toBe(1)
    expect(c.disposed).toBe(true)
  })

  it('get() после dispose — throws', async () => {
    const c = new Container().registerFactory('r', () => new TrackableAsync())
    await c.dispose()

    expect(() => c.get('r')).toThrow(/Container is disposed/)
  })

  it('createScope() после dispose — throws', async () => {
    const c = new Container().registerFactory('r', () => new TrackableAsync())
    await c.dispose()

    expect(() => c.createScope()).toThrow(/Cannot create scope from a disposed container/)
  })

  it('re-entrancy: disposer зовёт container.get — получает disposed, не зацикливается', async () => {
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
// Sync teardown через [Symbol.dispose]
// ────────────────────────────────────────────────────────────────────────────

describe('Phase 3 — sync [Symbol.dispose]', () => {
  // Контролируем unhandledRejection, чтобы подтвердить, что мы гасим промисы
  // от async-плоского .dispose() без flooding event loop'а.
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

  it('sync dispose вызывает только sync [Symbol.dispose] / плоский dispose', () => {
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
    expect(asyncOnly.asyncDisposeCalls).toBe(0) // async-only пропущен
  })

  it('ресурс только с asyncDispose — пропускается без ошибок', () => {
    const a = new TrackableAsync()
    const c = new Container().registerFactory('a', () => a)
    c.get('a')

    // Ни throw, ни попытки запуска Symbol.asyncDispose
    expect(() => c[Symbol.dispose]()).not.toThrow()
    expect(a.asyncDisposeCalls).toBe(0)
  })

  it('плоский async dispose() в sync-контексте — errors.push СИНХРОННО с сообщением про await using', () => {
    const r = new TrackableAsyncPlain()
    const c = new Container().registerFactory('r', () => r)
    c.get('r')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)
    // disposer всё-таки был вызван (он запустил промис) — счётчик увеличился
    expect(r.disposeCalls).toBe(1)
  })

  it('unhandledRejection от async-в-sync dispose — подавлен', async () => {
    // Ресурс, чей плоский dispose() возвращает rejected Promise.
    // Без .catch(() => {}) внутри Container'а — поймали бы unhandledRejection.
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

    // Подождём микротаски, чтобы промис точно разрешился. Ошибка должна быть
    // поймана внутренним .catch(() => {}) и НЕ попасть в process unhandledRejection.
    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))

    expect(rejections).toHaveLength(0)
  })

  it('смешанный сценарий: один sync ок + один sync-misuse → AggregateError не нужен (1 ошибка) либо простой throw', () => {
    const okSync = new TrackableSync()
    const asyncPlain = new TrackableAsyncPlain()

    const c = new Container()
      .registerFactory('ok', () => okSync)
      .registerFactory('bad', () => asyncPlain)
    c.get('ok')
    c.get('bad')

    expect(() => c[Symbol.dispose]()).toThrow(/await using/i)
    expect(okSync.disposeCalls).toBe(1) // sync ресурс всё равно закрылся
  })

  it('двойной [Symbol.dispose] — no-op', () => {
    const r = new TrackableSync()
    const c = new Container().registerFactory('r', () => r)
    c.get('r')

    c[Symbol.dispose]()
    c[Symbol.dispose]()

    expect(r.disposeCalls).toBe(1)
    expect(c.disposed).toBe(true)
  })

  it('один sync disposer бросает — ошибка прокидывается как есть (не AggregateError)', () => {
    // Sync-вариант исключения внутри [Symbol.dispose]: покрывает ветку
    // catch → errors.push в Container[Symbol.dispose].
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

  it('два sync disposer бросают — AggregateError со всеми причинами', () => {
    // Покрывает второй `if (errors.length > 1)` ветку и AggregateError-throw
    // в sync-варианте Container[Symbol.dispose].
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

describe('Phase 3 — TC39 using / await using', () => {
  it('await using корректно вызывает asyncDispose на выходе из блока', async () => {
    const inst = new TrackableAsync()
    const outer = new Container().registerFactory('r', () => inst)

    {
      await using scope = outer.createScope()
      // scope создаёт свой собственный scoped-инстанс (НЕ тот же, что outer)
      scope.get('r') // resolves через parent, singleton живёт на outer → не в owned scope
      // Явно проверим, что dispose на scope отработает, даже если своих owned нет
      void scope
    }
    // На этом этапе scope должен быть dispose-нут. Inst принадлежит outer — не закрыт.
    expect(inst.asyncDisposeCalls).toBe(0)

    await outer.dispose()
    expect(inst.asyncDisposeCalls).toBe(1)
  })
})
