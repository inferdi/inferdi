# Factorías

Usa `registerFactory` cuando la construcción necesita más que `new Ctor(...deps)`: leer varios valores, adaptar clientes de terceros, crear objetos de configuración o devolver una promesa.

```ts
const container = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app', poolSize: 10 })
  .registerFactory('pgPool', (c) => {
    const { dsn, poolSize } = c.get('config')
    return new Pool({ connectionString: dsn, max: poolSize })
  })
  .registerClass('users', UserRepo, ['pgPool'])
```

El valor devuelto por la factoría se convierte en el tipo resuelto de la clave.

## Tiempos de vida de las factorías

Las factorías usan el mismo modelo de tiempo de vida que las clases:

```ts
const root = new Container()
  .registerFactory('cache', () => new Cache(), 'singleton')
  .registerFactory('request', () => new RequestState(), 'scoped')
```

Dentro de una factoría de singleton, el parámetro `c` se restringe a dependencias seguras para singletons. Las claves con scope y transitorias no se autocompletan y TypeScript las rechaza.

## Vincular interfaces

Las interfaces de TypeScript se borran durante la compilación y no tienen ningún valor en runtime que pasar como constructor. En su lugar, vincula una interfaz a su implementación mediante un tipo de factoría explícito:

```ts
interface Mailer {
  send(message: string): void
}

class SendGridMailer implements Mailer {
  send(message: string) {}
}

const container = new Container()
  .registerFactory<'mailer', Mailer>('mailer', () => new SendGridMailer())
```

Los consumidores de `'mailer'` ven la abstracción `Mailer`, no la clase concreta.

## Factorías asíncronas

Las factorías pueden devolver promesas. La propia promesa se cachea, de modo que los llamantes concurrentes comparten la inicialización:

```ts
const c = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerFactory('db', async (c) => {
    const pool = new Pool({ connectionString: c.get('dsn') })
    await pool.connect()
    return pool
  })

const [a, b] = await Promise.all([c.get('db'), c.get('db')])
await c.dispose()
```

`.get()` se mantiene síncrono. Los llamantes esperan (await) el valor devuelto cuando el registro es asíncrono.
