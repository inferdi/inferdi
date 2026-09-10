# Время жизни

В InferDI есть три вида времени жизни:

| Вид | Создание | Кэш | Очистка |
| --- | --- | --- | --- |
| `singleton` | один раз на контейнер-владелец | контейнер-владелец | да |
| `scoped` | один раз на дочерний скоуп | дочерний скоуп | да |
| `transient` | при каждом получении сервиса | никогда | нет |

Получайте `scoped`-ключи из дочернего контейнера, который вернул `createScope()`. Стандартный проверяемый контракт запрещает разрешать их из корневого контейнера.

## Правило жизненного цикла

Singleton не может напрямую зависеть от `scoped` или `transient` сервиса. Singleton создаётся один раз и используется всеми запросами, поэтому если он захватит scoped-значение - контекст текущего запроса, пользователя или транзакцию - состояние одного запроса незаметно протечёт во все остальные. InferDI отклоняет такую связь на уровне типов ещё до ревью кода.

```ts twoslash
// @errors: 2345
import { Container } from '@inferdi/inferdi'

class RequestContext {
  readonly requestId = 'req-1'
}

class UserService {
  constructor(readonly request: RequestContext) {}
}

new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton') // [!code error]
```

Такую регистрацию TypeScript отклонит при любом контракте времени выполнения. Стандартный проверяемый контракт также отклонит её во время выполнения, если приведение типа обойдёт систему типов.

Входные данные скоупа считаются scoped-зависимостями. Если сервис использует запрос, контекст авторизации, сведения о клиенте системы или данные задания, задайте ему время жизни `scoped` или `transient`. Вариант `singleton` компилятор отклонит ещё до запуска. Подробнее: [Входные данные скоупа](./scope-inputs).

<!-- Preserve deep links from before the container-option sections moved -->
<h6 id="runtime-проверки-по-умолчанию" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>
<h6 id="fast-true" aria-hidden="true" style="height:0;margin:0;padding:0;overflow:hidden"></h6>

Проверки во время выполнения зависят от контракта контейнера. Точное поведение стандартного
и fast-контрактов описано в разделе [Опции контейнера](../reference/api#опции-контеинера).
