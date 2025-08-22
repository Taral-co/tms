import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useChatWidgetForm } from '../hooks/useChatWidgetForm'
import { PageHeader } from '../components/widget-form/PageHeader'
import { BasicInformationSection } from '../components/widget-form/BasicInformationSection'
import { AgentPersonalizationSection } from '../components/widget-form/AgentPersonalizationSection'
import { FeaturesSection } from '../components/widget-form/FeaturesSection'
import { AppearanceSection } from '../components/widget-form/AppearanceSection'
import { WidgetSimulation } from '../components/widget-form/WidgetSimulation'
import { FormActions } from '../components/widget-form/FormActions'

export function CreateChatWidgetPage() {
  const navigate = useNavigate()
  const {
    widgetId,
    domains,
    loading,
    submitting,
    error,
    formData,
    updateFormData,
    submitForm
  } = useChatWidgetForm()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const success = await submitForm()
    if (success) {
      navigate(`/chat/widgets?${widgetId ? 'updated' : 'created'}=true`)
    }
  }

  const handleCancel = () => {
    navigate('/chat/widgets')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading widget configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-h-screen p-6 overflow-y-auto">

      {/* Alerts and Messages */}
      <PageHeader 
        widgetId={widgetId}
        error={error}
        domains={domains}
      />

      {/* Form Content */}
      {domains.length > 0 && (
        <form onSubmit={handleSubmit}>
          {/* Form Grid Layout */}
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            
            {/* Left Column - Form Sections */}
            <div className="xl:col-span-7 space-y-6">
              <BasicInformationSection
                formData={formData}
                domains={domains}
                widgetId={widgetId}
                onUpdate={updateFormData}
              />

              <AgentPersonalizationSection
                formData={formData}
                onUpdate={updateFormData}
              />

              <FeaturesSection
                formData={formData}
                onUpdate={updateFormData}
              />

              <AppearanceSection
                formData={formData}
                onUpdate={updateFormData}
              />
            </div>

            {/* Right Column - Live Preview */}
            <div className="xl:col-span-5">
              <div className="xl:sticky xl:top-0">
                <WidgetSimulation
                  formData={formData}
                  domains={domains}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-border pt-6 mt-8">
            <FormActions
              submitting={submitting}
              widgetId={widgetId}
              onCancel={handleCancel}
            />
          </div>
        </form>
      )}
    </div>
  )
}