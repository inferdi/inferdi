# Migration Guide

This file collects the breaking-change checklists for each major version of `@inferdi/inferdi`.
For new features and fixes within a major line, see the release notes on the GitHub Releases page.

## Table of Contents

- [Migration to 2.0](#migration-to-20)

## Migration to 2.0

Two breaking changes vs 1.x — both have a one-line fix:

1. **`container.cradle` removed.** Use `container.get(key)` everywhere. If you destructured the cradle, replace with explicit `.get()` calls or destructure the result of one `.get()`:
   ```ts
   // 1.x
   const { db, logger } = container.cradle
   // 2.x
   const db     = container.get('db')
   const logger = container.get('logger')
   ```
2. **`registerClass(..., lazy: true)` → explicit `lazyKey` companion.** The boolean flag is gone; pass the desired companion key (string or symbol) instead. The runtime semantics are identical:
   ```ts
   // 1.x
   .registerClass('clock', Clock, [], 'transient', true)
   // 2.x
   .registerClass('clock', Clock, [], 'transient', 'clockLazy')
   ```

Everything else — `register*` accumulation, `Module<TIn, TOut>`, `Container.Resolve<C>`, lifetime guards, `using` / `await using`, `AggregateError` teardown — is unchanged.

### What's new in 2.0

- **String *or* symbol keys** in every `register*` method. Mix freely in the same container; `deps` arrays, `lazyKey`, factory bodies and `Module<TIn, TOut>` all accept both. See the [Symbol Keys](./README.md#symbol-keys) section in the README for patterns and the performance tip.
- **`Ancestor container is disposed (key: "...")`** — when a child scope tries to resolve a key that lived on an already-disposed parent, the error is now precise instead of the misleading `Key "..." not found`.
