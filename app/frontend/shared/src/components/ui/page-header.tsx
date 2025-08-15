import React from 'react'
import { cn } from '../../utils'
import { Badge } from './badge'

interface PageHeaderProps {
  children?: React.ReactNode
  className?: string
}

interface PageHeaderTitleProps {
  children: React.ReactNode
  className?: string
}

interface PageHeaderDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface PageHeaderActionsProps {
  children: React.ReactNode
  className?: string
}

interface PageHeaderBreadcrumbProps {
  children: React.ReactNode
  className?: string
}

interface PageHeaderBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-6 pb-8 border-b border-border/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
PageHeader.displayName = "PageHeader"

const PageHeaderContent = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-start justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
)
PageHeaderContent.displayName = "PageHeaderContent"

const PageHeaderTitle = React.forwardRef<HTMLHeadingElement, PageHeaderTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn(
        "text-3xl font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
)
PageHeaderTitle.displayName = "PageHeaderTitle"

const PageHeaderDescription = React.forwardRef<HTMLParagraphElement, PageHeaderDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-lg text-muted-foreground mt-2",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
)
PageHeaderDescription.displayName = "PageHeaderDescription"

const PageHeaderActions = React.forwardRef<HTMLDivElement, PageHeaderActionsProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
)
PageHeaderActions.displayName = "PageHeaderActions"

const PageHeaderBreadcrumb = React.forwardRef<HTMLDivElement, PageHeaderBreadcrumbProps>(
  ({ children, className, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </nav>
  )
)
PageHeaderBreadcrumb.displayName = "PageHeaderBreadcrumb"

const PageHeaderBadge = React.forwardRef<HTMLDivElement, PageHeaderBadgeProps>(
  ({ children, variant = "secondary", className, ...props }, ref) => (
    <div ref={ref} {...props}>
      <Badge
        variant={variant}
        className={cn("ml-3", className)}
      >
        {children}
      </Badge>
    </div>
  )
)
PageHeaderBadge.displayName = "PageHeaderBadge"

export {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
  PageHeaderBreadcrumb,
  PageHeaderBadge,
}
