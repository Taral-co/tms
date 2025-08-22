import { useNavigate } from 'react-router-dom'
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-7xl mx-auto p-3 space-y-3">
        <PageHeader 
          widgetId={widgetId}
          error={error}
          domains={domains}
        />

        {/* Enhanced Form + Live Simulation Layout */}
        {domains.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              
              {/* Left Column - Form (60% width) */}
              <div className="xl:col-span-3 space-y-4">
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

              {/* Right Column - Live Simulation (40% width) */}
              <div className="xl:col-span-2">
                <WidgetSimulation
                  formData={formData}
                  domains={domains}
                />
              </div>
            </div>

            <FormActions
              submitting={submitting}
              widgetId={widgetId}
              onCancel={handleCancel}
            />
          </form>
        )}
      </div>
    </div>
  )
}