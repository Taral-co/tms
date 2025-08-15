import { FC } from 'react'
import { TrendingUp, Clock, Users, CheckCircle, BarChart3 } from 'lucide-react'

export const AnalyticsPage: FC = () => {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-slate-50/20 dark:to-slate-950/20">
      {/* Enhanced Header with gradient and glass effect */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25"></div>
                <div className="relative p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Analytics
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Insights and metrics for your support operations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Tickets
              </p>
              <p className="text-2xl font-bold text-foreground mt-2">
                1,247
              </p>
              <p className="text-sm text-green-600 mt-1">
                +15% from last month
              </p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Avg Resolution Time
              </p>
              <p className="text-2xl font-bold text-foreground mt-2">
                4.2h
              </p>
              <p className="text-sm text-green-600 mt-1">
                -12% from last month
              </p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Customer Satisfaction
              </p>
              <p className="text-2xl font-bold text-foreground mt-2">
                94%
              </p>
              <p className="text-sm text-green-600 mt-1">
                +2% from last month
              </p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Active Agents
              </p>
              <p className="text-2xl font-bold text-foreground mt-2">
                12
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Same as last month
              </p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Ticket Volume Trend
          </h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chart component will be implemented here
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Resolution Time Distribution
          </h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Chart component will be implemented here
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Detailed Reports
        </h2>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Advanced analytics and reporting features will be available here, including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Agent performance metrics</li>
            <li>Customer satisfaction surveys</li>
            <li>Response time analytics</li>
            <li>Ticket categorization insights</li>
            <li>Peak hours and workload distribution</li>
          </ul>
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}