import { FC } from 'react'
import { Plus, Filter, Search } from 'lucide-react'

export const TicketsPage: FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track all support tickets.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card p-4 rounded-lg border border-border mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">All Tickets</h2>
        </div>
        
        <div className="divide-y divide-border">
          {/* Placeholder ticket items */}
          {[1, 2, 3, 4, 5].map((ticket) => (
            <div key={ticket} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-foreground">
                      Sample Ticket #{ticket}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                      Open
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                      High
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    This is a sample ticket description that explains the issue...
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created 2 hours ago</span>
                    <span>Customer: john.doe@example.com</span>
                    <span>Assigned to: Sarah Wilson</span>
                  </div>
                </div>
                <div className="text-right">
                  <button className="text-primary hover:text-primary/80 text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing 1 to 5 of 47 tickets
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
