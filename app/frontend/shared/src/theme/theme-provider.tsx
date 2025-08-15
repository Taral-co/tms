import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'hc' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: Exclude<Theme, 'system'>
  tenantPrimary?: string
  tenantPrimaryFg?: string
  setTenantBranding: (primary?: string, primaryFg?: string) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'tms-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [tenantPrimary, setTenantPrimary] = useState<string>()
  const [tenantPrimaryFg, setTenantPrimaryFg] = useState<string>()

  // Determine the resolved theme (light/dark/hc, never system)
  const resolvedTheme: Exclude<Theme, 'system'> = React.useMemo(() => {
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'light'
    }
    return theme
  }, [theme])

  // Load theme from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored && ['light', 'dark', 'hc', 'system'].includes(stored)) {
      setThemeState(stored as Theme)
    }
  }, [storageKey])

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-theme', resolvedTheme)

    // Apply tenant branding CSS variables
    if (tenantPrimary) {
      root.style.setProperty('--tenant-primary', tenantPrimary)
    } else {
      root.style.removeProperty('--tenant-primary')
    }

    if (tenantPrimaryFg) {
      root.style.setProperty('--tenant-primary-fg', tenantPrimaryFg)
    } else {
      root.style.removeProperty('--tenant-primary-fg')
    }
  }, [resolvedTheme, tenantPrimary, tenantPrimaryFg])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      // Trigger re-render to update resolvedTheme
      setThemeState('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)
  }

  const setTenantBranding = (primary?: string, primaryFg?: string) => {
    setTenantPrimary(primary)
    setTenantPrimaryFg(primaryFg)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        tenantPrimary,
        tenantPrimaryFg,
        setTenantBranding
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme toggle component
interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // const themes: Theme[] = ['light', 'dark', 'hc', 'system']
    const themes: Theme[] = ['light', 'dark']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️'
      case 'dark':
        return '🌙'
      case 'hc':
        return '🔆'
      case 'system':
        return '💻'
      default:
        return '☀️'
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'high contrast' : theme === 'hc' ? 'system' : 'light'} theme`}
    >
      {getThemeIcon()}
    </button>
  )
}
