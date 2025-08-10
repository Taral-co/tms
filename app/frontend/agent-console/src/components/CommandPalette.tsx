import React, { useState, useEffect, useCallback } from 'react'
import { Search, Settings, User, Ticket, MessageSquare, BarChart3, Bell, LogOut } from 'lucide-react'

interface Command {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

const commands: Command[] = [
  {
    id: 'new-ticket',
    title: 'New Ticket',
    subtitle: 'Create a new support ticket',
    icon: <Ticket className="w-4 h-4" />,
    action: () => console.log('New ticket'),
    group: 'Actions'
  },
  {
    id: 'inbox',
    title: 'Go to Inbox',
    subtitle: 'View all tickets',
    icon: <MessageSquare className="w-4 h-4" />,
    action: () => console.log('Go to inbox'),
    group: 'Navigation'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'View performance metrics',
    icon: <BarChart3 className="w-4 h-4" />,
    action: () => console.log('Go to analytics'),
    group: 'Navigation'
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Configure your preferences',
    icon: <Settings className="w-4 h-4" />,
    action: () => console.log('Go to settings'),
    group: 'Navigation'
  },
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'View your profile',
    icon: <User className="w-4 h-4" />,
    action: () => console.log('Go to profile'),
    group: 'Account'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Check your notifications',
    icon: <Bell className="w-4 h-4" />,
    action: () => console.log('Go to notifications'),
    group: 'Account'
  },
  {
    id: 'logout',
    title: 'Sign Out',
    subtitle: 'End your session',
    icon: <LogOut className="w-4 h-4" />,
    action: () => console.log('Sign out'),
    group: 'Account'
  }
]

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(query.toLowerCase()) ||
    command.subtitle?.toLowerCase().includes(query.toLowerCase())
  )

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    if (!groups[command.group]) {
      groups[command.group] = []
    }
    groups[command.group].push(command)
    return groups
  }, {} as Record<string, Command[]>)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
    }
  }, [isOpen, onClose, filteredCommands, selectedIndex])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Commands List */}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, commands]) => (
              <div key={group}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {group}
                </div>
                {commands.map((command, index) => {
                  const globalIndex = filteredCommands.findIndex(c => c.id === command.id)
                  return (
                    <div
                      key={command.id}
                      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${
                        globalIndex === selectedIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground'
                      }`}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      onClick={() => {
                        command.action()
                        onClose()
                      }}
                    >
                      <div className="mr-2 h-4 w-4 shrink-0">
                        {command.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-xs text-muted-foreground">
                            {command.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
