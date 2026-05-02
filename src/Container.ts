export type Lazy<T> = { readonly get: () => T }
export type DependenciesMap = Record<string, unknown>

// Модуль DI — функция, которая принимает контейнер с накопленным набором ключей TIn,
// и возвращает контейнер, расширенный своими ключами TOut. Используется в Container.use():
// удобно группировать регистрации и читать ранее зарегистрированные значения,
// чтобы решить, что регистрировать дальше (см. пример в JSDoc к use()).
export type Module<TIn extends DependenciesMap, TOut extends DependenciesMap> =
  (c: Container<TIn>) => Container<TIn & TOut>

type RegistrationKind = 'singleton' | 'transient' | 'scoped'

interface Registration<T extends DependenciesMap, K extends keyof T> {
  readonly kind: RegistrationKind
  readonly fn: (container: Container<T>) => T[K]
  // Маркер lazy-обёртки. Lazy<T> регистрируется как transient, но внутри singleton
  // безопасен: fn НЕ вызывает c.get(key) немедленно, а возвращает замыкание { get },
  // которое отложит резолв до момента реального обращения. Инстанс не захватывается.
  // ВНИМАНИЕ: если когда-нибудь будешь менять реализацию lazy — сохрани этот инвариант,
  // иначе проверка lifetime ниже начнёт пропускать настоящие утечки.
  readonly lazy?: boolean
}

// Проецирует типы параметров конструктора в допустимые ключи DI-карты.
// Не даёт передать в deps ключ, значение которого не присваиваемо нужному аргументу.
type DepsOf<T extends DependenciesMap, A extends readonly unknown[]> = {
  readonly [I in keyof A]: { [K in keyof T]: T[K] extends A[I] ? K : never }[keyof T]
}

// Инстансы, которые контейнер умеет закрывать при dispose.
// Порядок попыток: Symbol.asyncDispose → Symbol.dispose → плоский .dispose().
interface DisposableLike {
  [Symbol.dispose]?: () => void
  [Symbol.asyncDispose]?: () => PromiseLike<void>
  dispose?: () => void | PromiseLike<void>
}

export class Container<T extends DependenciesMap = {}> {

  private readonly regs = new Map<keyof T, Registration<T, any>>()
  private readonly cache = new Map<keyof T, unknown>()
  // Очередь для Teardown. Сюда попадают ТОЛЬКО инстансы, созданные этим контейнером
  // (не registerValue — внешнее владение; не transient — владеет вызывающий код).
  // Set защищает от двойного dispose, когда один и тот же инстанс регистрируется под
  // разными ключами (registerFactory('a', () => shared); registerFactory('b', () => shared)).
  // Set сохраняет порядок вставки — на dispose итерируем в обратную сторону для LIFO.
  private readonly owned = new Set<unknown>()
  // resolving и singletonStack общие на всё дерево — дети наследуют ссылки от родителя.
  // resolving ловит циклы, singletonStack — попытку синглтона взять scoped-зависимость.
  // Отдельное поле `root` не нужно: эти две коллекции и так расшариваются по цепочке.
  //
  // ИНВАРИАНТ: get() ДОЛЖЕН оставаться синхронным. resolving работает как точная
  // проекция call-stack'а только потому, что один get() выполняется атомарно до
  // возврата в event loop. Если когда-нибудь добавишь async-фабрики и сделаешь
  // get() async — параллельные resolve'ы (разные HTTP-запросы) начнут одновременно
  // мутировать общий resolving Set / singletonStack, ловя ложные циклы и ложные
  // lifetime-violations. Async-фабрики требуют либо per-resolve локального
  // resolving (не shared), либо отдельного двухфазного API (resolveAsync поверх
  // sync get'а с pre-warming'ом).
  private readonly resolving: Set<keyof T>
  private readonly singletonStack: (keyof T)[]
  private _cradle?: T
  private _disposed = false

  // parent НЕ readonly: dispose обнуляет ссылку, чтобы dispose-нутый child не удерживал
  // живой root через цепочку. Иначе сохранённая где-нибудь ссылка на disposed-scope
  // блокирует GC root'а со всеми его кэшами и зарегистрированными фабриками.
  public constructor(private parent?: Container<T>) {
    this.resolving = parent ? parent.resolving : new Set()
    this.singletonStack = parent ? parent.singletonStack : []
  }

