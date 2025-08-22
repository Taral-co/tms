import { Palette } from 'lucide-react'
import type { CreateChatWidgetRequest } from '../../hooks/useChatWidgetForm'
import { widgetShapes, bubbleStyles } from '../../utils/widgetHelpers'

interface AppearanceSectionProps {
  formData: CreateChatWidgetRequest
  onUpdate: (updates: Partial<CreateChatWidgetRequest>) => void
}

export function AppearanceSection({ 
  formData, 
  onUpdate 
}: AppearanceSectionProps) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Appearance</h3>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="widget-shape" className="text-sm font-medium text-foreground">
              Widget Shape
            </label>
            <select
              id="widget-shape"
              value={formData.widget_shape}
              onChange={(e) => onUpdate({ widget_shape: e.target.value as any })}
              className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              {widgetShapes.map((shape) => (
                <option key={shape.value} value={shape.value}>
                  {shape.preview} {shape.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="bubble-style" className="text-sm font-medium text-foreground">
              Bubble Style
            </label>
            <select
              id="bubble-style"
              value={formData.chat_bubble_style}
              onChange={(e) => onUpdate({ chat_bubble_style: e.target.value as any })}
              className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              {bubbleStyles.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="primary-color" className="text-sm font-medium text-foreground">
              Primary Color
            </label>
            <input
              id="primary-color"
              type="color"
              value={formData.primary_color}
              onChange={(e) => onUpdate({ primary_color: e.target.value })}
              className="h-9 w-full rounded border border-input bg-background"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="widget-size" className="text-sm font-medium text-foreground">
              Size
            </label>
            <select
              id="widget-size"
              value={formData.widget_size}
              onChange={(e) => onUpdate({ widget_size: e.target.value as any })}
              className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="position" className="text-sm font-medium text-foreground">
              Position
            </label>
            <select
              id="position"
              value={formData.position}
              onChange={(e) => onUpdate({ position: e.target.value as any })}
              className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="auto-open-delay" className="text-sm font-medium text-foreground">
            Auto-open delay (seconds)
          </label>
          <input
            id="auto-open-delay"
            type="number"
            min="0"
            max="30"
            value={formData.auto_open_delay}
            onChange={(e) => onUpdate({ auto_open_delay: Number(e.target.value) })}
            className="h-9 w-full rounded border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
