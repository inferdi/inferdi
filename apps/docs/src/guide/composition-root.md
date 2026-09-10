# Composition Root

The composition root is the application boundary where concrete implementations are chosen and connected. Domain code states what it needs; infrastructure supplies an implementation; InferDI appears only in assembly code.

## Domain Contract

The domain owns the interface because the use case depends on it. This file has no container or framework import.

::: code-group

<<< ../../snippets/composition/domain.ts [domain.ts]

:::

## Infrastructure Implementation

Infrastructure implements the domain contract. A real adapter would use a database client; the small example keeps the call visible.

::: code-group

<<< ../../snippets/composition/infrastructure.ts [infrastructure.ts]

:::

## Application Composition

Only this file imports InferDI. It chooses `PostgresUserStore`, supplies its DSN, and connects it to `GetGreeting`.

::: code-group

<<< ../../snippets/composition/container.ts [container.ts]

:::

The registration tuple is checked against each constructor. Changing `GetGreeting` or `PostgresUserStore` exposes stale wiring at this boundary.

## Use the Service at the Boundary

An HTTP route, CLI command, or queue consumer resolves the top-level service. The business operation itself still talks through its ordinary method.

::: code-group

<<< ../../snippets/composition/entry.ts [entry.ts]

:::

Open a child scope here when the operation needs request or job inputs. Dispose that scope in the same boundary or let a framework adapter tie it to the framework lifecycle.

## Test the Domain Directly

The unit test does not build a container. It passes a `UserStore` fake to the same `GetGreeting` class used in production.

::: code-group

<<< ../../snippets/composition/domain.test.ts [domain.test.ts]

:::

Use `.override()` for integration tests that need to exercise the real composition graph with one implementation replaced. Direct construction is usually clearer for a single domain service. Continue with [Testing and Overrides](../core/testing).
