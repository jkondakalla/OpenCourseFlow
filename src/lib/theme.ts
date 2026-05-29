import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

export type ThemeName = 'light' | 'dark'

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const theme = useAppStore(s => s.settings.theme) as ThemeName
  const updateSettings = useAppStore(s => s.updateSettings)

  useEffect(() => {
    applyTheme(theme === 'light' ? 'light' : 'dark')
  }, [theme])

  return {
    theme,
    setTheme: (t: ThemeName) => updateSettings({ theme: t }),
    toggle: () => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' }),
  }
}
