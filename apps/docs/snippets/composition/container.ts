import { Container } from '@inferdi/inferdi'
import { GetGreeting } from './domain'
import { PostgresUserStore } from './infrastructure'

export const container = new Container()
  .registerValue('dsn', 'postgres://localhost/app')
  .registerClass('users', PostgresUserStore, ['dsn'])
  .registerClass('greeting', GetGreeting, ['users'])
