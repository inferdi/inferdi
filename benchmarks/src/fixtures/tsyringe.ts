import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'

export const TOKENS = {
  Logger: 'tsy.Logger',
  Config: 'tsy.Config',
  Repo: 'tsy.Repo',
  Service: 'tsy.Service',
  TransientService: 'tsy.TransientService',
  ScopedService: 'tsy.ScopedService',
  Wide4: 'tsy.Wide4',
  Wide10: 'tsy.Wide10',
  Dep0: 'tsy.Dep0', Dep1: 'tsy.Dep1', Dep2: 'tsy.Dep2', Dep3: 'tsy.Dep3', Dep4: 'tsy.Dep4',
  Dep5: 'tsy.Dep5', Dep6: 'tsy.Dep6', Dep7: 'tsy.Dep7', Dep8: 'tsy.Dep8', Dep9: 'tsy.Dep9',
  L0: 'tsy.L0', L1: 'tsy.L1', L2: 'tsy.L2', L3: 'tsy.L3', L4: 'tsy.L4',
  L5: 'tsy.L5', L6: 'tsy.L6', L7: 'tsy.L7', L8: 'tsy.L8', L9: 'tsy.L9',
  LazyLogger: 'tsy.LazyLogger',
  LazyConsumer: 'tsy.LazyConsumer'
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
    @inject(TOKENS.Config) public config: Config
  ) {}
}

@injectable()
export class Service {
  constructor(
    @inject(TOKENS.Repo) public repo: Repo,
    @inject(TOKENS.Logger) public logger: Logger
  ) {}
}

@injectable()
export class TransientService {
  constructor(
    @inject(TOKENS.Repo) public repo: Repo,
    @inject(TOKENS.Logger) public logger: Logger
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
    @inject(TOKENS.Service) public service: Service
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
    @inject(TOKENS.Dep9) public dep9: Dep9
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
