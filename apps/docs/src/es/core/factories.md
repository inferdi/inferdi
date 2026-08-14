# Factorías

Usa `registerClass` cuando la construcción sea exactamente `new Ctor(...deps)`. Usa `registerFactory` cuando necesites configuración, una API externa, vincular una interfaz u otra lógica explícita.

```ts
const container = new Container()
  .registerValue('config', {
    dsn: 'postgres://localhost/app',
    poolSize: 10
  })
  .registerFactory('pool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepository, ['pool'])
```

El tipo devuelto se convierte en el tipo del servicio registrado.

## Factorías con acceso al contenedor

El callback básico recibe un contenedor filtrado por tiempo de vida. Una factoría singleton solo puede resolver dependencias seguras para singleton; TypeScript rechaza las claves scoped y transient.

```ts
const root = new Container()
  .registerValue('prefix', 'app')
  .registerFactory('logger', (c) => new Logger(c.get('prefix')))
```

Usa esta forma para una resolución condicional o en varios pasos. Todas las llamadas a `.get()` deben ser síncronas. Si el límite de inicialización debe propagarse por el grafo, usa `registerAsyncFactory`.

## Dependencias declaradas de una factoría

El overload con `deps` hace visibles los requisitos de la factoría y limita el resolver del callback a esas claves:

```ts
const root = new Container()
  .declareScopeInputs<{ request: RequestContext }>()
  .registerClass('logger', Logger, [])
  .registerFactory(
    'requestLog',
    (deps) => new RequestLog(
      deps.get('request'),
      deps.get('logger')
    ),
    ['request', 'logger'],
    'scoped'
  )
```

Las dependencias declaradas propagan los requisitos de entradas de scope y tiempos de vida a módulos y registros posteriores. A diferencia de `registerAsyncFactory`, el callback recibe un resolver, no valores posicionales.

## Tiempos de vida de las factorías

Las factorías usan los mismos tiempos de vida que las clases:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('requestState', () => new RequestState(), 'scoped')
  .registerFactory('operation', () => new Operation(), 'transient')
```

Los resultados singleton y scoped se almacenan y pertenecen al contenedor. InferDI no almacena ni libera los resultados transient.

El cuarto argumento puede ser un `lazyKey` que crea un companion y conserva el tiempo de vida del objetivo:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton', 'cacheLazy')

root.get('cacheLazy').get()
```

Al crear un companion hay que indicar el tiempo de vida, incluido `'singleton'`. Consulta [Inyección perezosa](./lazy-injection) para ver las demás reglas.

## Vincular interfaces

Las interfaces no tienen constructor en runtime. Indica el tipo de servicio de forma explícita cuando los consumidores deban depender de una abstracción:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>(
    'mailer',
    () => new SendGridMailer()
  )
```

Los consumidores de `mailer` ven ahora `Mailer`, no `SendGridMailer`.

## Elegir el contrato de Promise

Una Promise devuelta por `registerFactory` es el propio valor del servicio: `.get()` devuelve `Promise<T>` y las factorías dependientes reciben esa misma Promise. Usa esta forma solo cuando la Promise pertenezca al grafo síncrono.

Si el servicio es `T` y la Promise representa su inicialización, usa `registerAsyncFactory`. El estado asíncrono se propaga y el servicio se resuelve con `.getAsync()`. [Dependencias asíncronas](./async-dependencies) explica ambos contratos, la caché, los companions lazy, los errores y la liberación de recursos.
