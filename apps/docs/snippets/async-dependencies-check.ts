import { Container } from '@inferdi/inferdi'

class Database {
  query() {}
}

const container = new Container()
  .registerAsyncFactory('database', async () => new Database(), [])

// @ts-expect-error declarative async registrations use getAsync
container.get('database')

await container.getAsync('database')
