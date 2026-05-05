import 'reflect-metadata'
import { injectable, inject } from 'inversify'

export const TOKENS = {
  Logger: 'inv.Logger',
  Config: 'inv.Config',
  Repo: 'inv.Repo',
  Service: 'inv.Service',
  TransientService: 'inv.TransientService',
  ScopedService: 'inv.ScopedService',
  Wide4: 'inv.Wide4',
  Wide10: 'inv.Wide10',
  Dep0: 'inv.Dep0', Dep1: 'inv.Dep1', Dep2: 'inv.Dep2', Dep3: 'inv.Dep3', Dep4: 'inv.Dep4',
  Dep5: 'inv.Dep5', Dep6: 'inv.Dep6', Dep7: 'inv.Dep7', Dep8: 'inv.Dep8', Dep9: 'inv.Dep9',
  L0: 'inv.L0', L1: 'inv.L1', L2: 'inv.L2', L3: 'inv.L3', L4: 'inv.L4',
  L5: 'inv.L5', L6: 'inv.L6', L7: 'inv.L7', L8: 'inv.L8', L9: 'inv.L9',
  LazyLogger: 'inv.LazyLogger',
  LazyConsumer: 'inv.LazyConsumer',
} as const

@injectable()
export class Logger {
  log(_msg: string): void {}
}

@injectable()
export class Config {
  readonly url = 'postgres://localhost/app'
}

@injectable()
export class Repo {
  constructor(
    @inject(TOKENS.Logger) public logger: Logger,
    @inject(TOKENS.Config) public config: Config,
  ) {}
}

@injectable()
export class Service {
  constructor(
    @inject(TOKENS.Repo) public repo: Repo,
    @inject(TOKENS.Logger) public logger: Logger,
  ) {}
}

@injectable()
export class TransientService {
  constructor(
    @inject(TOKENS.Repo) public repo: Repo,
    @inject(TOKENS.Logger) public logger: Logger,
  ) {}
}

@injectable()
export class ScopedService {
  constructor(@inject(TOKENS.Logger) public logger: Logger) {}
}

@injectable()
export class Wide4 {
  constructor(
    @inject(TOKENS.Logger) public logger: Logger,
    @inject(TOKENS.Config) public config: Config,
    @inject(TOKENS.Repo) public repo: Repo,
    @inject(TOKENS.Service) public service: Service,
  ) {}
}

@injectable() export class Dep0 {}
@injectable() export class Dep1 {}
@injectable() export class Dep2 {}
@injectable() export class Dep3 {}
@injectable() export class Dep4 {}
@injectable() export class Dep5 {}
@injectable() export class Dep6 {}
@injectable() export class Dep7 {}
@injectable() export class Dep8 {}
@injectable() export class Dep9 {}

@injectable()
export class Wide10 {
  constructor(
    @inject(TOKENS.Dep0) public dep0: Dep0,
    @inject(TOKENS.Dep1) public dep1: Dep1,
    @inject(TOKENS.Dep2) public dep2: Dep2,
    @inject(TOKENS.Dep3) public dep3: Dep3,
    @inject(TOKENS.Dep4) public dep4: Dep4,
    @inject(TOKENS.Dep5) public dep5: Dep5,
    @inject(TOKENS.Dep6) public dep6: Dep6,
    @inject(TOKENS.Dep7) public dep7: Dep7,
    @inject(TOKENS.Dep8) public dep8: Dep8,
    @inject(TOKENS.Dep9) public dep9: Dep9,
  ) {}
}

@injectable() export class L0 {}
@injectable() export class L1 { constructor(@inject(TOKENS.L0) public l0: L0) {} }
@injectable() export class L2 { constructor(@inject(TOKENS.L1) public l1: L1) {} }
@injectable() export class L3 { constructor(@inject(TOKENS.L2) public l2: L2) {} }
@injectable() export class L4 { constructor(@inject(TOKENS.L3) public l3: L3) {} }
@injectable() export class L5 { constructor(@inject(TOKENS.L4) public l4: L4) {} }
@injectable() export class L6 { constructor(@inject(TOKENS.L5) public l5: L5) {} }
@injectable() export class L7 { constructor(@inject(TOKENS.L6) public l6: L6) {} }
@injectable() export class L8 { constructor(@inject(TOKENS.L7) public l7: L7) {} }
@injectable() export class L9 { constructor(@inject(TOKENS.L8) public l8: L8) {} }

@injectable()
export class LazyConsumer {
  constructor(@inject(TOKENS.LazyLogger) public lazyLogger: () => Logger) {}

  use(): Logger {
    return this.lazyLogger()
  }
}
