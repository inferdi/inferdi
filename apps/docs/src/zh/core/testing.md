# 测试与覆盖

当测试需要用 mock 替换现有注册时，请使用 `.override()`。

```ts
function buildContainer() {
  return new Container()
    .registerClass('logger', ConsoleLogger, [])
    .registerClass('db', PgDb, [])
    .registerClass('users', UserRepo, ['logger', 'db'])
}

const c = buildContainer()
  .override('logger', mockLogger)
  .override('db', mockDb)
```

覆盖值必须可赋值给原始注册的类型。缺失的键和不兼容的 mock 都是 TypeScript 错误。

## 覆盖时机

覆盖必须发生在键被解析之前：

```ts
const logger = c.get('logger')
c.override('logger', mockLogger)
```

第二行会抛出异常。一次过晚的覆盖会割裂依赖图：已有的消费方会持有旧实例，而之后的解析会返回 mock。

## 所有权

覆盖值由外部拥有。与 `registerValue` 一样，覆盖不会被加入容器的释放队列。测试夹具拥有它自己的清理职责。

## 作用域局部性

覆盖只会改变它被调用的那个容器：

```ts
const scope = root.createScope().override('db', mockDb)
```

根容器和同级作用域不受影响。父级的覆盖通过常规的父级查找仍然可见。
