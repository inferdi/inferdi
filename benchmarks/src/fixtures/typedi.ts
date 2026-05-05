import 'reflect-metadata'
import { Service, Inject } from 'typedi'

// No-op decorator for classes registered manually via Container.of(id).set(...).
// swc emits design:paramtypes only for classes that carry at least one decorator.
const ForceMetadata = (): ClassDecorator => () => {}

@Service()
export class Logger {
  log(_msg: string): void {}
}

@Service()
export class Config {
  readonly url = 'postgres://localhost/app'
}

@Service()
export class Repo {
  constructor(public logger: Logger, public config: Config) {}
}

@Service()
export class TypedDIService {
  constructor(public repo: Repo, public logger: Logger) {}
}

// Scenario 2 — a separate class with transient lifecycle (does not overlap with Service).
@Service({ transient: true })
export class TransientService {
  constructor(public repo: Repo, public logger: Logger) {}
}

// Scenario 6 — no @Service() (otherwise scope resolve returns the global singleton)
// but with @ForceMetadata() (otherwise swc skips design:paramtypes).
@ForceMetadata()
export class ScopedService {
  constructor(public logger: Logger) {}
}

// Wide4: root transient + singleton dependencies (see scenario 4a).
@Service({ transient: true })
export class Wide4 {
  constructor(
    public logger: Logger,
    public config: Config,
    public repo: Repo,
    public service: TypedDIService,
  ) {}
}

@Service() export class Dep0 {}
@Service() export class Dep1 {}
@Service() export class Dep2 {}
@Service() export class Dep3 {}
@Service() export class Dep4 {}
@Service() export class Dep5 {}
@Service() export class Dep6 {}
@Service() export class Dep7 {}
@Service() export class Dep8 {}
@Service() export class Dep9 {}

@Service({ transient: true })
export class Wide10 {
  constructor(
    public dep0: Dep0, public dep1: Dep1, public dep2: Dep2, public dep3: Dep3, public dep4: Dep4,
    public dep5: Dep5, public dep6: Dep6, public dep7: Dep7, public dep8: Dep8, public dep9: Dep9,
  ) {}
}

// Deep graph — all 10 levels transient (scenario 3).
@Service({ transient: true }) export class L0 {}
@Service({ transient: true }) export class L1 { constructor(public l0: L0) {} }
@Service({ transient: true }) export class L2 { constructor(public l1: L1) {} }
@Service({ transient: true }) export class L3 { constructor(public l2: L2) {} }
@Service({ transient: true }) export class L4 { constructor(public l3: L3) {} }
@Service({ transient: true }) export class L5 { constructor(public l4: L4) {} }
@Service({ transient: true }) export class L6 { constructor(public l5: L5) {} }
@Service({ transient: true }) export class L7 { constructor(public l6: L6) {} }
@Service({ transient: true }) export class L8 { constructor(public l7: L7) {} }
@Service({ transient: true }) export class L9 { constructor(public l8: L8) {} }

// LazyConsumer: explicit @Inject('lazyLogger') — type-based won't work (the type is Function).
export const LAZY_LOGGER_TOKEN = 'tdi.lazyLogger'

@Service()
export class LazyConsumer {
  constructor(@Inject(LAZY_LOGGER_TOKEN) public lazyLogger: () => Logger) {}

  use(): Logger {
    return this.lazyLogger()
  }
}
