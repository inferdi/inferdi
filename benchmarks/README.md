# InferDI comparative benchmarks

This workspace compares `@inferdi/inferdi` with five TypeScript DI libraries:

- [InversifyJS](https://www.npmjs.com/package/inversify) v8
- [Awilix](https://www.npmjs.com/package/awilix) v13 in PROXY and CLASSIC modes
- [TSyringe](https://www.npmjs.com/package/tsyringe) v4
- [TypeDI](https://www.npmjs.com/package/typedi) v0.10
- [Typed Inject](https://www.npmjs.com/package/typed-inject) v5

The suite reports `InferDI (default)` and `InferDI (fast)` as separate subjects. Checked mode uses the default runtime contract. Fast mode opts into a fixed graph contract with fewer runtime guards. Both modes use the same registrations and type-level graph.

## Install and run

Run the `benchmarks:*` scripts from the repository root. Relative input and output paths resolve from `benchmarks/` because each root script delegates to that isolated workspace.

| Command                                             | What it runs                                                                                                                          | Successful result                                                                                                                                    | Failure result                                                                                                                            |
|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `pnpm run benchmarks:install`                       | Installs benchmark dependencies from `benchmarks/pnpm-lock.yaml` with `--frozen-lockfile`                                             | pnpm prints `Lockfile is up to date` or resolves the locked packages, then exits with code 0                                                         | pnpm exits non-zero for a lockfile mismatch, unavailable package, or install error                                                        |
| `pnpm run benchmarks:typecheck`                     | Runs `tsc --noEmit` for the benchmark workspace                                                                                       | TypeScript prints no diagnostics and the command exits with code 0                                                                                   | TypeScript prints each diagnostic and exits non-zero                                                                                      |
| `pnpm run benchmarks:precondition`                  | Runs every test under `src/precondition` without timing benchmarks                                                                    | Vitest reports all test files and tests as passed, with no unhandled errors                                                                          | Vitest names the failed contract or reports an unhandled error and exits non-zero                                                         |
| `pnpm run benchmarks:bench`                         | Runs the default local benchmark pipeline; this currently selects quick source mode                                                   | Typecheck and preconditions pass, one round completes, and the command prints `Raw benchmark result: results/quick-<timestamp>.json`                 | The pipeline stops at the failed check or round and exits non-zero without a completed raw result                                         |
| `pnpm run benchmarks:quick`                         | Runs one short subject-isolated round against InferDI source                                                                          | All 13 scenarios complete for every subject and a `results/quick-<timestamp>.json` file is written                                                   | A failed typecheck, precondition, adapter, or benchmark subject produces a non-zero exit code                                             |
| `pnpm run benchmarks:source`                        | Runs quick mode with the InferDI source artifact selected explicitly                                                                  | The raw JSON records `mode: "quick"` and `artifact.mode: "source"`                                                                                   | The command exits non-zero and does not produce a completed raw result                                                                    |
| `pnpm run benchmarks:public`                        | Performs a frozen install, typecheck, production build, production preconditions, and one balanced eight-round subject-isolated block | Every subject completes in a fresh Node process in all eight rounds, then the command prints `Raw benchmark result: results/public-<timestamp>.json` | The pipeline stops on the first failed stage or subject process and exits non-zero; it does not write the final public JSON               |
| `pnpm run benchmarks:report -- results/<file>.json` | Reads one raw JSON file and renders deterministic Markdown tables                                                                     | Markdown tables are printed to stdout; adding `--write` updates the generated section below when the result passes the public-result checks          | A missing or invalid file exits non-zero; `--write` also fails for source, non-frozen, short-timing, or incomplete balanced-block results |

The exit code is the authoritative status. Warnings such as pnpm's ignored-build-scripts notice do not indicate failure when the command reaches its success output and exits with code 0.

Use the isolated lockfile in this directory:

```bash
cd benchmarks
pnpm install --frozen-lockfile
pnpm run bench:quick
```

`bench:quick` runs one short round against InferDI source with a fresh Node process for every subject. It runs typecheck and the adapter contract suite before timing. Use it while changing adapters or scenarios. Do not cite its output as a public result.

Run the public pipeline with:

```bash
pnpm run bench:public
```

The public command performs these steps:

1. Install benchmark dependencies with `--frozen-lockfile`.
2. Typecheck the benchmark workspace.
3. Build `packages/inferdi/dist/index.js`.
4. Run the adapter contract suite against that production artifact.
5. Start one balanced eight-round block, measuring every subject in a fresh Node process with a Latin-square launch order.
6. Save all round results and environment metadata under `results/`.

The command does not edit this README. Generate a report from one raw result, then update the marked section with a separate command:

```bash
pnpm run bench:report -- results/public-<timestamp>.json
pnpm run bench:report -- results/public-<timestamp>.json --write
```

The reporter accepts `--write` for subject-isolated production public results made of complete balanced eight-round blocks with the default 100/50 ms timing profile. It computes all table values from the selected JSON file.

<!-- benchmark-report:start -->
## Generated benchmark results

Production artifact result from `results/public-2026-08-17T16-46-00-483Z.json`.

Commit: `7e9614e9e6a77d50bd02183fb3553a30dcc6f339`\
Environment: v22.18.0, linux 6.6.87.2-microsoft-standard-WSL2, x64, Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz\
Rounds: 8; central value: median; dispersion: MAD. Lower is better.

### Hot singleton resolve

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 6.233 | 0.091 | 1.00× |
| InferDI (default) | 6.233 | 0.000 | 1.00× |
| InversifyJS | 10.954 | 0.321 | 1.76× |
| Awilix PROXY | 40.425 | 0.596 | 6.49× |
| Awilix CLASSIC | 41.525 | 0.367 | 6.66× |
| TSyringe | 81.354 | 3.254 | 13.05× |
| TypeDI | 71.729 | 0.962 | 11.51× |
| Typed Inject | 48.354 | 1.374 | 7.76× |

### Transient resolve

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 41.798 | 2.196 | 1.00× |
| InferDI (default) | 45.834 | 1.284 | 1.10× |
| InversifyJS | 79.566 | 3.850 | 1.90× |
| Awilix PROXY | 219.82 | 8.250 | 5.26× |
| Awilix CLASSIC | 227.15 | 8.068 | 5.43× |
| TSyringe | 301.40 | 16.682 | 7.21× |
| TypeDI | 519.75 | 5.498 | 12.43× |
| Typed Inject | 138.05 | 1.464 | 3.30× |

### Deep graph (10 levels)

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 344.21 | 11.460 | 1.00× |
| InferDI (default) | 445.50 | 10.085 | 1.29× |
| InversifyJS | 397.37 | 7.795 | 1.15× |
| Awilix PROXY | 1306.3 | 16.500 | 3.79× |
| Awilix CLASSIC | 1190.8 | 12.375 | 3.46× |
| TSyringe | 1463.0 | 34.835 | 4.25× |
| TypeDI | 4478.8 | 26.582 | 13.01× |
| Typed Inject | 717.75 | 3.670 | 2.09× |

### Wide graph (4 dependencies)

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 59.584 | 1.282 | 1.00× |
| InferDI (default) | 71.316 | 1.284 | 1.20× |
| InversifyJS | 103.22 | 2.932 | 1.73× |
| Awilix PROXY | 331.10 | 6.416 | 5.56× |
| Awilix CLASSIC | 302.69 | 5.498 | 5.08× |
| TSyringe | 457.97 | 18.150 | 7.69× |
| TypeDI | 863.32 | 12.832 | 14.49× |
| Typed Inject | 197.63 | 1.468 | 3.32× |

### Wide graph (10 dependencies)

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 188.37 | 4.125 | 1.00× |
| InferDI (default) | 200.74 | 4.130 | 1.07× |
| InversifyJS | 394.63 | 4.580 | 2.09× |
| Awilix PROXY | 681.08 | 21.080 | 3.62× |
| Awilix CLASSIC | 571.54 | 12.830 | 3.03× |
| TSyringe | 979.46 | 15.125 | 5.20× |
| TypeDI | 2234.1 | 25.888 | 11.86× |
| Typed Inject | 321.29 | 4.585 | 1.71× |

### Registration

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 2007.5 | 27.500 | 1.00× |
| InferDI (default) | 2158.8 | 13.750 | 1.08× |
| InversifyJS | 61274.6 | 1537.7 | 30.52× |
| Awilix PROXY | 74763.4 | 1024.4 | 37.24× |
| Awilix CLASSIC | 95225.6 | 467.45 | 47.43× |
| TSyringe | 3762.9 | 36.650 | 1.87× |
| TypeDI | N/A | N/A | N/A |
| Typed Inject | 3593.3 | 18.300 | 1.79× |

### First resolve

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 653.13 | 24.745 | 1.00× |
| InferDI (default) | 794.98 | 6.190 | 1.22× |
| InversifyJS | 9967.4 | 551.61 | 15.26× |
| Awilix PROXY | 2434.9 | 96.250 | 3.73× |
| Awilix CLASSIC | 3044.2 | 70.360 | 4.66× |
| TSyringe | 1236.8 | 25.440 | 1.89× |
| TypeDI | 3322.9 | 22.455 | 5.09× |
| Typed Inject | 1275.3 | 22.917 | 1.95× |

### Scope creation

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 79.750 | 2.290 | 1.00× |
| InferDI (default) | 83.415 | 5.505 | 1.05× |
| InversifyJS | 6194.4 | 167.98 | 77.67× |
| Awilix PROXY | 1054.4 | 16.960 | 13.22× |
| Awilix CLASSIC | 1031.2 | 7.790 | 12.93× |
| TSyringe | 503.26 | 10.540 | 6.31× |
| TypeDI | 419.38 | 3.210 | 5.26× |
| Typed Inject | 164.08 | 1.835 | 2.06× |

### First scoped resolve

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 115.05 | 1.830 | 1.00× |
| InferDI (default) | 128.34 | 1.835 | 1.12× |
| InversifyJS | 3048.6 | 32.765 | 26.50× |
| Awilix PROXY | 352.92 | 1.835 | 3.07× |
| Awilix CLASSIC | 362.54 | 4.590 | 3.15× |
| TSyringe | 373.54 | 11.915 | 3.25× |
| TypeDI | 296.08 | 4.125 | 2.57× |
| Typed Inject | 203.05 | 0.920 | 1.76× |

### Warm scoped resolve

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 8.387 | 0.092 | 1.05× |
| InferDI (default) | 8.250 | 0.046 | 1.03× |
| InversifyJS | 30.204 | 0.367 | 3.79× |
| Awilix PROXY | 90.841 | 1.421 | 11.39× |
| Awilix CLASSIC | 95.242 | 1.421 | 11.94× |
| TSyringe | 78.375 | 2.429 | 9.83× |
| TypeDI | 92.630 | 0.458 | 11.61× |
| Typed Inject | 7.975 | 0.092 | 1.00× |

### Sync teardown

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 99.455 | 1.370 | 1.01× |
| InferDI (default) | 98.085 | 0.925 | 1.00× |
| InversifyJS | N/A | N/A | N/A |
| Awilix PROXY | N/A | N/A | N/A |
| Awilix CLASSIC | N/A | N/A | N/A |
| TSyringe | N/A | N/A | N/A |
| TypeDI | 124.21 | 3.665 | 1.27× |
| Typed Inject | N/A | N/A | N/A |

### Async teardown

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 242.91 | 3.210 | 1.00× |
| InferDI (default) | 249.34 | 1.840 | 1.03× |
| InversifyJS | N/A | N/A | N/A |
| Awilix PROXY | 860.52 | 20.170 | 3.54× |
| Awilix CLASSIC | 886.87 | 13.750 | 3.65× |
| TSyringe | 1311.8 | 10.080 | 5.40× |
| TypeDI | N/A | N/A | N/A |
| Typed Inject | 721.42 | 19.935 | 2.97× |

### Lazy resolve

| Subject | Median ns/op | MAD ns/op | Relative |
|---|---:|---:|---:|
| InferDI (fast) | 18.837 | 0.458 | 1.00× |
| InferDI (default) | 19.020 | 0.274 | 1.01× |
| InversifyJS | 64.212 | 3.621 | 3.41× |
| Awilix PROXY | 115.68 | 0.825 | 6.14× |
| Awilix CLASSIC | 124.09 | 3.231 | 6.59× |
| TSyringe | 155.01 | 5.271 | 8.23× |
| TypeDI | 271.06 | 3.941 | 14.39× |
| Typed Inject | 76.496 | 0.962 | 4.06× |

## Combined benchmark results

### Median ns/op

Median in ns/op.

| Scenario | InferDI (fast) | InferDI (default) | InversifyJS | Awilix PROXY | Awilix CLASSIC | TSyringe | TypeDI | Typed Inject |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hot singleton resolve | 6.233 | 6.233 | 10.954 | 40.425 | 41.525 | 81.354 | 71.729 | 48.354 |
| Transient resolve | 41.798 | 45.834 | 79.566 | 219.82 | 227.15 | 301.40 | 519.75 | 138.05 |
| Deep graph (10 levels) | 344.21 | 445.50 | 397.37 | 1306.3 | 1190.8 | 1463.0 | 4478.8 | 717.75 |
| Wide graph (4 dependencies) | 59.584 | 71.316 | 103.22 | 331.10 | 302.69 | 457.97 | 863.32 | 197.63 |
| Wide graph (10 dependencies) | 188.37 | 200.74 | 394.63 | 681.08 | 571.54 | 979.46 | 2234.1 | 321.29 |
| Registration | 2007.5 | 2158.8 | 61274.6 | 74763.4 | 95225.6 | 3762.9 | N/A | 3593.3 |
| First resolve | 653.13 | 794.98 | 9967.4 | 2434.9 | 3044.2 | 1236.8 | 3322.9 | 1275.3 |
| Scope creation | 79.750 | 83.415 | 6194.4 | 1054.4 | 1031.2 | 503.26 | 419.38 | 164.08 |
| First scoped resolve | 115.05 | 128.34 | 3048.6 | 352.92 | 362.54 | 373.54 | 296.08 | 203.05 |
| Warm scoped resolve | 8.387 | 8.250 | 30.204 | 90.841 | 95.242 | 78.375 | 92.630 | 7.975 |
| Sync teardown | 99.455 | 98.085 | N/A | N/A | N/A | N/A | 124.21 | N/A |
| Async teardown | 242.91 | 249.34 | N/A | 860.52 | 886.87 | 1311.8 | N/A | 721.42 |
| Lazy resolve | 18.837 | 19.020 | 64.212 | 115.68 | 124.09 | 155.01 | 271.06 | 76.496 |

### Relative to fastest

Relative to the fastest container in each scenario.

| Scenario | InferDI (fast) | InferDI (default) | InversifyJS | Awilix PROXY | Awilix CLASSIC | TSyringe | TypeDI | Typed Inject |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hot singleton resolve | 1.00× | 1.00× | 1.76× | 6.49× | 6.66× | 13.05× | 11.51× | 7.76× |
| Transient resolve | 1.00× | 1.10× | 1.90× | 5.26× | 5.43× | 7.21× | 12.43× | 3.30× |
| Deep graph (10 levels) | 1.00× | 1.29× | 1.15× | 3.79× | 3.46× | 4.25× | 13.01× | 2.09× |
| Wide graph (4 dependencies) | 1.00× | 1.20× | 1.73× | 5.56× | 5.08× | 7.69× | 14.49× | 3.32× |
| Wide graph (10 dependencies) | 1.00× | 1.07× | 2.09× | 3.62× | 3.03× | 5.20× | 11.86× | 1.71× |
| Registration | 1.00× | 1.08× | 30.52× | 37.24× | 47.43× | 1.87× | N/A | 1.79× |
| First resolve | 1.00× | 1.22× | 15.26× | 3.73× | 4.66× | 1.89× | 5.09× | 1.95× |
| Scope creation | 1.00× | 1.05× | 77.67× | 13.22× | 12.93× | 6.31× | 5.26× | 2.06× |
| First scoped resolve | 1.00× | 1.12× | 26.50× | 3.07× | 3.15× | 3.25× | 2.57× | 1.76× |
| Warm scoped resolve | 1.05× | 1.03× | 3.79× | 11.39× | 11.94× | 9.83× | 11.61× | 1.00× |
| Sync teardown | 1.01× | 1.00× | N/A | N/A | N/A | N/A | 1.27× | N/A |
| Async teardown | 1.00× | 1.03× | N/A | 3.54× | 3.65× | 5.40× | N/A | 2.97× |
| Lazy resolve | 1.00× | 1.01× | 3.41× | 6.14× | 6.59× | 8.23× | 14.39× | 4.06× |

### Median ± MAD with relative

Median ± MAD in ns/op; the value in parentheses is relative to the fastest container in that scenario.

| Scenario | InferDI (fast) | InferDI (default) | InversifyJS | Awilix PROXY | Awilix CLASSIC | TSyringe | TypeDI | Typed Inject |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Hot singleton resolve | 6.233 ± 0.091 (1.00×) | 6.233 ± 0.000 (1.00×) | 10.954 ± 0.321 (1.76×) | 40.425 ± 0.596 (6.49×) | 41.525 ± 0.367 (6.66×) | 81.354 ± 3.254 (13.05×) | 71.729 ± 0.962 (11.51×) | 48.354 ± 1.374 (7.76×) |
| Transient resolve | 41.798 ± 2.196 (1.00×) | 45.834 ± 1.284 (1.10×) | 79.566 ± 3.850 (1.90×) | 219.82 ± 8.250 (5.26×) | 227.15 ± 8.068 (5.43×) | 301.40 ± 16.682 (7.21×) | 519.75 ± 5.498 (12.43×) | 138.05 ± 1.464 (3.30×) |
| Deep graph (10 levels) | 344.21 ± 11.460 (1.00×) | 445.50 ± 10.085 (1.29×) | 397.37 ± 7.795 (1.15×) | 1306.3 ± 16.500 (3.79×) | 1190.8 ± 12.375 (3.46×) | 1463.0 ± 34.835 (4.25×) | 4478.8 ± 26.582 (13.01×) | 717.75 ± 3.670 (2.09×) |
| Wide graph (4 dependencies) | 59.584 ± 1.282 (1.00×) | 71.316 ± 1.284 (1.20×) | 103.22 ± 2.932 (1.73×) | 331.10 ± 6.416 (5.56×) | 302.69 ± 5.498 (5.08×) | 457.97 ± 18.150 (7.69×) | 863.32 ± 12.832 (14.49×) | 197.63 ± 1.468 (3.32×) |
| Wide graph (10 dependencies) | 188.37 ± 4.125 (1.00×) | 200.74 ± 4.130 (1.07×) | 394.63 ± 4.580 (2.09×) | 681.08 ± 21.080 (3.62×) | 571.54 ± 12.830 (3.03×) | 979.46 ± 15.125 (5.20×) | 2234.1 ± 25.888 (11.86×) | 321.29 ± 4.585 (1.71×) |
| Registration | 2007.5 ± 27.500 (1.00×) | 2158.8 ± 13.750 (1.08×) | 61274.6 ± 1537.7 (30.52×) | 74763.4 ± 1024.4 (37.24×) | 95225.6 ± 467.45 (47.43×) | 3762.9 ± 36.650 (1.87×) | N/A | 3593.3 ± 18.300 (1.79×) |
| First resolve | 653.13 ± 24.745 (1.00×) | 794.98 ± 6.190 (1.22×) | 9967.4 ± 551.61 (15.26×) | 2434.9 ± 96.250 (3.73×) | 3044.2 ± 70.360 (4.66×) | 1236.8 ± 25.440 (1.89×) | 3322.9 ± 22.455 (5.09×) | 1275.3 ± 22.917 (1.95×) |
| Scope creation | 79.750 ± 2.290 (1.00×) | 83.415 ± 5.505 (1.05×) | 6194.4 ± 167.98 (77.67×) | 1054.4 ± 16.960 (13.22×) | 1031.2 ± 7.790 (12.93×) | 503.26 ± 10.540 (6.31×) | 419.38 ± 3.210 (5.26×) | 164.08 ± 1.835 (2.06×) |
| First scoped resolve | 115.05 ± 1.830 (1.00×) | 128.34 ± 1.835 (1.12×) | 3048.6 ± 32.765 (26.50×) | 352.92 ± 1.835 (3.07×) | 362.54 ± 4.590 (3.15×) | 373.54 ± 11.915 (3.25×) | 296.08 ± 4.125 (2.57×) | 203.05 ± 0.920 (1.76×) |
| Warm scoped resolve | 8.387 ± 0.092 (1.05×) | 8.250 ± 0.046 (1.03×) | 30.204 ± 0.367 (3.79×) | 90.841 ± 1.421 (11.39×) | 95.242 ± 1.421 (11.94×) | 78.375 ± 2.429 (9.83×) | 92.630 ± 0.458 (11.61×) | 7.975 ± 0.092 (1.00×) |
| Sync teardown | 99.455 ± 1.370 (1.01×) | 98.085 ± 0.925 (1.00×) | N/A | N/A | N/A | N/A | 124.21 ± 3.665 (1.27×) | N/A |
| Async teardown | 242.91 ± 3.210 (1.00×) | 249.34 ± 1.840 (1.03×) | N/A | 860.52 ± 20.170 (3.54×) | 886.87 ± 13.750 (3.65×) | 1311.8 ± 10.080 (5.40×) | N/A | 721.42 ± 19.935 (2.97×) |
| Lazy resolve | 18.837 ± 0.458 (1.00×) | 19.020 ± 0.274 (1.01×) | 64.212 ± 3.621 (3.41×) | 115.68 ± 0.825 (6.14×) | 124.09 ± 3.231 (6.59×) | 155.01 ± 5.271 (8.23×) | 271.06 ± 3.941 (14.39×) | 76.496 ± 0.962 (4.06×) |
<!-- benchmark-report:end -->

## Observable graph contract

The precondition suite checks each adapter before timing. Each subject must produce these identities:

- `Logger`, `Config`, `Repo`, and `Service` are root singletons.
- `TransientService`, every node in `L0` through `L9`, `Wide4`, and `Wide10` are transient roots where specified.
- Each scope caches one `ScopedService`; two scopes return different services.
- Every scoped service receives the root singleton logger.
- The lazy wrapper resolves the root singleton logger without resolving it during wrapper creation.

The tests inspect dependency identity and constructor type. They also invoke each declared teardown path and check the scoped service's disposer counter.

## Scenarios

The precondition suite verifies graph semantics before Tinybench starts. It checks singleton, transient, and scoped identities, lazy non-eagerness, and disposal. The timed scenarios assume that contract has passed and answer a separate question: how much does each container charge for one DI operation? A benchmark result does not replace the contract checks.

Use the production mappings to relate each measurement to the container work around an application operation. They exclude handler logic, framework routing, database calls, network I/O, and work performed inside a real disposer.

### Resolution and object construction

| Scenario | Timed operation | Purpose and result meaning | Production mapping | Batch size |
|---|---|---|---|---:|
| Hot singleton resolve | Resolve the already-created root `Service`. Each operation follows the warm cache-hit path and returns the same instance. | Isolates key lookup and cached-value return overhead. The result shows the cost of asking the container for a shared object after startup; it does not include construction. | Repeated access to a shared logger, configuration object, database client, repository, or application service from handlers and factories. | 1000 |
| Transient resolve | Construct one `TransientService`, resolve its already-created singleton `Repo` and `Logger`, and invoke the two-argument constructor. | Covers transient creation plus two warm dependency lookups. The result shows the total per-use cost of container resolution and a small constructor with shared collaborators. | Creating a command handler, use-case object, serializer, or other short-lived service for each request, message, or operation. | 250 |
| Deep graph (10 levels) | Resolve `L9` and construct the all-transient chain from `L9` through `L0`, producing ten new objects per operation. | Stresses recursive graph traversal and repeated transient construction. The result shows the cost of resolving one ten-step dependency chain. | A layered request path such as controller to application service to domain service to repository, when each layer uses a transient lifetime. Application work inside those layers remains outside the benchmark. | 100 |
| Wide graph (4 dependencies) | Construct transient `Wide4` with four already-created singleton dependencies: `Logger`, `Config`, `Repo`, and `Service`. | Represents ordinary constructor fan-out. The result combines four warm lookups, argument assembly, and one constructor call. | A handler or use-case object that coordinates a few shared services. | 250 |
| Wide graph (10 dependencies) | Construct transient `Wide10` with ten already-created singleton dependencies. | Stresses high-arity dependency lookup and constructor invocation. InferDI uses this case to cover its 8+ dependency construction path. | A controller, coordinator, or integration service with many clients. Teams can use this upper-end case to assess large constructor shapes. | 100 |
| Lazy resolve | Resolve the warm `LazyConsumer`, invoke its already-created lazy wrapper or thunk, and resolve the warm singleton `Logger` target. | Isolates the steady-state cost of deferred access: the consumer cache hit, wrapper call, and target lookup. It does not measure wrapper creation or the first construction of the lazy target. | Accessing an optional or expensive singleton from the feature path that needs it after the application graph has warmed. | 1000 |

### Startup and cold graphs

| Scenario | Timed operation | Purpose and result meaning | Production mapping | Batch size |
|---|---|---|---|---:|
| Registration | Configure an independent graph with the benchmark registrations without resolving any service. | Isolates runtime registration and graph-building cost. The result shows container setup overhead, separate from object construction and cache population. | Process startup, serverless cold start, per-test containers, or an application that creates an isolated graph for a tenant or module. Module import and decorator evaluation stay outside the timed region. | 10 |
| First resolve | Resolve singleton `Service` from each preconfigured cold graph. The call creates `Logger`, `Config`, `Repo`, and `Service` and fills their caches. | Isolates the first cache-miss path after registration. The result includes dependency traversal and initial object creation, but excludes graph configuration. | The first request after process startup, the first use of a module initialized on demand, or the first test that touches a configured graph. | 100 |

### Request scope lifecycle

| Scenario | Timed operation | Purpose and result meaning | Production mapping | Batch size |
|---|---|---|---|---:|
| Scope creation | Create a child or request scope without resolving from it. Adapter-required scoped registration is part of this operation. | Isolates the fixed cost paid before scoped services are used. The result shows the per-unit overhead of establishing a lifetime boundary. | Opening a scope for an HTTP request, queue message, scheduled job, transaction, or unit of work. | 100 |
| First scoped resolve | Resolve `ScopedService` once from each prepared scope while the root `Logger` singleton is warm. Scope creation happens before timing. | Measures a scoped cache miss, parent lookup, construction, and insertion into the scope cache. It separates first scoped use from scope creation. | The first middleware, controller, or handler in a request that asks for a request-scoped service. | 100 |
| Warm scoped resolve | Resolve the already-created `ScopedService` many times from one prepared scope. | Isolates the scoped cache-hit path. The result shows the cost of retrieving the same request-owned object more than once inside one lifetime boundary. | Several middleware layers, handlers, or application services accessing the same request context, transaction wrapper, or unit-of-work service. | 1000 |
| Sync teardown | Dispose each prepared and resolved scope through its synchronous API. The scope owns one `ScopedService` whose disposer increments a counter. | Covers scope bookkeeping and synchronous disposer dispatch. Construction and resolution happen before timing, and the fixture performs no I/O. | Ending a request or job and releasing scope-owned in-memory resources through `Symbol.dispose`, `destroy`, reset, or an equivalent synchronous contract. | 100 |
| Async teardown | Dispose prepared and resolved scopes one at a time through their asynchronous APIs, awaiting each result. The fixture disposer itself performs no I/O. | Covers asynchronous disposal dispatch, promise handling, and sequential awaits without database or network latency. It supports comparison between containers whose public cleanup contract is asynchronous. | Ending a request, message, or job through an async scope API. A real transaction commit, socket close, or remote cleanup would dominate this container overhead. | 100 |

Tinybench hooks prepare cold graphs and scopes outside each timing region. Cleanup after registration, first resolve, scope creation, and scoped resolve also runs outside timing.

TypeDI reports `N/A` for runtime registration because its equivalent service definitions run as decorator side effects during module evaluation. The suite keeps import startup out of the registration table. InversifyJS reports `N/A` for teardown. TypeDI appears only in sync teardown. Awilix, TSyringe, and Typed Inject appear only in async teardown. InferDI appears in both teardown tables because it exposes both contracts.

## Measurement method

One Tinybench sample executes the scenario's full batch. Batch size controls harness overhead and memory pressure; it does not model a production request that performs the operation that many times. Cheap cache hits use larger batches, while allocation and teardown cases use smaller batches. The round result stores Tinybench's measured statistics and sample count, then divides the median batch duration by the batch size to produce `ns/op`.

The public profile measures each subject for 100 ms after a 50 ms warmup. Every subject runs in a fresh Node process, so implementations cannot inherit JIT feedback, inline caches, or GC history from one another. A balanced Latin-square block has eight rounds: every subject occupies every process position once, every ordered adjacent subject pair occurs once, and `InferDI (default)` precedes `InferDI (fast)` in four rounds and follows it in four. This counterbalances process launch drift and immediate predecessor effects without sharing runtime state between measurements.

The reporter aggregates the normalized value for each `scenario × subject` pair across subject-isolated rounds. It publishes the median and median absolute deviation (MAD). Relative factors use the aggregated scenario median. `N/A` rows do not enter the ranking or relative-factor calculation. The reporter does not compute an overall score.

## Raw result

Each public JSON file contains:

- schema version, timestamp, run mode, InferDI artifact path, commit SHA, and dirty flag;
- Node and pnpm versions, OS, architecture, CPU model, and the CPU governor when Linux exposes it;
- exact versions of every benchmark subject, Tinybench, and Vitest;
- round number, subject launch order, subject-level process-isolation metadata, timing configuration, batch size, Tinybench statistics, sample count, and normalized `ns/op`.

`results/quick-*.json` files stay local. Public result files remain available for review and commit.

## Adapter notes

- Awilix PROXY uses explicit factories for classes with positional constructors. CLASSIC resolves constructor parameters by name. Parameter names in `fixtures/plain.ts` match registration keys.
- SWC emits decorator metadata for InversifyJS, TSyringe, and TypeDI. Vitest's other TypeScript transforms remain disabled for these files.
- TSyringe decorators emit constructor metadata. The adapter still performs token and lifecycle registration at runtime, so its registration scenario measures that configuration work.
- TypeDI keeps build graphs isolated and injects the root logger into `ScopedService` through a global token. A scope registers the service under a local token, so both scopes share the root logger without sharing the scoped service.
- InversifyJS and Typed Inject add the scoped registration while creating a child because their root graph cannot express the same cache boundary in advance. Scope creation includes that work.
- InversifyJS uses WeakRef-backed planning caches. After a batch releases its temporary containers or scopes, the runner gives InversifyJS one event-loop turn outside the timed region so V8 can reclaim that completed batch instead of retaining every batch until the Tinybench job ends.
- Awilix and Typed Inject expose asynchronous container disposal. TSyringe's `dispose()` also returns a promise. The async teardown scenario awaits each scope in sequence.

## Workspace layout

```text
benchmarks/
├── package.json
├── pnpm-lock.yaml
├── scripts/
│   ├── run-benchmarks.mjs
│   ├── merge-benchmark-results.mjs
│   └── report-benchmarks.mjs
└── src/
    ├── containers/
    │   ├── types.ts
    │   ├── subjects.ts
    │   └── <adapter>.ts
    ├── fixtures/
    ├── precondition/
    │   ├── adapter-contract.test.ts
    │   ├── benchmark-merge.test.mjs
    │   └── report-benchmarks.test.mjs
    └── runner/
        └── benchmark-round.test.ts
```

`pnpm-workspace.yaml` contains `packages: []`. pnpm therefore keeps benchmark dependencies and its lockfile separate from the root workspace.
