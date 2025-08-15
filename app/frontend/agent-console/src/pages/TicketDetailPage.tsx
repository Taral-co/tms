import { useState, useEffect } from 'react'
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
  UserPlus,
  Shield,
  ExternalLink
} from 'lucide-react'
import { apiClient, Ticket, Message, ReassignTicketRequest, CustomerValidationResult, MagicLinkResult } from '../lib/api'

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

// Helper function to format time
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyType, setReplyType] = useState<'public' | 'private'>('public')
  const [sending, setSending] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [validatingCustomer, setValidatingCustomer] = useState(false)
  const [sendingMagicLink, setSendingMagicLink] = useState(false)

  useEffect(() => {
    if (id) {
      loadTicketData(id)
    }
  }, [id])

  const loadTicketData = async (ticketId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Load ticket and messages in parallel
      const [ticketData, messagesData] = await Promise.all([
        apiClient.getTicket(ticketId),
        apiClient.getTicketMessages(ticketId)
      ])
      
      setTicket(ticketData)
      setMessages(messagesData.messages)
    } catch (err) {
      console.error('Failed to load ticket data:', err)
      setError('Failed to load ticket data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return
    
    try {
      setSending(true)
      const newMessage = await apiClient.createMessage(ticket.id, {
        content: replyText
      })
      
      setMessages(prev => [...prev, newMessage])
      setReplyText('')
    } catch (err) {
      console.error('Failed to send reply:', err)
      // TODO: Show error toast
    } finally {
      setSending(false)
    }
  }

  const handleReassign = async (assigneeId: string, note?: string) => {
    if (!ticket) return
    
    try {
      const updatedTicket = await apiClient.reassignTicket(ticket.id, {
        assignee_agent_id: assigneeId === 'unassign' ? undefined : assigneeId,
        note
      })
      
      setTicket(updatedTicket)
      setShowReassignModal(false)
      // Reload messages to see system message about reassignment
      const messagesData = await apiClient.getTicketMessages(ticket.id)
      setMessages(messagesData.messages)
    } catch (err) {
      console.error('Failed to reassign ticket:', err)
      // TODO: Show error toast
    }
  }

  const handleValidateCustomer = async () => {
    if (!ticket) return
    
    try {
      setValidatingCustomer(true)
      const result = await apiClient.validateCustomer(ticket.id)
      
      if (result.success) {
        // Show success message
        alert(result.message)
      } else {
        // Show error message
        alert(`Failed to send validation: ${result.message}`)
      }
    } catch (err) {
      console.error('Failed to validate customer:', err)
      alert('Failed to send customer validation. Please try again.')
    } finally {
      setValidatingCustomer(false)
    }
  }

  const handleSendMagicLink = async () => {
    if (!ticket) return
    
    try {
      setSendingMagicLink(true)
      const result = await apiClient.sendMagicLinkToCustomer(ticket.id)
      
      if (result.success) {
        // Show success message
        alert(result.message)
      } else {
        // Show error message
        alert(`Failed to send magic link: ${result.message}`)
      }
    } catch (err) {
      console.error('Failed to send magic link:', err)
      alert('Failed to send magic link. Please try again.')
    } finally {
      setSendingMagicLink(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <button 
          onClick={() => id && loadTicketData(id)}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Ticket not found</h2>
          <p className="text-muted-foreground mt-2">The ticket you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate('/tickets')} className="mt-4">
            Back to Tickets
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              #{ticket.number} {ticket.subject}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={statusColors[ticket.status]}>
                {ticket.status}
              </Badge>
              <Badge className={priorityColors[ticket.priority]}>
                {ticket.priority}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created {formatTime(ticket.created_at)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowReassignModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Reassign
          </Button>
          <Button variant="outline">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Messages/Timeline */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Conversation</h2>
            
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {message.author_type === 'customer' ? (
                        <User className="w-4 h-4" />
                      ) : message.author_type === 'agent' ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {message.author_type === 'customer' 
                            ? ticket.customer_name 
                            : message.author_type === 'agent'
                            ? 'Agent'
                            : 'System'
                          }
                        </span>
                        {message.is_private && (
                          <Badge variant="secondary" className="text-xs">
                            Internal Note
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    
                    <div className="text-foreground whitespace-pre-wrap mt-1">
                      {message.body}
                    </div>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Paperclip className="w-4 h-4" />
                          {message.attachments.length} attachment(s)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <div className="mt-8 border-t pt-6">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={replyType === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReplyType('public')}
                  >
                    Public Reply
                  </Button>
                  <Button
                    variant={replyType === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReplyType('private')}
                  >
                    Internal Note
                  </Button>
                </div>
                
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={replyType === 'public' ? 'Write a reply to the customer...' : 'Add an internal note...'}
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-none bg-[var(--card)] text-[var(--card-fg)] placeholder:text-[color:var(--muted-foreground)]"
                  disabled={sending}
                />
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="w-4 h-4" />
                    <span>Attach files</span>
                  </div>
                  
                  <Button onClick={handleSendReply} disabled={!replyText.trim() || sending}>
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Customer</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{ticket.customer?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{ticket.customer?.email}</span>
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Type:</span>
                <span className="text-sm ml-2">{ticket.type}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Source:</span>
                <span className="text-sm ml-2">{ticket.source}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Assignee:</span>
                <span className="text-sm ml-2">
                  {ticket.assigned_agent?.name || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm ml-2">{formatTime(ticket.created_at)}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Updated:</span>
                <span className="text-sm ml-2">{formatTime(ticket.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Change Status
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Change Priority
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowReassignModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Reassign
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleValidateCustomer}
                disabled={validatingCustomer}
              >
                <Shield className="w-4 h-4 mr-2" />
                {validatingCustomer ? 'Sending...' : 'Validate Customer'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleSendMagicLink}
                disabled={sendingMagicLink}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {sendingMagicLink ? 'Sending...' : 'Send Magic Link'}
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive">
                Close Ticket
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <ReassignModal
          onClose={() => setShowReassignModal(false)}
          onReassign={handleReassign}
        />
      )}
    </div>
  )
}

// Simple Reassign Modal Component
interface ReassignModalProps {
  onClose: () => void
  onReassign: (assigneeId: string, note?: string) => void
}

const ReassignModal: React.FC<ReassignModalProps> = ({ onClose, onReassign }) => {
  const [assigneeId, setAssigneeId] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (assigneeId) {
      onReassign(assigneeId, note)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg w-full max-w-md border shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Reassign Ticket</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assign to Agent</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Select an agent...</option>
              <option value="unassign">Unassign</option>
              {/* In a real app, you would fetch agents from API */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring h-24"
              placeholder="Add a note about this reassignment..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!assigneeId}>
              Reassign
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
