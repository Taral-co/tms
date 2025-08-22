import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DomainValidation } from '../../lib/api'

interface PageHeaderProps {
  widgetId?: string
  error: string | null
  domains: DomainValidation[]
}

export function PageHeader({ widgetId, error, domains }: PageHeaderProps) {
  return (
    <>
      {/* Compact Error Alert */}
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Compact Domain Warning */}
      {domains.length === 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Verify domains in Settings before creating widgets.{' '}
              <a href="/settings" className="underline font-medium">Go to Settings</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
