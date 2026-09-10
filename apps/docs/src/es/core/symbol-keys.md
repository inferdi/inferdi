# Claves Symbol

Cada clave de registro puede ser un `string` o un `symbol`. Los strings son cómodos para servicios públicos de toda la aplicación. Los symbols son útiles cuando importa la identidad.

```ts
const DB = Symbol('db')
const CACHE = Symbol('cache')

const c = new Container()
  .registerValue('config', { dsn: 'postgres://localhost/app' })
  .registerClass(DB, PgPool, ['config'])
  .registerClass(CACHE, RedisPool, [])
  .registerClass('repo', UserRepo, [DB, CACHE])

c.get(DB)
c.get(CACHE)
c.get('repo')
```

## Cuándo usar symbols

| Patrón                              | Token                     |
|-------------------------------------|---------------------------|
| Servicio privado local al módulo    | `Symbol('name')`          |
| Identidad compartida sin imports    | `Symbol.for('name')`      |
| Distinción nominal a nivel de tipos | constante `unique symbol` |

Usa symbols locales para servicios privados recolectables. `Symbol.for(name)` se almacena en el registro global de symbols y nunca lo recolecta el recolector de basura.

## Acompañantes perezosos

La clave del acompañante perezoso también puede ser un symbol:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

La clave principal y la clave del acompañante no necesitan ser de la misma clase.

La comprobación de colisiones mantiene separados los dominios de string y symbol. Una clave `string` amplia puede seguir a registros compuestos solo por symbols, pero TypeScript la rechaza después de cualquier clave string porque su valor de runtime podría nombrar ese registro. En una clave union, cada miembro posible debe ser nuevo. `lazyKey` se comprueba contra el grafo y contra su clave principal.

## La misma forma de valor {#same-value-shape}

Un `unique symbol` da identidad nominal a una clave, pero no distingue dos valores estructuralmente idénticos en un constructor. Usa marcas en los contratos cuando el orden semántico deba ser nominal:

```ts
type PrimaryDsn = string & { readonly __brand: 'primary' }
type ReplicaDsn = string & { readonly __brand: 'replica' }

class Queries {
  constructor(readonly primary: PrimaryDsn, readonly replica: ReplicaDsn) {}
}
```
