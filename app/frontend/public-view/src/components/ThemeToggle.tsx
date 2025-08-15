import { ThemeToggle as SharedThemeToggle } from '@tms/shared'

// Wrapper component to handle potential context issues
export function ThemeToggle({ className }: { className?: string }) {
  try {
    return <SharedThemeToggle className={className} />
  } catch (error) {
    // Fallback if theme context is not available
    console.warn('ThemeToggle: Theme context not available, using fallback')
    return (
      <button
        onClick={() => {
          const root = document.documentElement
          const currentTheme = root.getAttribute('data-theme') || 'light'
          const nextTheme = currentTheme === 'light' ? 'dark' : 'light'
          root.setAttribute('data-theme', nextTheme)
          localStorage.setItem('tms-theme', nextTheme)
        }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
        aria-label="Toggle theme"
      >
        🌙
      </button>
    )
  }
}
