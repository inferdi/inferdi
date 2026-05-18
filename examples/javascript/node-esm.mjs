// @ts-check

import { Container } from '@inferdi/inferdi'

class Logger {
  /**
   * @param {string} message
   */
  log(message) {
    console.log(`[LOG] ${message}`)
  }
}

class UserService {
  /**
   * @param {Logger} logger
   * @param {string} apiToken
   */
  constructor(logger, apiToken) {
    this.logger = logger
    this.apiToken = apiToken
  }

  /**
   * @param {string} id
   */
  find(id) {
    this.logger.log(`Finding user ${id} with token ${this.apiToken}`)
    return { id, name: 'Alice' }
  }
}

const container = new Container()
  .registerValue('token', 'secret-123')
  .registerClass('logger', Logger, [])
  .registerClass('userService', UserService, ['logger', 'token'])

// Uncomment in an editor with JavaScript type checking enabled:
// new Container()
//   .registerValue('token', 'secret-123')
//   .registerClass('logger', Logger, [])
//   .registerClass('userService', UserService, ['token', 'logger'])

console.log(container.get('userService').find('42'))

// If your runtime/toolchain supports Explicit Resource Management syntax,
// Container also supports: await using container = new Container()
await container.dispose()
