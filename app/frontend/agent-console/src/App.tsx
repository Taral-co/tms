import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './components/ThemeProvider'
import { AppShell } from './components/AppShell'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { InboxPage } from './pages/InboxPage'
import { AddInboxPage } from './pages/AddInboxPage'
import { EmailConnectorsPage } from './pages/EmailConnectorsPage'
import { TicketsPage } from './pages/TicketsPage'
import { DashboardPage } from './pages/DashboardPage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import './index.css'

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/inbox" replace /> : <LoginPage />
      } />
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/inbox" replace /> : <Navigate to="/login" replace />
      } />
      {isAuthenticated ? (
        <Route path="/*" element={
          <AppShell>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/inbox/add" element={<AddInboxPage />} />
              <Route path="/inbox/connectors" element={<EmailConnectorsPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AppShell>
        } />
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
