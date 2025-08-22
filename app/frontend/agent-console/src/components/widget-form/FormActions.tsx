import { Save } from 'lucide-react'

interface FormActionsProps {
  submitting: boolean
  widgetId?: string
  onCancel: () => void
}

export function FormActions({ submitting, widgetId, onCancel }: FormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center justify-center rounded text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
      >
        {submitting ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b border-primary-foreground mr-2"></div>
            {widgetId ? 'Updating...' : 'Creating...'}
          </>
        ) : (
          <>
            <Save className="h-3 w-3 mr-2" />
            {widgetId ? 'Update Widget' : 'Create Widget'}
          </>
        )}
      </button>
    </div>
  )
}
