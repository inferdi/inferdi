import { Container } from '@inferdi/inferdi'

export class Logger {
  info(message: string) {
    console.info(message)
  }
}

export class UserService {
  constructor(private readonly logger: Logger) {}

  find(id: string) {
    this.logger.info(`user=${id}`)
    return { id }
  }
}

export const root = new Container()
  .registerClass('logger', Logger, [])
  .registerClass('users', UserService, ['logger'])

export const users = root.get('users')
