import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  MoreHorizontal, 
  User, 
  Clock, 
  Tag, 
  Paperclip, 
  Send, 
  Star,
  Archive,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Phone,
  Mail,
  UserPlus
} from 'lucide-react'
import { apiClient, Ticket, Message, ReassignTicketRequest } from '../lib/api'

// Simplified components - in a real app these would come from a UI library
const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }: any) => (
  <button 
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
      variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' :
      variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
      variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
      'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-9 px-3 rounded-md' : 
      size === 'lg' ? 'h-11 px-8 rounded-md' :
      'h-10 py-2 px-4'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
)

const Badge = ({ children, variant = 'default', className = '' }: any) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
    variant === 'destructive' ? 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80' :
    variant === 'warning' ? 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
    variant === 'success' ? 'border-transparent bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
    variant === 'secondary' ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80' :
    variant === 'outline' ? 'text-foreground' :
    'border-transparent bg-primary text-primary-foreground hover:bg-primary/80'
  } ${className}`}>
    {children}
  </span>
)

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', 
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  resolved: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const mockTicket = {
  id: 'T-001',
  subject: 'Cannot access dashboard after login',
  status: 'open',
  priority: 'high',
  customer: {
    name: 'John Smith',
    email: 'john.smith@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
  },
  assignee: {
    name: 'Alice Johnson',
    email: 'alice@company.com'
  },
  createdAt: '2024-01-20T08:30:00Z',
  updatedAt: '2024-01-20T10:30:00Z',
  tags: ['login', 'dashboard', 'urgent'],
  description: 'I am unable to access the dashboard after successfully logging in. The page just shows a blank screen and then redirects me back to the login page.',
  timeline: [
    {
      id: '1',
      type: 'message',
      author: 'John Smith',
      authorType: 'customer',
      content: 'I am unable to access the dashboard after successfully logging in. The page just shows a blank screen and then redirects me back to the login page.',
      timestamp: '2024-01-20T08:30:00Z',
      attachments: []
    },
    {
      id: '2',
      type: 'message',
      author: 'Alice Johnson',
      authorType: 'agent',
      content: 'Hi John, thank you for reaching out. I understand you\'re having trouble accessing the dashboard. Let me help you troubleshoot this issue.',
      timestamp: '2024-01-20T09:15:00Z',
      attachments: []
    },
    {
      id: '3',
      type: 'message',
      author: 'Alice Johnson',
      authorType: 'agent',
      content: 'Can you please try the following steps:\n\n1. Clear your browser cache and cookies\n2. Try accessing the dashboard in an incognito/private window\n3. Check if you have any browser extensions that might be interfering\n\nLet me know if any of these help!',
      timestamp: '2024-01-20T09:20:00Z',
      attachments: []
    },
    {
      id: '4',
      type: 'message',
      author: 'John Smith',
      authorType: 'customer',
      content: 'I tried clearing cache but still having issues. The incognito mode didn\'t work either. I disabled all extensions but the problem persists.',
      timestamp: '2024-01-20T10:30:00Z',
      attachments: []
    },
    {
      id: '5',
      type: 'note',
      author: 'Alice Johnson',
      authorType: 'agent',
      content: 'Escalating to engineering team - possible session management issue',
      timestamp: '2024-01-20T10:35:00Z',
      attachments: []
    }
  ]
}

export function TicketDetailPage() {
  const [replyContent, setReplyContent] = useState('')
  const [replyType, setReplyType] = useState('reply') // 'reply' or 'note'

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="flex h-full bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Inbox
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {mockTicket.subject}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">#{mockTicket.id}</span>
                  <Badge variant={mockTicket.status === 'open' ? 'warning' : 'success'}>
                    {getStatusIcon(mockTicket.status)}
                    <span className="ml-1">{mockTicket.status}</span>
                  </Badge>
                  <Badge variant={mockTicket.priority === 'high' ? 'destructive' : 'secondary'}>
                    {mockTicket.priority}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-2" />
                Star
              </Button>
              <Button variant="outline" size="sm">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Timeline */}
            <div className="space-y-6">
              {mockTicket.timeline.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {item.authorType === 'customer' ? (
                        <User className="w-4 h-4" />
                      ) : item.type === 'note' ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </div>
                    {index < mockTicket.timeline.length - 1 && (
                      <div className="w-px h-6 bg-border ml-4 mt-2"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {item.author}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.authorType}
                          </Badge>
                          {item.type === 'note' && (
                            <Badge variant="secondary" className="text-xs">
                              Internal Note
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-foreground whitespace-pre-wrap">
                        {item.content}
                      </div>
                      
                      {item.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="w-4 h-4" />
                            {item.attachments.length} attachment(s)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <div className="mt-8 border-t pt-6">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={replyType === 'reply' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReplyType('reply')}
                  >
                    Reply to Customer
                  </Button>
                  <Button
                    variant={replyType === 'note' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReplyType('note')}
                  >
                    Internal Note
                  </Button>
                </div>
                
                <textarea
                  className="w-full min-h-[120px] p-3 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder={replyType === 'reply' ? 'Type your reply...' : 'Add an internal note...'}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach Files
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Save Draft
                    </Button>
                    <Button size="sm" disabled={!replyContent.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Send {replyType === 'reply' ? 'Reply' : 'Note'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l bg-card">
        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Customer</h3>
            <div className="flex items-center gap-3">
              <img
                src={mockTicket.customer.avatar}
                alt={mockTicket.customer.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-medium text-foreground">
                  {mockTicket.customer.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {mockTicket.customer.email}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="flex-1">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Phone className="w-4 h-4 mr-2" />
                Call
              </Button>
            </div>
          </div>

          {/* Ticket Details */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Assignee</label>
                <div className="font-medium text-foreground">
                  {mockTicket.assignee.name}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Created</label>
                <div className="font-medium text-foreground">
                  {formatTime(mockTicket.createdAt)}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Last Updated</label>
                <div className="font-medium text-foreground">
                  {formatTime(mockTicket.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {mockTicket.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Change Status
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Change Priority
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Reassign
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive">
                Close Ticket
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
