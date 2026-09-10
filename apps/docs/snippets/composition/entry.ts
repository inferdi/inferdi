import { container } from './container'

export async function handleUser(id: string) {
  return container.get('greeting').execute(id)
}
