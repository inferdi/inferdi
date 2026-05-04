import {describe, it, expectTypeOf} from 'vitest'
import {Container, type Lazy} from '../src/Container'

// ────────────────────────────────────────────────────────────────────────────
// Phase 4 — Type-level tests (fluent API)
//
// Запускается через `npm run test:types` (vitest --typecheck).
// Vitest ловит @ts-expect-error: если в помеченной строке TS ошибки НЕТ —
// тест падает. Значит, эти комментарии одновременно проверяют негативные
// кейсы (должно не компилиться) и позитивные (должно компилиться).
// ────────────────────────────────────────────────────────────────────────────

interface Logger {
  log(msg: string): void
}
interface UserRepo {
  find(id: string): {id: string}
}
interface UserService {
  run(): string
}

class L implements Logger {
  log(_m: string) {}
}
class UserRepoImpl implements UserRepo {
  find(_id: string) {
    return {id: 'x'}
  }
}
class UserServiceImpl implements UserService {
  constructor(private readonly repo: UserRepo, private readonly logger: Logger) {}
  run() {
    this.logger.log('run')
    return this.repo.find('x').id
  }
}

describe('Phase 4 — fluent: накопление T при chaining', () => {
  it('каждый register* сужает тип контейнера', () => {
    const c = new Container()
      .registerValue('config', {port: 8080})
      .registerClass('logger', L, [])

    expectTypeOf(c.cradle.config).toEqualTypeOf<{port: number}>()
    expectTypeOf(c.cradle.logger).toEqualTypeOf<L>()
    expectTypeOf(c.get('config')).toEqualTypeOf<{port: number}>()
    expectTypeOf(c.get('logger')).toEqualTypeOf<L>()
  })

  it('use() прокидывает накопленный T внутрь и наружу', () => {
    const c = new Container()
      .registerValue('a', 1 as const)
      .use((inner) => {
        expectTypeOf(inner.get('a')).toEqualTypeOf<1>()
        return inner.registerValue('b', 'x' as const)
      })

    expectTypeOf(c.get('a')).toEqualTypeOf<1>()
    expectTypeOf(c.get('b')).toEqualTypeOf<'x'>()
  })
})

describe('Phase 4 — Container.Resolve', () => {
  it('извлекает накопленный T из готового контейнера', () => {
    const c = new Container()
      .registerValue('a', 1)
      .registerClass('logger', L, [])
    type Deps = Container.Resolve<typeof c>

    expectTypeOf<Deps['a']>().toEqualTypeOf<number>()
    expectTypeOf<Deps['logger']>().toEqualTypeOf<L>()
  })
})

describe('Phase 4 — cradle type safety', () => {
  it('обращение к неизвестному ключу через cradle — TS ошибка', () => {
    const c = new Container().registerClass('logger', L, [])

    // @ts-expect-error — unknownKey не в карте, Proxy не должен ломать типизацию
    c.cradle.unknownKey
  })

  it('get() с неизвестным ключом — TS ошибка', () => {
    const c = new Container().registerClass('logger', L, [])

    // @ts-expect-error — get требует точно keyof T
    c.get('unknownKey')
  })
})

describe('Phase 4 — DepsOf валидация', () => {
  it('правильный порядок и типы deps — компилируется', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])
    // Корректный порядок: [UserRepo, Logger] ↔ ['userRepo', 'logger']
    c.registerClass('userService', UserServiceImpl, ['userRepo', 'logger'])
  })

  it('неверный порядок — TS ошибка', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — порядок перепутан: первый параметр UserRepo, но передано 'logger'
    c.registerClass('userService', UserServiceImpl, ['logger', 'userRepo'])
  })

  it('недостаточно элементов — TS ошибка', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — не хватает второго ключа
    c.registerClass('userService', UserServiceImpl, ['userRepo'])
  })

  it('лишний элемент — TS ошибка', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — лишний 'logger' (конструктор UserServiceImpl берёт только 2 аргумента)
    c.registerClass('userService', UserServiceImpl, ['userRepo', 'logger', 'logger'])
  })

  it('несуществующий ключ в deps — TS ошибка', () => {
    const c = new Container()
      .registerClass('logger', L, [])
      .registerClass('userRepo', UserRepoImpl, [])

    // @ts-expect-error — 'nonExistent' не зарегистрирован
    c.registerClass('userService', UserServiceImpl, ['userRepo', 'nonExistent'])
  })
})

