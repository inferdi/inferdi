# Clés symboles

Chaque clé d’enregistrement peut être un `string` ou un `symbol`. Les chaînes sont pratiques pour les services publics de l’application. Les symboles sont utiles quand l’identité compte.

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

## Quand utiliser des symboles

| Usage | Jeton |
|---|---|
| Service privé à un module | `Symbol('name')` |
| Identité partagée sans import | `Symbol.for('name')` |
| Distinction nominale dans les types | Constante de type `unique symbol` |

Utilise des symboles locaux pour les services privés qui doivent pouvoir être récupérés par le ramasse-miettes. `Symbol.for(name)` reste indéfiniment dans le registre global des symboles.

## Compagnons différés

La clé d’un compagnon différé peut aussi être un symbole :

```ts
const DB = Symbol('db')
const DB_LAZY = Symbol('dbLazy')

const c = new Container()
  .registerClass(DB, PgPool, [], 'singleton', DB_LAZY)

c.get(DB_LAZY).get()
```

Chaque clé peut être une chaîne ou un symbole ; la clé principale et celle du compagnon n’ont pas à utiliser le même type.

Les contrôles de collision distinguent chaînes et symboles. Une clé de type large `string` est acceptée après des enregistrements exclusivement symboliques, mais refusée après une clé chaîne : sa valeur pourrait écraser cet enregistrement. La même règle s’applique aux unions : chaque membre possible doit être nouveau. `lazyKey` est vérifié contre le graphe et contre la clé principale.

## Valeurs de même structure {#same-value-shape}

Un `unique symbol` rend la clé nominale, mais ne distingue pas deux valeurs de service structurellement identiques dans les arguments d’un constructeur. Ajoute une marque aux types des valeurs si leur ordre sémantique doit être vérifié :

```ts
type PrimaryDsn = string & { readonly __brand: 'primary' }
type ReplicaDsn = string & { readonly __brand: 'replica' }

class Queries {
  constructor(readonly primary: PrimaryDsn, readonly replica: ReplicaDsn) {}
}
```

