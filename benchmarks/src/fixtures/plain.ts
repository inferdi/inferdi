/*
 * Constructor parameter names match registration keys exactly.
 * Awilix CLASSIC resolves dependencies by parameter name — a mismatch raises ResolutionError
 */

export class Logger {
  log(_msg: string): void {}
}

export class Config {
  readonly url = 'postgres://localhost/app'
}

export class Repo {
  constructor(public logger: Logger, public config: Config) {}
}

export class Service {
  constructor(public repo: Repo, public logger: Logger) {}
}

export class TransientService {
  constructor(public repo: Repo, public logger: Logger) {}
}

export class ScopedService {
  constructor(public logger: Logger) {}
}

export class Wide4 {
  constructor(
    public logger: Logger,
    public config: Config,
    public repo: Repo,
    public service: Service
  ) {}
}

export class Dep0 {}
export class Dep1 {}
export class Dep2 {}
export class Dep3 {}
export class Dep4 {}
export class Dep5 {}
export class Dep6 {}
export class Dep7 {}
export class Dep8 {}
export class Dep9 {}

export class Wide10 {
  constructor(
    public dep0: Dep0,
    public dep1: Dep1,
    public dep2: Dep2,
    public dep3: Dep3,
    public dep4: Dep4,
    public dep5: Dep5,
    public dep6: Dep6,
    public dep7: Dep7,
    public dep8: Dep8,
    public dep9: Dep9
  ) {}
}

export class L0 {}
export class L1 { constructor(public l0: L0) {} }
export class L2 { constructor(public l1: L1) {} }
export class L3 { constructor(public l2: L2) {} }
export class L4 { constructor(public l3: L3) {} }
export class L5 { constructor(public l4: L4) {} }
export class L6 { constructor(public l5: L5) {} }
export class L7 { constructor(public l6: L6) {} }
export class L8 { constructor(public l7: L7) {} }
export class L9 { constructor(public l8: L8) {} }

// Lazy scenario: Service injects Lazy<Logger> (or the thunk equivalent in other containers)
export class LazyConsumer {
  constructor(public lazyLogger: { get(): Logger } | (() => Logger)) {}

  use(): Logger {
    const lazy = this.lazyLogger
    return typeof lazy === 'function' ? lazy() : lazy.get()
  }
}
