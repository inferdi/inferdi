import { bench } from 'vitest'

// warmupTime/time per bench: vitest's default 500 ms catches 1–2 GC pauses by chance in one container.
// 1 s of warmup + 2 s of measurement averages out the noise.
export const BENCH_OPTS = { warmupTime: 1000, time: 2000 } as const

// DCE protection: V8 sees the result of resolveX() being assigned to an observable variable,
// so it does not eliminate the call after warmup. tinybench's BenchFunction requires a void return —
// hence the sink variable rather than an arrow-expression-return.
export let sink: unknown
export function setSink(v: unknown): void { sink = v }

// Convenience wrapper: bench with default options + sink-closing helper.
export function b(name: string, fn: () => unknown): void {
  bench(name, () => { sink = fn() }, BENCH_OPTS)
}
