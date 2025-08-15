import React from 'react'
import { cn } from '../../utils'

interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'default'
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  children?: React.ReactNode
  className?: string
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, size = 'md', showDot = true, children, className, ...props }, ref) => {
    const statusColors = {
      success: 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-800/30',
      warning: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-800/30',
      error: 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-800/30',
      info: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-800/30',
      default: 'text-muted-foreground bg-muted border-border'
    }
    
    const dotColors = {
      success: 'bg-green-500',
      warning: 'bg-amber-500', 
      error: 'bg-red-500',
      info: 'bg-blue-500',
      default: 'bg-muted-foreground'
    }
    
    const sizeStyles = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base'
    }
    
    const dotSizes = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border font-medium",
          statusColors[status],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {showDot && (
          <div className={cn(
            "rounded-full",
            dotColors[status],
            dotSizes[size]
          )} />
        )}
        {children}
      </div>
    )
  }
)
StatusIndicator.displayName = "StatusIndicator"

export { StatusIndicator }
