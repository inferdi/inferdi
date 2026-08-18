import { Container } from '@inferdi/inferdi'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState
} from 'react'

type ScreenContext = {
  readonly screenName: string
}

class DeviceStorage {
  async getItem(key: string) {
    return `value:${key}`
  }
}

class SettingsViewModel {
  constructor(
    private readonly screen: ScreenContext,
    private readonly storage: DeviceStorage
  ) {}

  async loadTheme() {
    return {
      screen: this.screen.screenName,
      theme: await this.storage.getItem('theme')
    }
  }
}

const root = new Container()
  .declareScopeInputs<{ screen: ScreenContext }>()
  .registerClass('storage', DeviceStorage, [])
  .registerClass('settingsVm', SettingsViewModel, ['screen', 'storage'], 'scoped')

type AppContainer = typeof root
type ScreenContainer = ReturnType<typeof createSettingsScreenScope>

function createSettingsScreenScope(parent: AppContainer) {
  return parent.createScope({
    screen: { screenName: 'settings' }
  })
}

const RootDIContext = createContext<AppContainer | null>(null)
const ScreenDIContext = createContext<ScreenContainer | null>(null)

export function AppDIProvider({ children }: PropsWithChildren) {
  return <RootDIContext.Provider value={root}>{children}</RootDIContext.Provider>
}

export function SettingsScreenScope({ children }: PropsWithChildren) {
  const parent = useContext(RootDIContext)
  if (parent === null) throw new Error('DI provider is missing')

  const [scope, setScope] = useState<ScreenContainer | null>(null)

  useEffect(() => {
    const nextScope = createSettingsScreenScope(parent)
    setScope(nextScope)

    return () => {
      nextScope.dispose().catch(console.error)
    }
  }, [parent])

  if (scope === null) return null

  return <ScreenDIContext.Provider value={scope}>{children}</ScreenDIContext.Provider>
}

export function useSettingsViewModel() {
  const container = useContext(ScreenDIContext)
  if (container === null) throw new Error('Settings screen scope is missing')
  return container.get('settingsVm')
}
