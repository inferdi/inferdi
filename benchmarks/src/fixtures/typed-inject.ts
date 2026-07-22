/*
 * typed-inject is zero-reflection — factories must declare a static `inject` array.
 * Keys in `inject` match names in the context (which are also the constructor parameter names)
 */

export class Logger {
  log(_msg: string): void {}
}

export class Config {
  readonly url = 'postgres://localhost/app'
}

export class Repo {
  constructor(public logger: Logger, public config: Config) {}
  static readonly inject = ['logger', 'config'] as const
}

export class Service {
  constructor(public repo: Repo, public logger: Logger) {}
  static readonly inject = ['repo', 'logger'] as const
}

export class TransientService {
  constructor(public repo: Repo, public logger: Logger) {}
  static readonly inject = ['repo', 'logger'] as const
}

export class ScopedService {
  constructor(public logger: Logger) {}
  static readonly inject = ['logger'] as const
}

export class Wide4 {
  constructor(
    public logger: Logger,
    public config: Config,
    public repo: Repo,
    public service: Service
  ) {}
  static readonly inject = ['logger', 'config', 'repo', 'service'] as const
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
    public dep0: Dep0, public dep1: Dep1, public dep2: Dep2, public dep3: Dep3, public dep4: Dep4,
    public dep5: Dep5, public dep6: Dep6, public dep7: Dep7, public dep8: Dep8, public dep9: Dep9
  ) {}
  static readonly inject = [
    'dep0', 'dep1', 'dep2', 'dep3', 'dep4',
    'dep5', 'dep6', 'dep7', 'dep8', 'dep9'
  ] as const
}

export class L0 {}
export class L1 { constructor(public l0: L0) {}; static readonly inject = ['l0'] as const }
export class L2 { constructor(public l1: L1) {}; static readonly inject = ['l1'] as const }
export class L3 { constructor(public l2: L2) {}; static readonly inject = ['l2'] as const }
export class L4 { constructor(public l3: L3) {}; static readonly inject = ['l3'] as const }
export class L5 { constructor(public l4: L4) {}; static readonly inject = ['l4'] as const }
export class L6 { constructor(public l5: L5) {}; static readonly inject = ['l5'] as const }
export class L7 { constructor(public l6: L6) {}; static readonly inject = ['l6'] as const }
export class L8 { constructor(public l7: L7) {}; static readonly inject = ['l7'] as const }
export class L9 { constructor(public l8: L8) {}; static readonly inject = ['l8'] as const }

export class LazyConsumer {
  constructor(public lazyLogger: () => Logger) {}
  static readonly inject = ['lazyLogger'] as const
  use(): Logger { return this.lazyLogger() }
}
