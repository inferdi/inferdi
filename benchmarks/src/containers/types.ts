export type MaybePromise<T> = T | PromiseLike<T>

export interface LoggerValue {
  log(message: string): void
}

export interface ConfigValue {
  readonly url: string
}

export interface RepoValue {
  readonly logger: LoggerValue
  readonly config: ConfigValue
}

export interface ServiceValue {
  readonly repo: RepoValue
  readonly logger: LoggerValue
}

export interface TransientValue {
  readonly repo: RepoValue
  readonly logger: LoggerValue
}

export interface ScopedValue {
  readonly logger: LoggerValue
  readonly disposeCount: number
}

export interface Wide4Value {
  readonly logger: LoggerValue
  readonly config: ConfigValue
  readonly repo: RepoValue
  readonly service: ServiceValue
}

export interface Wide10Value {
  readonly dep0: object
  readonly dep1: object
  readonly dep2: object
  readonly dep3: object
  readonly dep4: object
  readonly dep5: object
  readonly dep6: object
  readonly dep7: object
  readonly dep8: object
  readonly dep9: object
}

export interface DeepValue {
  readonly l8: {
    readonly l7: {
      readonly l6: {
        readonly l5: {
          readonly l4: {
            readonly l3: {
              readonly l2: {
                readonly l1: {
                  readonly l0: object
                }
              }
            }
          }
        }
      }
    }
  }
}

export interface ColdGraph {
  resolveService(): ServiceValue
  release(): MaybePromise<void>
}

export type TeardownCapability = 'none' | 'sync' | 'async' | 'both'

export interface ScopeHandle {
  resolve(): ScopedValue
  release(): MaybePromise<void>
  disposeSync?: () => void
  disposeAsync?: () => Promise<void>
}

export interface Resolver {
  readonly teardown: TeardownCapability
  readonly requiresCleanupTurn?: boolean
  release(): MaybePromise<void>
  resolveLogger(): LoggerValue
  resolveConfig(): ConfigValue
  resolveRepo(): RepoValue
  resolveService(): ServiceValue
  resolveTransient(): TransientValue
  resolveDeep(): DeepValue
  resolveWide4(): Wide4Value
  resolveWide10(): Wide10Value
  registerGraph?: () => ColdGraph
  createColdGraph(): ColdGraph
  createScope(): ScopeHandle
  resolveLazy(): LoggerValue
}

export interface Subject {
  readonly name: string
  build(): Resolver
}
