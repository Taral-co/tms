import { FC } from 'react'
import { TrendingUp, Clock, Users, CheckCircle } from 'lucide-react'

export const AnalyticsPage: FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Insights and metrics for your support operations.
        </p>
      </div>

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
  )
}