import React from 'react'
import { cn } from '../../utils'

interface DataCardProps {
  children: React.ReactNode
  className?: string
}

interface DataCardHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DataCardTitleProps {
  children: React.ReactNode
  className?: string
}

interface DataCardContentProps {
  children: React.ReactNode
  className?: string
}

interface DataCardActionsProps {
  children: React.ReactNode
  className?: string
}

const DataCard = React.forwardRef<HTMLDivElement, DataCardProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
DataCard.displayName = "DataCard"

const DataCardHeader = React.forwardRef<HTMLDivElement, DataCardHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between p-6 pb-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
DataCardHeader.displayName = "DataCardHeader"

const DataCardTitle = React.forwardRef<HTMLHeadingElement, DataCardTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold text-card-foreground",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
)
DataCardTitle.displayName = "DataCardTitle"

const DataCardContent = React.forwardRef<HTMLDivElement, DataCardContentProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 pb-6", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DataCardContent.displayName = "DataCardContent"

const DataCardActions = React.forwardRef<HTMLDivElement, DataCardActionsProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
DataCardActions.displayName = "DataCardActions"

export {
  DataCard,
  DataCardHeader,
  DataCardTitle,
  DataCardContent,
  DataCardActions,
}
