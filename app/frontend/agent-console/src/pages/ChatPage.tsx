import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Routes, Route, useParams } from 'react-router-dom'
import { MessageCircle, Settings } from 'lucide-react'
import { ChatSessionsPage } from './ChatSessionsPage'
import { ChatWidgetsPage } from './ChatWidgetsPage'
import { CreateChatWidgetPage } from './CreateChatWidgetPage'
import { apiClient } from '../lib/api'

type ChatTab = 'sessions' | 'widgets'

interface GuidedSetupState {
  hasWidgets: boolean
  hasSessions: boolean
  loading: boolean
}

// Wrapper component to extract sessionId from URL params
function ChatSessionPageWrapper() {
  const { sessionId } = useParams<{ sessionId: string }>()
  return <ChatSessionsPage initialSessionId={sessionId} />
}

export function ChatPage() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Determine active tab from URL
  const getTabFromPath = (pathname: string): ChatTab => {
    if (pathname.includes('/chat/widgets') || pathname.includes('/chat/widget/create')) return 'widgets'
    return 'sessions'
  }
  
  const [activeTab, setActiveTab] = useState<ChatTab>(() => getTabFromPath(location.pathname))
  const [guidedSetup, setGuidedSetup] = useState<GuidedSetupState>({
    hasWidgets: false,
    hasSessions: false,
    loading: true
  })

  // Check setup status
  useEffect(() => {
    checkSetupStatus()
  }, [])

  // Update tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname)
    setActiveTab(newTab)
  }, [location.pathname])

  const checkSetupStatus = async () => {
    try {
      setGuidedSetup(prev => ({ ...prev, loading: true }))
      
      const [widgets, sessions] = await Promise.all([
        apiClient.listChatWidgets().catch(() => []),
        apiClient.listChatSessions().catch(() => [])
      ])
      
      setGuidedSetup({
        hasWidgets: widgets.length > 0,
        hasSessions: sessions.length > 0,
        loading: false
      })
    } catch (_error) {
      setGuidedSetup(prev => ({ ...prev, loading: false }))
    }
  }

  // Handle tab change and update URL
  const handleTabChange = (tab: ChatTab) => {
    setActiveTab(tab)
    const newPath = tab === 'widgets' ? '/chat/widgets' : '/chat/sessions'
    navigate(newPath, { replace: true })
  }
  const tabs = [
    {
      id: 'widgets' as const,
      name: 'Chat Widgets',
      icon: Settings,
      description: 'Configure chat widgets for your domains',
      disabled: false
    },
    {
      id: 'sessions' as const,
      name: 'Chat Sessions',
      icon: MessageCircle,
      description: 'Manage live chat conversations',
      disabled: !guidedSetup.hasWidgets
    }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with Tabs */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Chat Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage chat sessions and configure widgets for customer support
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Setup Progress Indicator */}
              {!guidedSetup.loading && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${guidedSetup.hasWidgets ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    <span className="text-xs text-muted-foreground">Widgets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${guidedSetup.hasSessions ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    <span className="text-xs text-muted-foreground">Sessions</span>
                  </div>
                </div>
              )}

              {/* Tab Navigation (moved to top-right) */}
              <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg w-fit">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && handleTabChange(tab.id)}
                      disabled={tab.disabled}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                        ${tab.disabled
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : isActive
                            ? 'bg-background text-foreground shadow-sm border border-border'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {guidedSetup.loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Setting up chat system...</p>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/sessions/:sessionId" element={<ChatSessionPageWrapper />} />
            <Route path="/sessions" element={<ChatSessionsPage />} />
            <Route path="/widgets" element={<ChatWidgetsPage />} />
            <Route path="/widget/create" element={<CreateChatWidgetPage />} />
            <Route path="/widget/edit/:widgetId" element={<CreateChatWidgetPage />} />
            <Route path="/" element={<ChatSessionsPage />} />
          </Routes>
        )}
      </div>
    </div>
  )
}
