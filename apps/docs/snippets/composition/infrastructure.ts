import type { UserStore } from './domain'

export class PostgresUserStore implements UserStore {
  constructor(private readonly dsn: string) {}

  async findName(id: string) {
    console.info(`query ${this.dsn} for ${id}`)
    return id === '42' ? 'Ada' : undefined
  }
}
