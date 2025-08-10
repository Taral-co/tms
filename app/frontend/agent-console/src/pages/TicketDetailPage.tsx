import { FC } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, User, Tag, MoreHorizontal } from 'lucide-react'

export const TicketDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            to="/tickets" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Ticket #{id}
            </h1>
            <p className="text-muted-foreground mt-2">
              Login issues with mobile application
            </p>
          </div>
          <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
            Actions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                Open
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                High Priority
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                Bug
              </span>
            </div>
            
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Description
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                I'm having trouble logging into the mobile application. Every time I try to enter my credentials, 
                the app crashes and returns me to the login screen. This has been happening for the past 3 days. 
                I've tried uninstalling and reinstalling the app, but the issue persists.
              </p>
            </div>
          </div>

          {/* Conversation */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Conversation
            </h3>
            
            <div className="space-y-4">
              {/* Sample Messages */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">
                      John Doe
                    </span>
                    <span className="text-xs text-muted-foreground">
                      2 hours ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Thank you for reporting this issue. I'm looking into the mobile app crash logs now.
                  </p>
                </div>
              </div>
            </div>

            {/* Reply Form */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="space-y-3">
                <textarea
                  placeholder="Type your response..."
                  className="w-full p-3 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-muted-foreground hover:text-foreground">
                      Attach file
                    </button>
                  </div>
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Ticket Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Customer
                </label>
                <p className="text-sm text-foreground mt-1">
                  John Doe
                </p>
                <p className="text-xs text-muted-foreground">
                  john.doe@example.com
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <p className="text-sm text-foreground mt-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  3 hours ago
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                    <Tag className="h-3 w-3" />
                    mobile
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                    <Tag className="h-3 w-3" />
                    login
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
