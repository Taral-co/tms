import { MessageCircle } from 'lucide-react'
import type { CreateChatWidgetRequest } from '../../hooks/useChatWidgetForm'
import type { DomainValidation } from '../../lib/api'

interface BasicInformationSectionProps {
  formData: CreateChatWidgetRequest
  domains: DomainValidation[]
  widgetId?: string
  onUpdate: (updates: Partial<CreateChatWidgetRequest>) => void
}

export function BasicInformationSection({ 
  formData, 
  domains, 
  widgetId, 
  onUpdate 
}: BasicInformationSectionProps) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Basic Information</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="widget-name" className="text-sm font-medium text-foreground">
            Widget Name
          </label>
          <input
            id="widget-name"
            type="text"
            value={formData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Main Website Chat"
            className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="domain-select" className="text-sm font-medium text-foreground">
            Domain
          </label>
          {widgetId ? (
            <div className="h-9 w-full rounded border border-input bg-muted px-3 py-2 text-sm flex items-center">
              {domains.find(d => d.id === formData.domain_id)?.domain || 'Domain not found'}
            </div>
          ) : (
            <select
              id="domain-select"
              value={formData.domain_id}
              onChange={(e) => onUpdate({ domain_id: e.target.value })}
              className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select a domain</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.domain}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}
