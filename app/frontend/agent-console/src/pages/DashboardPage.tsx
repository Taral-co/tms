import { FC } from 'react'
import { Ticket, BarChart3, Users, AlertCircle } from 'lucide-react'

export const DashboardPage: FC = () => {
  // Placeholder data - replace with real data from API
  const stats = [
    {
      title: 'Open Tickets',
      value: '24',
      change: '+12%',
      changeType: 'increase' as const,
      icon: Ticket,
    },
    {
      title: 'Avg Response Time',
      value: '2.4h',
      change: '-8%',
      changeType: 'decrease' as const,
      icon: BarChart3,
    },
    {
      title: 'Active Agents',
      value: '8',
      change: '+2',
      changeType: 'increase' as const,
      icon: Users,
    },
    {
      title: 'Urgent Tickets',
      value: '3',
      change: '0',
      changeType: 'neutral' as const,
      icon: AlertCircle,
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's what's happening with your support team.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card p-6 rounded-lg border border-border shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stat.value}
                </p>
                <p className={`text-sm mt-1 ${
                  stat.changeType === 'increase' ? 'text-green-600' :
                  stat.changeType === 'decrease' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {stat.change} from last week
                </p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Recent tickets and updates will appear here...
            </p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Team Performance
          </h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Team metrics and performance charts will appear here...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}