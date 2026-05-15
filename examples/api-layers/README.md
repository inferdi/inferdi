# API Layers

These adapters share the [`../_shared/container.ts`](../_shared/container.ts) builder.

RPC and GraphQL integrations should create one InferDI scope **per HTTP request**, not per procedure or per resolver:

- **tRPC** batches multiple procedure calls in one HTTP request. Disposing in a procedure-level middleware breaks the second call in the batch. The `trpc.ts` example uses `fetchRequestHandler` and disposes once around the whole handler invocation.
- **Apollo / Yoga** with `@defer`/`@stream` continue streaming after `willSendResponse`/`onExecuteDone`. If your schema uses incremental delivery, dispose from a transport-level hook in your HTTP framework instead. The examples show the simple non-streaming pattern with a comment pointing to the streaming alternative.

`await using` is appropriate only when the procedure/resolver wrapper fully owns the async operation boundary. If your server adapter has a separate response lifecycle, dispose the scope from that lifecycle instead.
