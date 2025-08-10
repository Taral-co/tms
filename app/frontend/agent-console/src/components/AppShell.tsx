import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  ChevronRight,
  Home,
  Ticket,
  LogOut
} from 'lucide-react'
import { useTheme } from '../components/ThemeProvider'
import { useAuth } from '../hooks/useAuth'
import { CommandPalette } from './CommandPalette'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const location = useLocation()

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
    { name: 'Dashboard', icon: Home, href: '/dashboard' },
    { name: 'Inbox', icon: Inbox, href: '/inbox' },
    { name: 'Tickets', icon: Ticket, href: '/tickets' },
    { name: 'Analytics', icon: BarChart3, href: '/analytics' },
    { name: 'Integrations', icon: Mail, href: '/integrations' },
    { name: 'Settings', icon: Settings, href: '/settings' },
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

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div 
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-200 flex flex-col bg-card border-r border-border`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border">
          {sidebarCollapsed ? (
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">T</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-foreground">TMS</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickets... (Cmd+K)"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title={`Theme: ${theme}`}
            >
              {getThemeIcon()}
            </button>

            {/* Notifications */}
            <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <Bell className="h-5 w-5" />
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="font-medium text-foreground">{user?.name || 'Loading...'}</div>
                <div className="text-muted-foreground">{user?.email || ''}</div>
              </div>
              <div className="relative">
                <button className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  <User className="h-6 w-6" />
                </button>
                {/* Simple logout for now - could be expanded to dropdown menu */}
                <button
                  onClick={handleLogout}
                  className="ml-2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
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
