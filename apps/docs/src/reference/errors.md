# Errors

InferDI throws explicit errors for graph and lifecycle misuse. Keep these messages visible in tests so registration mistakes fail early.

| Trigger                                       | Message shape                                                                                |
|-----------------------------------------------|----------------------------------------------------------------------------------------------|
| `.get(k)` on missing key                      | `Key "k" not found`                                                                          |
| Disposed container resolve                    | `Container is disposed (key: "k")`                                                           |
| Disposed ancestor resolve                     | `Ancestor container is disposed (key: "k")`                                                  |
| `createScope()` after dispose                 | `Cannot create scope from a disposed container`                                              |
| Registration after dispose                    | `Cannot register on a disposed container (key: "k")`                                         |
| Root resolves a scoped key with `fast: false` | `Scoped "k" cannot be resolved from the root container. Use createScope().`                  |
| Singleton lifetime violation                  | `Singleton "x" cannot depend on scoped "y"...`                                               |
| Synchronous cycle                             | `Circular dependency detected: a -> b -> a...`                                               |
| Sync dispose over async resource              | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...`          |
| Sync dispose over cached async initialization | `Sync [Symbol.dispose] called on a container that cached a Promise from an async factory...` |
| Late override                                 | `Cannot override "k" because it has already been resolved...`                                |
| Override on disposed container                | `Cannot override on a disposed container (key: "k")`                                         |

Sync disposal observes the rejection of a cached native Promise before reporting the misuse. A rejection that arrives later does not become an `unhandledRejection`, but sync disposal still cannot await or close the resource. It does not call `.then()` on a custom Promise-like value.

During async disposal, a failed dependency and its dependent registrations may reject with the same `Error` object. InferDI reports that object once. Separate error objects remain separate causes in `AggregateError`, even when their messages match.

## Async Factory Cycles

Declarative edges listed in `registerAsyncFactory(..., deps, ...)` are resolved by a synchronous preflight, so the existing cycle guard rejects cycles before any factory body starts.

Cycles created after a Promise boundary are not detected. This includes calls from Promise-valued `registerFactory` callbacks and captured containers used after `await`. If both sides wait for each other, callers observe a pending Promise that never resolves.

Fix async cycles architecturally:

- split shared initialization
- hoist one side into an earlier service
- use `Lazy<singleton>` only for synchronous singleton edges
- add a development watchdog timeout around suspicious top-level awaits

## Adapter Cleanup Errors

Adapter cleanup errors after a response is produced are never surfaced to the client. They are routed to `onDisposeError` or the adapter's fallback sink.

Setup failures are different: the original setup error is surfaced, and any cleanup failure during setup teardown is routed to the sink without being aggregated into the surfaced error.