describe('Phase 4 — duplicate key guard', () => {
  it('повторная регистрация одного и того же ключа — TS ошибка', () => {
    const c = new Container().registerValue('x', 1)

    // @ts-expect-error — 'x' уже зарегистрирован, Exclude<K, keyof T> = never
    c.registerValue('x', 2)
  })

  it('дубликат через registerClass — тоже TS ошибка', () => {
    const c = new Container().registerClass('logger', L, [])

    // @ts-expect-error — 'logger' уже зарегистрирован
    c.registerClass('logger', L, [])
  })

  it('дубликат через registerFactory — тоже TS ошибка', () => {
    const c = new Container().registerValue('config', {port: 8080})

    // @ts-expect-error — 'config' уже зарегистрирован
    c.registerFactory('config', () => ({port: 9000}))
  })

  it('lazy-ключ ${K}Lazy после auto-генерации тоже считается занятым', () => {
    const c = new Container().registerClass('foo', L, [], 'singleton', true)

    // @ts-expect-error — fooLazy уже добавлен auto-Lazy
    c.registerValue('fooLazy', {get: () => new L()})
  })
})

describe('Phase 4 — auto-Lazy', () => {
  it('lazy: true автоматически добавляет ${K}Lazy: Lazy<V>', () => {
    const c = new Container().registerClass('foo', L, [], 'singleton', true)

    expectTypeOf(c.cradle.fooLazy).toEqualTypeOf<Lazy<L>>()
    expectTypeOf(c.get('fooLazy')).toEqualTypeOf<Lazy<L>>()
  })

  it('lazy: false НЕ добавляет lazy-ключ', () => {
    const c = new Container().registerClass('foo', L, [], 'singleton', false)

    // @ts-expect-error — без lazy:true ключа fooLazy в карте нет
    c.cradle.fooLazy
  })

  it('без аргумента lazy — поведение как при lazy: false', () => {
    const c = new Container().registerClass('foo', L, [])

    // @ts-expect-error — fooLazy не должен быть выведен
    c.cradle.fooLazy
  })
})

describe('Phase 4 — документированное ограничение: ambiguous deps', () => {
  it('два ключа с одинаковой структурой типа — TS не различает их (by design)', () => {
    // Это ограничение, а не баг: DepsOf использует structural assignability,
    // и если два сервиса имеют один и тот же runtime-тип, TS разрешит любой из них
    // в любой позиции. Решается branding (см. di-stydy.md).

    class Holder {
      constructor(public readonly master: Logger, public readonly slave: Logger) {}
    }

    const c = new Container()
      .registerClass('master', L, [])
      .registerClass('slave', L, [])

    // НЕ @ts-expect-error — TS пропускает, хоть порядок и "логически" перепутан.
    // Это документированное ограничение.
    c.registerClass('holder', Holder, ['slave', 'master'])
  })
})

describe('Phase 4 — Lazy тип-выводы', () => {
  it('Lazy<T>.get() возвращает T', () => {
    const wrapper: Lazy<Logger> = {get: () => ({log: () => {}} as Logger)}
    expectTypeOf(wrapper.get()).toEqualTypeOf<Logger>()
  })
})

describe('Phase 4 — dispose types', () => {
  it('dispose() возвращает Promise<void>', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c.dispose()).toEqualTypeOf<Promise<void>>()
  })

  it('disposed — readonly boolean', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c.disposed).toEqualTypeOf<boolean>()
  })

  it('[Symbol.asyncDispose] — () => Promise<void>', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c[Symbol.asyncDispose]).returns.toEqualTypeOf<Promise<void>>()
  })

  it('[Symbol.dispose] — () => void', () => {
    const c = new Container().registerClass('r', L, [])
    expectTypeOf(c[Symbol.dispose]).returns.toEqualTypeOf<void>()
  })
})
