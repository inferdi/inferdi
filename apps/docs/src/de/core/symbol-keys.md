# Symbolschlüssel

Jeder Registrierungsschlüssel kann ein `string` oder `symbol` sein. Strings eignen sich für anwendungsweit sichtbare Services. Symbole sind hilfreich, wenn die Identität entscheidend ist.

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

## Wann Symbole sinnvoll sind

| Muster | Token |
|---|---|
| Privater modullokaler Service | `Symbol('name')` |
| Gemeinsame Identität ohne Imports | `Symbol.for('name')` |
| Nominale Unterscheidung im Typsystem | Konstante vom Typ `unique symbol` |

Nutze lokale Symbole für private Services, die später vom Garbage Collector erfasst werden sollen. `Symbol.for(name)` bleibt dauerhaft in der globalen Symbolregistrierung.

## Lazy-Begleitregistrierungen

Auch der Schlüssel einer Lazy-Begleitregistrierung kann ein Symbol sein:

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

Beide Schlüssel dürfen Strings oder Symbole sein; Haupt- und Begleitschlüssel müssen nicht denselben Schlüsseltyp verwenden.

Kollisionsprüfungen unterscheiden Strings von Symbolen. Ein breiter `string`-Schlüssel ist nach reinen Symbolregistrierungen zulässig, aber nicht nach einem Stringschlüssel: Sein Laufzeitwert könnte die vorhandene Registrierung treffen. Für Unions gilt dasselbe: Jeder mögliche Schlüssel muss neu sein. `lazyKey` wird sowohl gegen den Graphen als auch gegen den Hauptschlüssel geprüft.

## Gleiche Wertstruktur {#same-value-shape}

Ein `unique symbol` macht den Schlüssel nominal, unterscheidet aber nicht zwei strukturell identische Servicewerte als Konstruktorargumente. Verwende Marken in den Werttypen, wenn ihre semantische Reihenfolge abgesichert werden muss:

```ts
type PrimaryDsn = string & { readonly __brand: 'primary' }
type ReplicaDsn = string & { readonly __brand: 'replica' }

class Queries {
  constructor(readonly primary: PrimaryDsn, readonly replica: ReplicaDsn) {}
}
```

