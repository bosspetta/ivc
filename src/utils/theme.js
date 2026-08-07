const STORAGE_KEY = 'ivc_theme'

export function getStoredTheme() {
  return (
    localStorage.getItem(STORAGE_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}
