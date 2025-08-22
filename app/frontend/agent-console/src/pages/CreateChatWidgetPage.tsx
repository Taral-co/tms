import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit3 } from 'lucide-react'
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
    <div className="w-full bg-background">
      {/* Page Header with Breadcrumb */}

      {/* Main Content */}
      <div className="w-full">
        <div className="container mx-auto max-w-screen-2xl px-4">
          <div className="flex flex-col gap-6">
            {/* Alerts and Messages */}
            <PageHeader 
              widgetId={widgetId}
              error={error}
              domains={domains}
            />

            {/* Form Content */}
            {domains.length > 0 && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Form Grid Layout */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  
                  {/* Left Column - Form Sections */}
                  <div className="lg:col-span-7 xl:col-span-8">
                    <div className="flex flex-col gap-6">
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
                  </div>

                  {/* Right Column - Live Preview */}
                  <div className="lg:col-span-5 xl:col-span-4">
                    <div className="lg:sticky">
                      <WidgetSimulation
                        formData={formData}
                        domains={domains}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="border-t border-border pt-6">
                  <FormActions
                    submitting={submitting}
                    widgetId={widgetId}
                    onCancel={handleCancel}
                  />
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}