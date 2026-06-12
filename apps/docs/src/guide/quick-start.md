# Quick Start

You build the dependency graph through a fluent API, and TypeScript checks it as you go: every dependency tuple is matched against the target's constructor positions, so a swapped or missing argument is a compile error, not a runtime surprise. There are no `@Injectable()` decorators and no `reflect-metadata` — the wiring is plain code the compiler can read.

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

The call to `registerClass('userRepo', UserRepo, ['logger', 'dsn'])` is checked positionally. If you swap the tuple to `['dsn', 'logger']`, TypeScript reports the mismatch before the app runs.

## Resolve Values

Use `.get(key)` for resolution:

```ts
const repo = container.get('userRepo')
```

The key must be registered in the container type. Unknown static keys are compile errors. Dynamic keys should be probed with `.has(key)` before `.get(key)`.

## Choose Lifetimes

Registrations default to `singleton`. Pass the lifetime as the fourth argument for classes, or the third argument for factories.

```ts
const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('token', Token, [], 'transient')
```

| Kind | Created | Cached | Disposed by container |
| --- | --- | --- | --- |
| `singleton` | once per owning container | yes | yes |
| `scoped` | once per scope | yes | yes |
| `transient` | every resolve | no | no |

Singletons cannot directly depend on `scoped` or `transient` services. That rule is enforced by types and, in strict mode, by runtime guards.
