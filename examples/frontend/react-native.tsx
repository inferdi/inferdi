import { Container } from '@inferdi/inferdi'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react'

class ScreenContext {
  screenName = ''
}

class DeviceStorage {
  async getItem(key: string) {
    return `value:${key}`
  }
}

class SettingsViewModel {
  constructor(
    private readonly screen: ScreenContext,
    private readonly storage: DeviceStorage,
  ) {}

  async loadTheme() {
    return {
      screen: this.screen.screenName,
      theme: await this.storage.getItem('theme'),
    }
  }
}

const root = new Container()
  .registerClass('screen', ScreenContext, [], 'scoped')
  .registerClass('storage', DeviceStorage, [])
  .registerClass('settingsVm', SettingsViewModel, ['screen', 'storage'], 'scoped')

type AppContainer = typeof root
type ScreenContainer = ReturnType<typeof createSettingsScreenScope>

function createSettingsScreenScope(parent: AppContainer) {
  const scope = parent.createScope()
  try {
    scope.get('screen').screenName = 'settings'
    return scope
  } catch (error) {
    scope.dispose().catch(console.error)
    throw error
  }
}

const RootDIContext = createContext<AppContainer | null>(null)
const ScreenDIContext = createContext<ScreenContainer | null>(null)

export function AppDIProvider({ children }: PropsWithChildren) {
  return <RootDIContext.Provider value={root}>{children}</RootDIContext.Provider>
}

export function SettingsScreenScope({ children }: PropsWithChildren) {
  const parent = useContext(RootDIContext)
  if (parent === null) throw new Error('DI provider is missing')

  // useState with a lazy initializer (not useMemo) — see the React example
  // for the rationale: useMemo is not a guarantee, lazy useState is.
  const [scope] = useState(() => createSettingsScreenScope(parent))

  useEffect(() => {
    return () => {
      scope.dispose().catch(console.error)
    }
  }, [scope])

  return <ScreenDIContext.Provider value={scope}>{children}</ScreenDIContext.Provider>
}

export function useSettingsViewModel() {
  const container = useContext(ScreenDIContext)
  if (container === null) throw new Error('Settings screen scope is missing')
  return container.get('settingsVm')
}
