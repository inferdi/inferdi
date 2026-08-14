# Время жизни

В InferDI есть три вида времени жизни:

| Вид | Создание | Кеш | Очистка |
| --- | --- | --- | --- |
| `singleton` | один раз на контейнер-владелец | контейнер-владелец | да |
| `scoped` | один раз на дочерний scope | дочерний scope | да |
| `transient` | при каждом resolve | никогда | нет |

При default `{fast: false}` попытка получить `scoped`-ключ из root выбрасывает `Scoped "key" cannot be resolved from the root container. Use createScope().` Получайте scoped-сервисы из дочернего контейнера, который вернул `createScope()`.

## Правило жизненного цикла

Singleton не может напрямую зависеть от `scoped` или `transient` сервиса. Singleton создаётся один раз и разделяется между всеми запросами, поэтому если он захватит scoped-значение - контекст текущего запроса, пользователя или транзакцию - состояние одного запроса незаметно протечёт во все остальные. InferDI делает такую связь невыразимой в системе типов, а не оставляет её на code review.

```ts
new Container()
  .registerClass('request', RequestContext, [], 'scoped')
  .registerClass('users', UserService, ['request'], 'singleton')
```

Такую регистрацию отклонит TypeScript. При `fast: false` runtime-защита отклонит ту же форму, если каст обойдёт систему типов.

Объявленные scope inputs считаются scoped-зависимостями. Регистрируйте потребителя request, auth context, tenant или job payload как `scoped` либо `transient`; singleton-потребителя компилятор отклонит до runtime. Подробнее: [Входные данные скоупа](./scope-inputs).

## Runtime-проверки по умолчанию

`fast` по умолчанию равен `false`. Граф остаётся mutable, а runtime проверяет:

- прямой resolve scoped-ключа из root-контейнера
- нарушения singleton-to-scoped и singleton-to-transient через касты
- утечки из фабрик, которые захватили внешний контейнер
- синхронные singleton-циклы
- синхронные transient-циклы
- неправильное использование динамических ключей, обходящее статическую проверку

```ts
const root = new Container()
const explicitRoot = new Container({ fast: false })
```

## `fast: true`

Используйте `fast: true` только после того, как тесты доказывают форму графа:

```ts
const root = new Container({ fast: true })
```

Опция сохраняет type-level контракт, но убирает runtime-учёт циклов и времени жизни. После активации дерево контейнеров считается фиксированным; проверка scoped-ключа в root также отключается.

Разрабатывайте и тестируйте с `fast: false`. Включайте `fast: true` только для проверенного неизменяемого production-графа. Точные runtime-компромиссы и правила активации описаны в разделе [Производительность](../guide/performance#fast-true).
