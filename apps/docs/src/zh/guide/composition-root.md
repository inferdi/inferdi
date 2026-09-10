# 组合根

组合根是应用选择并连接具体实现的边界。领域代码声明需要什么，基础设施提供实现，InferDI 只出现在组装代码中。

## 领域契约

接口由领域层拥有，因为用例依赖它。这个文件不导入容器或框架。

::: code-group

<<< ../../../snippets/composition/domain.ts [domain.ts]

:::

## 基础设施实现

基础设施实现领域契约。真实适配器会调用数据库客户端；这个小例子把调用过程直接写出来。

::: code-group

<<< ../../../snippets/composition/infrastructure.ts [infrastructure.ts]

:::

## 组装应用

只有这个文件导入 InferDI。它选择 `PostgresUserStore`，传入 DSN，并把它连接到 `GetGreeting`。

::: code-group

<<< ../../../snippets/composition/container.ts [container.ts]

:::

注册元组会与构造函数逐一核对。修改 `GetGreeting` 或 `PostgresUserStore` 后，过期的组装代码会在这条边界报错。

## 在边界调用服务

HTTP 路由、CLI 命令或队列消费者解析顶层服务。业务操作仍通过普通方法调用。

::: code-group

<<< ../../../snippets/composition/entry.ts [entry.ts]

:::

如果操作需要请求或作业输入，就在这里创建子作用域，并在同一边界释放；也可以让框架适配器把它绑定到框架生命周期。

## 直接测试领域代码

单元测试无需构建容器。它把假的 `UserStore` 传给生产中使用的同一个 `GetGreeting` 类。

::: code-group

<<< ../../../snippets/composition/domain.test.ts [domain.test.ts]

:::

集成测试需要运行真实组合图并替换一个实现时，可以使用 `.override()`。测试单个领域服务时，直接构造往往更清楚。接着阅读[测试与覆盖](../core/testing)。
