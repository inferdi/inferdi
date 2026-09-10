import { GetGreeting, type UserStore } from './domain'

const fakeUsers: UserStore = {
  async findName(id) {
    return id === '42' ? 'Ada' : undefined
  }
}

const service = new GetGreeting(fakeUsers)
const result = await service.execute('42')

if (result !== 'Hello, Ada') {
  throw new Error(`Unexpected greeting: ${result}`)
}
