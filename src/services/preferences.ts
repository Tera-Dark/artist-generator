export type ThemePreference = 'light' | 'dark' | 'system'
export type AppLocale = 'zh' | 'en'

export const THEME_STORAGE_KEY = 'theme'
export const LOCALE_STORAGE_KEY = 'locale'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getStoredThemePreference(): ThemePreference {
  if (!isBrowser()) return 'system'

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }

  return 'system'
}

export function resolveThemePreference(theme: ThemePreference): 'light' | 'dark' {
  if (!isBrowser()) return 'light'
  if (theme === 'light' || theme === 'dark') return theme

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyThemePreference(theme: ThemePreference) {
  if (!isBrowser()) return 'light' as const

  const resolvedTheme = resolveThemePreference(theme)
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  localStorage.setItem(THEME_STORAGE_KEY, theme)

  return resolvedTheme
}

export function getStoredLocale(): AppLocale {
  if (!isBrowser()) return 'zh'

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (stored === 'zh' || stored === 'en') {
    return stored
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function setStoredLocale(locale: AppLocale) {
  if (!isBrowser()) return
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}
