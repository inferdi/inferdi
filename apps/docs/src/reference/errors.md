# Errors

InferDI throws explicit errors for graph and lifecycle misuse. Keep these messages visible in tests so registration mistakes fail early.

| Trigger | Message shape |
| --- | --- |
| `.get(k)` on missing key | `Key "k" not found` |
| Disposed container resolve | `Container is disposed (key: "k")` |
| Disposed ancestor resolve | `Ancestor container is disposed (key: "k")` |
| `createScope()` after dispose | `Cannot create scope from a disposed container` |
| Singleton lifetime violation | `Singleton "x" cannot depend on scoped "y"...` |
| Synchronous cycle | `Circular dependency detected: a -> b -> a...` |
| Sync dispose over async resource | `Sync [Symbol.dispose] called on a resource whose .dispose() returned a Promise...` |
| Late override | `Cannot override "k" because it has already been resolved...` |
| Override on disposed container | `Cannot override on a disposed container (key: "k")` |

## Async Factory Cycles

Cycles between async factories are not detected. A factory that awaits another async factory can resume after the synchronous cycle stack has been cleared. If both sides eventually await each other, callers observe a pending promise that never resolves.

Fix async cycles architecturally:

- split shared initialization
- hoist one side into an earlier service
- use `Lazy<singleton>` only when both sides are singletons
- add a development watchdog timeout around suspicious top-level awaits

## Adapter Cleanup Errors

Adapter cleanup errors after a response is produced are never surfaced to the client. They are routed to `onDisposeError` or the adapter's fallback sink.

Setup failures are different: the original setup error is surfaced, and any cleanup failure during setup teardown is routed to the sink without being aggregated into the surfaced error.
