/*
 * Unified resolver interface. Every method is a one-liner using the idiomatic API
 * of the target library. The JIT inlines the wrapper, so there is no asymmetric overhead.
 * All methods return `unknown` (not `void`) — this is critical: bench(() => r.resolveService())
 * forwards the value into tinybench, so V8 does not do DCE
 */

export interface Resolver {
  resolveService(): unknown
  resolveTransient(): unknown
  resolveDeep(): unknown
  resolveWide4(): unknown
  resolveWide10(): unknown
  buildAndResolve(): unknown
  scopedResolveAndDispose(): unknown
  resolveLazy(): unknown
}
