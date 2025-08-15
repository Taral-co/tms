import React from 'react'
import { cn } from '../../utils'

interface DetailSectionProps {
  children: React.ReactNode
  className?: string
}

interface DetailSectionHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DetailSectionTitleProps {
  children: React.ReactNode
  className?: string
}

interface DetailSectionContentProps {
  children: React.ReactNode
  className?: string
}

interface DetailItemProps {
  label: string
  value: React.ReactNode
  className?: string
  vertical?: boolean
}

const DetailSection = React.forwardRef<HTMLDivElement, DetailSectionProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("space-y-6", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DetailSection.displayName = "DetailSection"

const DetailSectionHeader = React.forwardRef<HTMLDivElement, DetailSectionHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("border-b border-border/40 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DetailSectionHeader.displayName = "DetailSectionHeader"

const DetailSectionTitle = React.forwardRef<HTMLHeadingElement, DetailSectionTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "text-xl font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
)
DetailSectionTitle.displayName = "DetailSectionTitle"

const DetailSectionContent = React.forwardRef<HTMLDivElement, DetailSectionContentProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("space-y-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DetailSectionContent.displayName = "DetailSectionContent"

const DetailItem = React.forwardRef<HTMLDivElement, DetailItemProps>(
  ({ label, value, className, vertical = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "group",
        vertical ? "space-y-2" : "flex items-center justify-between",
        className
      )}
      {...props}
    >
      <dt className={cn(
        "text-sm font-medium text-muted-foreground",
        vertical ? "block" : "flex-shrink-0"
      )}>
        {label}
      </dt>
      <dd className={cn(
        "text-sm text-foreground",
        vertical ? "block" : "text-right"
      )}>
        {value}
      </dd>
    </div>
  )
)
DetailItem.displayName = "DetailItem"

export {
  DetailSection,
  DetailSectionHeader,
  DetailSectionTitle,
  DetailSectionContent,
  DetailItem,
}
