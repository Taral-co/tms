import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Settings, 
  Bell, 
  User, 
  Inbox, 
  BarChart3, 
  Mail, 
  Moon, 
  Sun, 
  Monitor,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useTheme } from '../components/ThemeProvider'
import { CommandPalette } from './CommandPalette'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigation = [
    { name: 'Inbox', icon: Inbox, href: '/inbox', current: true },
    { name: 'Analytics', icon: BarChart3, href: '/analytics', current: false },
    { name: 'Integrations', icon: Mail, href: '/integrations', current: false },
    { name: 'Settings', icon: Settings, href: '/settings', current: false },
  ]

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />
    if (theme === 'dark') return <Moon className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar */}
      <div 
        className={`sidebar transition-all duration-200 ${
          sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border">
          {sidebarCollapsed ? (
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-fg font-bold text-sm">T</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-fg font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-fg">TMS</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`
                group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors
                ${item.current
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:bg-bg-muted hover:text-fg'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon
                className={`h-5 w-5 flex-shrink-0 ${
                  sidebarCollapsed ? '' : 'mr-3'
                }`}
                aria-hidden="true"
              />
              {!sidebarCollapsed && item.name}
            </a>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 mr-3" />
                Collapse
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          {/* Search */}
          <div className="flex flex-1 items-center">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                placeholder="Search tickets... (Cmd+K)"
                className="input pl-10 w-full"
                onFocus={() => setCommandPaletteOpen(true)}
                readOnly
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors"
              title={`Theme: ${theme}`}
            >
              {getThemeIcon()}
            </button>

            {/* Notifications */}
            <button className="rounded-md p-2 text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors">
              <Bell className="h-5 w-5" />
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="font-medium text-fg">Admin User</div>
                <div className="text-fg-muted">admin@acme.com</div>
              </div>
              <button className="rounded-full p-1 text-fg-muted hover:bg-bg-muted hover:text-fg transition-colors">
                <User className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </div>
  )
}
