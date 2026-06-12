# Быстрый старт

Граф зависимостей строится через fluent API, а TypeScript проверяет его по ходу: каждый кортеж зависимостей сопоставляется с параметрами конструктора, поэтому перепутанный или пропущенный аргумент становится ошибкой компиляции, а не сюрпризом во время выполнения. Здесь нет декораторов `@Injectable()` и `reflect-metadata` - связывание описано обычным кодом, который понимает компилятор.

```ts
import { Container } from '@inferdi/inferdi'

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`)
  }
}

class UserRepo {
  constructor(
    private readonly logger: Logger,
    private readonly dsn: string,
  ) {}

  find(id: string) {
    this.logger.log(`Finding ${id} in ${this.dsn}`)
  }
}

const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('logger', Logger, [])
  .registerClass('userRepo', UserRepo, ['logger', 'dsn'])

container.get('userRepo').find('42')
```

`registerClass('userRepo', UserRepo, ['logger', 'dsn'])` проверяется позиционно. Если заменить кортеж на `['dsn', 'logger']`, TypeScript покажет ошибку до запуска приложения.

## Получение значения

Для получения значения используйте `.get(key)`:

```ts
const repo = container.get('userRepo')
```

Ключ должен быть зарегистрирован в типе контейнера. Неизвестный статический ключ даёт ошибку компиляции. Динамические ключи сначала проверяйте через `.has(key)`.

## Время жизни

По умолчанию регистрации имеют время жизни `singleton`. Для классов оно передаётся четвёртым аргументом, для фабрик - третьим.

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| Вид | Создание | Кеш | Очистка |
| --- | --- | --- | --- |
| `singleton` | один раз на контейнер-владелец | да | да |
| `scoped` | один раз на scope | да | да |
| `transient` | при каждом вызове `.get()` | нет | нет |

Singleton не может напрямую зависеть от `scoped` или `transient` сервиса. Это правило проверяется типами и runtime-защитой в strict mode.
