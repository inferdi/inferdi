import {describe, it, expect} from 'vitest'
import {Container} from '../src/Container'
import {hasGc, waitForGC} from './helpers'

// ────────────────────────────────────────────────────────────────────────────
// Phase 5 — Memory / GC
//
// Нужен Node с флагом --expose-gc. В vitest.config.ts мы пробрасываем его
// через execArgv. В окружениях без gc тесты скипаются через describe.skipIf.
//
// ВАЖНО про V8-ловушки (эмпирически проверено):
// 1. Аллокация ОБЯЗАНА быть в ОТДЕЛЬНОЙ async function (не inline IIFE)
//    — V8 inline'ит лямбды и удерживает их scope до конца вызывающей функции.
// 2. ПЕРЕД первым gc() нужно несколько await setTimeout(0), чтобы V8 сбросил
//    stack frames вызванной async function. Эту логику инкапсулирует waitForGC.
// 3. gc() вызываем с {type:'major', execution:'sync'} (Node 20+), дважды.
// ────────────────────────────────────────────────────────────────────────────

// Отдельная функция (не IIFE!) — её scope гарантированно уходит из стека после return.
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

// Замыкание фабрики захватывает heavy. После dispose regs.clear() должен оборвать
// ссылку на замыкание — и heavy станет доступен GC.
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
    // Гарантированно захватываем heavy в замыкании.
    void heavy.payload.length
    return new Wrapper({ok: true})
  })

  c.get('w')
  await c.dispose()
  return weak
}

// _cradle устанавливается в undefined при dispose. Proxy должен стать unreferenced.
async function allocateCradleAndDispose(): Promise<WeakRef<object>> {
  class Svc {
    public payload = new Array(1000).fill(0)
  }

  const c = new Container().registerClass('svc', Svc, [])
  const cradleWeak = new WeakRef(c.cradle)
  await c.dispose()
  return cradleWeak
}

describe.skipIf(!hasGc)('Phase 5 — утечки памяти', () => {
  it('singleton-инстанс отпускается после dispose (WeakRef.deref() → undefined)', async () => {
    const ref = await allocateSingletonAndDispose()
    expect(await waitForGC(ref)).toBe(true)
  })

  it('замыкание registerFactory отпускается после dispose (regs.clear реально работает)', async () => {
    const ref = await allocateFactoryClosureAndDispose()
    expect(await waitForGC(ref)).toBe(true)
  })

  it('cradle Proxy отпускается после dispose (_cradle = undefined)', async () => {
    const ref = await allocateCradleAndDispose()
    expect(await waitForGC(ref)).toBe(true)
  })

  it('scoped-инстанс из child отпускается после child.dispose (parent жив)', async () => {
    class Leaf {
      public payload = new Array(1000).fill(0)
    }

    // root живёт за пределами всех последующих функций — намеренно удерживаем.
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

    // Root остался жив, продолжает работать.
    const another = root.createScope()
    expect(another.get('leaf')).toBeInstanceOf(Leaf)
    await another.dispose()
    await root.dispose()
  })

  // dispose-нутый scope, удерживаемый снаружи, НЕ должен блокировать GC своего parent'а.
  // Без обнуления this.parent в dispose() сохранённая ссылка на disposed-child
  // удерживала бы root со всеми его кэшами и регистрациями — типичная утечка.
  it('disposed-child не удерживает root через parent-ссылку', async () => {
    class HeavyRoot {
      public payload = new Array(2000).fill(0)
    }

    async function buildAndDisposeChild(): Promise<{
      childRef: object
      rootWeak: WeakRef<object>
    }> {
      const root = new Container().registerClass('heavy', HeavyRoot, [], 'singleton')
      const heavy = root.get('heavy') // Удерживается на root через owned + cache.
      void heavy
      const rootWeak = new WeakRef(root)

      const child = root.createScope()
      await child.dispose()
      // Возвращаем child наружу — имитируем утечку ссылки на disposed-scope.
      // Сам root в области видимости функции более не имеет имени и должен
      // стать GC-достижимым ТОЛЬКО через child.parent — если оно не очищено.
      return {childRef: child, rootWeak}
    }

    const {childRef, rootWeak} = await buildAndDisposeChild()
    // Удерживаем childRef живым до GC-проверки, чтобы тест проверял именно отсутствие
    // parent-ссылки, а не общий GC всего поддерева.
    void childRef

    expect(await waitForGC(rootWeak)).toBe(true)
    // childRef всё ещё в области видимости — но root уже собран, потому что
    // child.parent был обнулён при dispose.
    void childRef
  })
})
