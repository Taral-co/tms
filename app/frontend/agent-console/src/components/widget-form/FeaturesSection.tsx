import { Sparkles } from 'lucide-react'
import type { CreateChatWidgetRequest } from '../../hooks/useChatWidgetForm'

interface FeaturesSectionProps {
  formData: CreateChatWidgetRequest
  onUpdate: (updates: Partial<CreateChatWidgetRequest>) => void
}

export function FeaturesSection({ 
  formData, 
  onUpdate 
}: FeaturesSectionProps) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Features</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex items-center space-x-2">
          <input
            id="file-uploads"
            type="checkbox"
            checked={formData.allow_file_uploads}
            onChange={(e) => onUpdate({ allow_file_uploads: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <label htmlFor="file-uploads" className="text-sm text-foreground cursor-pointer">
            Allow file uploads
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="agent-avatars"
            type="checkbox"
            checked={formData.show_agent_avatars}
            onChange={(e) => onUpdate({ show_agent_avatars: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <label htmlFor="agent-avatars" className="text-sm text-foreground cursor-pointer">
            Show agent avatars
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="require-email"
            type="checkbox"
            checked={formData.require_email}
            onChange={(e) => onUpdate({ require_email: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <label htmlFor="require-email" className="text-sm text-foreground cursor-pointer">
            Require visitor email
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="sound-enabled"
            type="checkbox"
            checked={formData.sound_enabled}
            onChange={(e) => onUpdate({ sound_enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <label htmlFor="sound-enabled" className="text-sm text-foreground cursor-pointer">
            Sound notifications
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="show-powered-by"
            type="checkbox"
            checked={formData.show_powered_by}
            onChange={(e) => onUpdate({ show_powered_by: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <label htmlFor="show-powered-by" className="text-sm text-foreground cursor-pointer">
            Show branding
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="use-ai"
            type="checkbox"
            checked={formData.use_ai}
            onChange={(e) => onUpdate({ use_ai: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <label htmlFor="use-ai" className="text-sm text-foreground cursor-pointer">
            AI assistance (Beta)
          </label>
        </div>
      </div>
    </div>
  )
}