  // Walk-up по цепочке скоупов: есть ли у нас (или у любого предка) этот ключ?
  // Используется cradle Proxy, чтобы НЕ бросать на пробах протокола ('then', 'toJSON',
  // и прочих стандартных property-доступах). Без этой проверки Promise.resolve(cradle)
  // или await cradle прорастал бы в this.get('then') и крашил приложение.
  private hasKey(key: keyof T): boolean {
    if (this.cache.has(key)) {
      return true
    }
    let owner: Container<T> | undefined = this
    while (owner !== undefined) {
      if (owner.regs.has(key)) {
        return true
      }
      owner = owner.parent
    }
    return false
  }

  // Внутренний cast для fluent-сужения T. Реальный инстанс не меняется,
  // меняется только взгляд на T. Безопасно благодаря Exclude<K, keyof T>
  // в input-позиции key — повторная регистрация запрещена компилятором,
  // поэтому widening типа всегда добавляет НОВЫЙ ключ.
  private as<U extends DependenciesMap>(): Container<U> {
    return this as unknown as Container<U>
  }

  /**
   * Регистрирует класс по ключу. Возвращает контейнер, в типе которого уже есть
   * пара `[K, V]`. При `lazy: true` дополнительно регистрируется ключ `${K}Lazy`
   * с типом `Lazy<V>` — пользователь его явно не объявляет, тип выводится сам.
   */
  public registerClass<
    K extends string,
    V,
    A extends readonly unknown[],
    L extends boolean = false,
  >(
    key: Exclude<K, keyof T>,
    Ctor: new (...args: A) => V,
    deps: DepsOf<T, A>,
    kind: RegistrationKind = 'singleton',
    lazy?: L,
  ): Container<
    T
    & Record<K, V>
    & (L extends true ? Record<`${K}Lazy`, Lazy<V>> : {})
  > {
    // Сохраняем ссылку на исходный массив — в DI-идиоме deps передаются литералом и не
    // мутируются после регистрации. Экономим одну аллокацию на каждую registerClass.
    const keys = deps as readonly (keyof T)[]
    const len = keys.length

    // Arity unrolling. V8 JIT'ит прямой `new Ctor(a, b)` с inline-кэшем формы Ctor;
    // Reflect.construct идёт через runtime-стаб, ArrayLike-итерацию и не inline'ится.
    // Покрываем 0..4 аргументов прямыми вызовами — это ≥95% реальных классов в DI.
    // Хвост (5+) уходит в общий путь через Reflect.construct, сохраняя type-safety
    // (Reflect.construct типизирован через ArrayLike, без unsound-каста args as unknown as A).
    //
    // Дополнительно для 0-арного пути экономим аллокацию: ни массива, ни замыкания над keys.
    let fn: (c: Container<T>) => V

    if (len === 0) {
      fn = () => new (Ctor as unknown as new () => V)()
    } else if (len === 1) {
      const k0 = keys[0]
      fn = (c) => new (Ctor as unknown as new (a0: unknown) => V)(c.get(k0))
    } else if (len === 2) {
      const k0 = keys[0], k1 = keys[1]
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown) => V)(
        c.get(k0), c.get(k1),
      )
    } else if (len === 3) {
      const k0 = keys[0], k1 = keys[1], k2 = keys[2]
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2),
      )
    } else if (len === 4) {
      const k0 = keys[0], k1 = keys[1], k2 = keys[2], k3 = keys[3]
      fn = (c) => new (Ctor as unknown as new (a0: unknown, a1: unknown, a2: unknown, a3: unknown) => V)(
        c.get(k0), c.get(k1), c.get(k2), c.get(k3),
      )
    } else {
      // Хвост: 5+ deps. Стартуем с пустого массива и push'аем — так V8 держит массив
      // в PACKED_ELEMENTS kind. `new Array(len)` + `args[i] = ...` создал бы HOLEY-массив,
      // которого V8 транзишит в PACKED только после полного заполнения, а Reflect.construct
      // на промежуточном HOLEY работает чуть медленнее.
      fn = (c) => {
        const args: unknown[] = []

        for (let i = 0; i < len; i++) {
          args.push(c.get(keys[i]))
        }

        return Reflect.construct(Ctor, args)
      }
    }

    this.regs.set(key as unknown as keyof T, {kind, fn} as Registration<T, any>)

    // Lazy-алиас: тонкая обёртка { get } поверх эагерного ключа. Сам инстанс не создаётся,
    // пока потребитель не вызовет .get(). Обёртка transient — берёт тот container, в котором
    // её запросили, чтобы корректно работали scoped-таргеты.
    //
    // ИНВАРИАНТ: fn НЕ должен вызывать c.get(key) синхронно — только вернуть замыкание.
    // Этот факт делает lazy-обёртку безопасной для инжекции в singleton и обосновывает
    // флаг `lazy: true`, который исключает её из lifetime-проверки в get().
    // Если эту реализацию "упростить" до прямого c.get(key) — поломается защита от утечек
    // короткоживущих зависимостей в долгоживущие.
    //
    // NOTE (captured scope): `c` захватывается в момент РЕЗОЛВА lazy-обёртки, а не в момент
    // вызова .get(). Если сохранить обёртку и вызвать .get() позже из другого контекста —
    // резолв всё равно пойдёт через изначальный контейнер. Это предсказуемо, но это
    // "captured scope", а не "dynamic scope" — не путать.
    //
    // ⚠️ ЛОВУШКА: Lazy<Scoped>, инжектированный в Singleton.
    // Когда singleton живёт на root и резолвит свою lazy-зависимость, обёртка захватывает
    // c = root. При первом wrapper.get() scoped-инстанс кэшируется на root и фактически
    // становится singleton'ом — все последующие .get() из любого scope вернут тот же инстанс.
    // То есть Lazy<T> легализует инжекцию по lifetime-проверке, но НЕ делает scoped реально
    // scoped'ом, если он используется так. Корректно lazy<scoped> работает только тогда,
    // когда обёртку получают в нужном scope (scoped-сервис → Lazy<otherScoped> в том же scope).
    // Для request-scoped значений в singleton'ах единственное верное решение —
    // AsyncLocalStorage; DI-контейнер с captured scope не способен решить это сам.
    // Для transient ловушки нет: transient не кэшируется, каждый .get() создаёт новый инстанс.
    if (lazy) {
      const lazyKey = `${key as string}Lazy` as keyof T
      const targetKey = key as unknown as keyof T
      this.regs.set(lazyKey, {
        kind: 'transient',
        lazy: true,
        fn: (c) => ({get: () => c.get(targetKey)} as T[keyof T]),
      })
    }

    return this.as()
  }

  /**
   * Регистрирует фабрику по ключу. Тип V выводится из возвращаемого значения фабрики
   * и автоматически добавляется в карту контейнера.
   */
  public registerFactory<K extends string, V>(
    key: Exclude<K, keyof T>,
    factory: (c: Container<T>) => V,
    kind: RegistrationKind = 'singleton',
  ): Container<T & Record<K, V>> {
    this.regs.set(
      key as unknown as keyof T,
      {kind, fn: factory as (c: Container<T>) => any},
    )
    return this.as()
  }

  /**
   * Регистрирует готовое значение. Контейнер не считает это значение своим
   * (не вызывает dispose) — внешнее владение.
   */
  public registerValue<K extends string, V>(
    key: Exclude<K, keyof T>,
    value: V,
  ): Container<T & Record<K, V>> {
    // Значение внешнее — в owned не попадает, dispose не вызывается.
    this.cache.set(key as unknown as keyof T, value)
    this.regs.set(
      key as unknown as keyof T,
      {kind: 'singleton', fn: () => value as any},
    )
    return this.as()
  }

  /**
   * Применяет модуль регистрации поверх текущего контейнера. Возвращает контейнер,
   * расширенный ключами модуля. Полезно когда нужно прочитать уже зарегистрированное
   * значение, чтобы решить, что регистрировать дальше:
   *
   *   const c = new Container()
   *     .registerValue('config', { port: 8080 })
   *     .use((c) => {
   *       const port = c.get('config').port
   *       return port === 8080 ? c.registerClass('a', A, []) : c.registerClass('b', B, [])
   *     })
   */
  public use<R extends DependenciesMap>(fn: Module<T, R>): Container<T & R> {
    return fn(this) as unknown as Container<T & R>
  }

  public createScope(): Container<T> {
    if (this._disposed) {
      throw new Error('Cannot create scope from a disposed container')
    }
    return new Container<T>(this)
  }

  public get<K extends keyof T>(key: K): T[K] {
    if (this._disposed) {
      throw new Error(`Container is disposed (key: "${String(key)}")`)
    }

    // 1. Локальный кэш (singleton на root / уже созданный scoped в текущем скоупе).
    //    Быстрый путь без повторного lookup, если значение не undefined.
    const cached = this.cache.get(key) as T[K] | undefined

    if (cached !== undefined || this.cache.has(key)) {
      return cached as T[K]
    }

    // 2. Ищем регистрацию вверх по цепочке скоупов (любой глубины).
    let owner: Container<T> | undefined = this
    let reg: Registration<T, K> | undefined

    while (owner !== undefined) {
      reg = owner.regs.get(key) as Registration<T, K> | undefined

      if (reg !== undefined) {
        break
      }

      owner = owner.parent
    }

    if (reg === undefined) {
      throw new Error(`Key "${String(key)}" not found`)
    }

    // 3. Короткоживущая зависимость внутри синглтона — утечка lifetime:
    // scoped-инстанс "сбежал" бы в долгоживущий кэш, transient заморозился бы в поле и
    // потерял контракт "свежий на каждый запрос". Для осознанных случаев — Lazy<T>
    // (lazy-обёртка сама помечена reg.lazy и исключена из проверки).
    if (!reg.lazy && (reg.kind === 'scoped' || reg.kind === 'transient') && this.singletonStack.length > 0) {
      const parent = this.singletonStack[this.singletonStack.length - 1]
      throw new Error(
        `Singleton "${String(parent)}" cannot depend on ${reg.kind} "${String(key)}". ` +
        `Use Lazy<T> (register with lazy: true) to get a fresh instance per access.`,
      )
    }

    // 4. Singleton живёт на том контейнере, где был зарегистрирован (owner), а не всегда на root.
    // Это позволяет корректно работать singleton'ам, зарегистрированным в child-скоупах.
    //
    // NOTE: после делегирования создание идёт с this = owner, то есть ВСЕ зависимости синглтона
    // резолвятся из owner'а, а не из scope, откуда был вызов. Это безопасно благодаря проверке
    // lifetime выше: короткоживущие зависимости уже отсечены, а singleton/singleton-цепочка
    // корректно живёт на owner.
    if (reg.kind === 'singleton' && this !== owner) {
      return (owner as Container<T>).get(key)
    }

    // 5. Детекция циклических зависимостей. Set общий на дерево, путь очищается в finally.
    if (this.resolving.has(key)) {
      const chain = [...this.resolving, key].map((k) => String(k)).join(' -> ')
      throw new Error(
        `Circular dependency detected: ${chain}. ` +
        `Consider breaking the cycle with Lazy<T> (register one side with lazy: true ` +
        `and inject the '${chain.split(' -> ').pop()}Lazy' key instead).`,
      )
    }

    this.resolving.add(key)

    if (reg.kind === 'singleton') {
      this.singletonStack.push(key)
    }
    try {
      const instance = reg.fn(this)

      // Teardown-трекинг: кэшируемые инстансы (singleton/scoped), созданные ЭТИМ контейнером.
      // Transient владеется вызывающим кодом — иначе контейнер протекает памятью.
      // Lazy-обёртка тоже transient и не трекается: ресурс закроется по реальному ключу.
      if (reg.kind !== 'transient') {
        this.cache.set(key, instance)
        this.owned.add(instance)
      }
      return instance
    } finally {
      this.resolving.delete(key)

      if (reg.kind === 'singleton') {
        this.singletonStack.pop()
      }
    }
  }

  get cradle(): T {
    // Сразу бросаем на disposed-контейнере. Без этой проверки cradle создал бы новый
    // Proxy после dispose (потому что _cradle был очищен), и пользователь увидел бы
    // ошибку только при обращении к ключу — на ход глубже, чем ожидается.
    if (this._disposed) {
      throw new Error('Container is disposed (cradle access)')
    }
    // Cradle — soft-режим доступа (в отличие от .get()):
    // 1) Symbols отсекаем — это протокольные пробы (Symbol.toPrimitive, Symbol.iterator,
    //    nodejs.util.inspect.custom). Возвращаем undefined.
    // 2) Незарегистрированные строковые ключи тоже возвращаем undefined, а не бросаем.
    //    Иначе Promise.resolve(cradle) / await cradle / console.log / любая Thenable-проверка
    //    дёргает Get('then') и крашит приложение неожиданным "Key 'then' not found".
    //    Если нужна жёсткая ошибка на отсутствующий ключ — есть c.get(key), он по-прежнему
    //    бросает Key not found.
    return this._cradle ??= new Proxy({} as T, {
      get: (_, p) => {
        if (typeof p === 'symbol') {
          return undefined
        }
        const key = p as keyof T
        return this.hasKey(key) ? this.get(key) : undefined
      },
    })
  }

  public get disposed(): boolean {
    return this._disposed
  }

  /**
   * Асинхронный teardown. Идёт по созданным инстансам в обратном порядке (LIFO),
   * пробует Symbol.asyncDispose → Symbol.dispose → плоский .dispose().
   * Ошибки не прерывают цепочку — собираются и выбрасываются AggregateError'ом
   * в конце, чтобы падение одного ресурса не оставило остальные незакрытыми.
   * Повторный вызов — no-op (идемпотентность).
   */
  public async dispose(): Promise<void> {
    if (this._disposed) {
      return
    }

    this._disposed = true

    // Снапшот в LIFO-порядке. Set не индексируется, но сохраняет порядок вставки.
    const instances = [...this.owned].reverse() as readonly (DisposableLike | null | undefined)[]

    // Очищаем стейт ДО вызова disposer'ов: re-entrancy safety (если disposer
    // попытается что-то резолвить — уже получит disposed), плюс отпускаем
    // замыкания фабрик, держащие Ctor/deps/factory и родительские объекты.
    this.owned.clear()
    this.cache.clear()
    this.regs.clear()
    this._cradle = undefined
    // Отвязываем родителя: иначе сохранённая снаружи ссылка на dispose-нутый scope
    // удержит весь parent-цепочку (root + все его кэши/фабрики) от GC.
    this.parent = undefined

    const errors: unknown[] = []

    for (const inst of instances) {
      if (inst == null) {
        continue
      }

      try {
        if (typeof inst[Symbol.asyncDispose] === 'function') {
          await inst[Symbol.asyncDispose]!()
        } else if (typeof inst[Symbol.dispose] === 'function') {
          inst[Symbol.dispose]!()
        } else if (typeof inst.dispose === 'function') {
          await inst.dispose()
        }
      } catch (err) {
        errors.push(err)
      }
    }

    if (errors.length === 1) {
      throw errors[0]
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, 'Container.dispose: multiple teardown errors')
    }
  }

  public [Symbol.asyncDispose](): Promise<void> {
    return this.dispose()
  }

  /**
   * Синхронный teardown (для `using`). Вызывает только синхронные disposer'ы.
   * Инстансы с ТОЛЬКО Symbol.asyncDispose пропускаются — для них нужен `await using`.
   * Плоский .dispose() запускается; если вернул Promise — rejection перехватывается
   * (иначе будет unhandledRejection), но не ожидается.
   */
  public [Symbol.dispose](): void {
    if (this._disposed) {
      return
    }

    this._disposed = true

    const instances = [...this.owned].reverse() as readonly (DisposableLike | null | undefined)[]

    this.owned.clear()
    this.cache.clear()
    this.regs.clear()
    this._cradle = undefined
    // Отвязываем родителя: иначе сохранённая снаружи ссылка на dispose-нутый scope
    // удержит весь parent-цепочку (root + все его кэши/фабрики) от GC.
    this.parent = undefined

    const errors: unknown[] = []

    for (const inst of instances) {
      if (inst == null) {
        continue
      }

      try {
        if (typeof inst[Symbol.dispose] === 'function') {
          inst[Symbol.dispose]!()
        } else if (typeof inst.dispose === 'function') {
          const r = inst.dispose()

          // Если плоский .dispose() оказался async в sync-контексте — это мисюз ресурса
          // (ему нужен `await using` / container.dispose()). Детектируем СИНХРОННО:
          // .catch уходит в микротаски и выполнится уже после возврата из этого метода,
          // так что туда errors.push делать нельзя — ошибку потеряет сам throw ниже.
          // Фиксируем факт мисюза прямо сейчас, а отдельным .catch(() => void) гасим
          // unhandledRejection от возвращённого промиса.
          // r != null покрывает и undefined, и null (typeof null === 'object').
          // Duck-typing .then'а ловит любую thenable — не привязываемся к глобальному Promise,
          // на случай polyfill'ов и кастомных PromiseLike.
          if (r != null && typeof (r as { then?: unknown }).then === 'function') {
            errors.push(new Error(
              `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise. ` +
              `Use \`await using\` / container.dispose() for async teardown.`,
            ))
            void Promise.resolve(r).catch(() => { /* noop: ошибка уже зафиксирована выше */ })
          }
        }
      } catch (err) {
        errors.push(err)
      }
    }

    if (errors.length === 1) {
      throw errors[0]
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, 'Container[Symbol.dispose]: multiple teardown errors')
    }
  }

}

// Declaration merging — добавляем helper-тип к классу как пространство имён.
// Используется как `Container.Resolve<typeof container>` для извлечения карты T
// из готового fluent-собранного контейнера.
export namespace Container {
  export type Resolve<C> = C extends Container<infer U> ? U : never
}
