export interface UserStore {
  findName(id: string): Promise<string | undefined>
}

export class GetGreeting {
  constructor(private readonly users: UserStore) {}

  async execute(id: string) {
    const name = await this.users.findName(id)
    return name === undefined ? 'Hello, stranger' : `Hello, ${name}`
  }
}
