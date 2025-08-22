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
    <div className="flex flex-col w-full min-w-0">
      {/* Card container with enterprise styling */}
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col space-y-1">
            <h3 className="text-base font-semibold leading-none tracking-tight">
              Appearance & Styling
            </h3>
            <p className="text-sm text-muted-foreground">
              Customize the visual appearance and behavior of your chat widget
            </p>
          </div>
        </div>

        {/* Form content */}
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {/* Widget Shape and Bubble Style */}
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              <div className="space-y-2">
                <label 
                  htmlFor="widget-shape" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Widget Shape <span className="text-destructive">*</span>
                </label>
                <select
                  id="widget-shape"
                  value={formData.widget_shape}
                  onChange={(e) => onUpdate({ widget_shape: e.target.value as any })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-describedby="widget-shape-description"
                >
                  {widgetShapes.map((shape) => (
                    <option key={shape.value} value={shape.value}>
                      {shape.preview} {shape.label}
                    </option>
                  ))}
                </select>
                <p id="widget-shape-description" className="text-xs text-muted-foreground">
                  Choose the overall shape of your chat widget button
                </p>
              </div>

              <div className="space-y-2">
                <label 
                  htmlFor="bubble-style" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Bubble Style <span className="text-destructive">*</span>
                </label>
                <select
                  id="bubble-style"
                  value={formData.chat_bubble_style}
                  onChange={(e) => onUpdate({ chat_bubble_style: e.target.value as any })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-describedby="bubble-style-description"
                >
                  {bubbleStyles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
                <p id="bubble-style-description" className="text-xs text-muted-foreground">
                  Select the style for chat message bubbles
                </p>
              </div>
            </div>

            {/* Color, Size, and Position */}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
              <div className="space-y-2">
                <label 
                  htmlFor="primary-color" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Primary Color <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => onUpdate({ primary_color: e.target.value })}
                    className="h-10 w-16 rounded-md border border-input bg-background cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    aria-describedby="primary-color-description"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => onUpdate({ primary_color: e.target.value })}
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="#000000"
                  />
                </div>
                <p id="primary-color-description" className="text-xs text-muted-foreground">
                  Main theme color for the widget
                </p>
              </div>

              <div className="space-y-2">
                <label 
                  htmlFor="widget-size" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Widget Size <span className="text-destructive">*</span>
                </label>
                <select
                  id="widget-size"
                  value={formData.widget_size}
                  onChange={(e) => onUpdate({ widget_size: e.target.value as any })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-describedby="widget-size-description"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
                <p id="widget-size-description" className="text-xs text-muted-foreground">
                  Overall size of the chat widget
                </p>
              </div>

              <div className="space-y-2">
                <label 
                  htmlFor="position" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Position <span className="text-destructive">*</span>
                </label>
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => onUpdate({ position: e.target.value as any })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-describedby="position-description"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
                <p id="position-description" className="text-xs text-muted-foreground">
                  Where the widget appears on the page
                </p>
              </div>
            </div>

            {/* Auto-open delay */}
            <div className="space-y-2">
              <label 
                htmlFor="auto-open-delay" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Auto-open Delay (seconds)
              </label>
              <input
                id="auto-open-delay"
                type="number"
                min="0"
                max="30"
                step="1"
                value={formData.auto_open_delay}
                onChange={(e) => onUpdate({ auto_open_delay: Number(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="0"
                aria-describedby="auto-open-delay-description"
              />
              <p id="auto-open-delay-description" className="text-xs text-muted-foreground">
                How many seconds to wait before automatically opening the chat widget (0 = disabled)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
