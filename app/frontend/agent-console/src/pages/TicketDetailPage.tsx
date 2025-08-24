import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  MoreHorizontal, 
  User, 
  Clock, 
  Paperclip, 
  Send, 
  UserPlus,
  Shield,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Edit3,
  Archive,
  Flag,
  MessageSquare,
  Mail
} from 'lucide-react'
import { 
  Button,
  Badge,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
  Toaster
} from '@tms/shared'
import { apiClient, Ticket, Message } from '../lib/api'

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
  const { toast } = useToast()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyType, setReplyType] = useState<'public' | 'private'>('public')
  const [sending, setSending] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
      
      toast({
        title: "Reply sent",
        description: "Your reply has been sent successfully.",
        variant: "default"
      })
    } catch (err) {
      console.error('Failed to send reply:', err)
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  const handleDeleteTicket = async () => {
    if (!ticket) return
    
    try {
      setDeleting(true)
      await apiClient.deleteTicket(ticket.id)
      
      toast({
        title: "Ticket deleted",
        description: "The ticket has been permanently deleted.",
        variant: "default"
      })
      
      // Navigate back to tickets list
      navigate('/tickets')
    } catch (err) {
      console.error('Failed to delete ticket:', err)
      toast({
        title: "Error",
        description: "Failed to delete ticket. Please try again.",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
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
      
      toast({
        title: "Ticket reassigned",
        description: "The ticket has been reassigned successfully.",
        variant: "default"
      })
    } catch (err) {
      console.error('Failed to reassign ticket:', err)
      toast({
        title: "Error",
        description: "Failed to reassign ticket. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleValidateCustomer = async () => {
    if (!ticket) return
    
    try {
      setValidatingCustomer(true)
      const result = await apiClient.validateCustomer(ticket.id)
      
      if (result.success) {
        toast({
          title: "Validation sent",
          description: result.message,
          variant: "default"
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to send validation: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Failed to validate customer:', err)
      toast({
        title: "Error",
        description: "Failed to send customer validation. Please try again.",
        variant: "destructive"
      })
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
        toast({
          title: "Magic link sent",
          description: result.message,
          variant: "default"
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to send magic link: ${result.message}`,
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Failed to send magic link:', err)
      toast({
        title: "Error",
        description: "Failed to send magic link. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSendingMagicLink(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-background">
        <div className="border-b bg-card px-6 py-4">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="h-4 w-16 bg-muted rounded"></div>
            <div className="h-6 w-48 bg-muted rounded"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 bg-background">
        <div className="border-b bg-card px-6 py-4">
          <Button variant="ghost" onClick={() => navigate('/tickets')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 text-destructive mb-4">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{error}</span>
          </div>
          <Button onClick={() => id && loadTicketData(id)}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex-1 bg-background">
        <div className="border-b bg-card px-6 py-4">
          <Button variant="ghost" onClick={() => navigate('/tickets')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Button>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-foreground mb-2">Ticket not found</h2>
            <p className="text-muted-foreground mb-6">The ticket you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/tickets')}>
              Back to Tickets
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
  <div className="flex h-full min-h-0 flex-col bg-background">
        {/* Enhanced Header */}
        <div className="border-b bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/tickets')} className="gap-2 h-9">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="h-6 w-px bg-border"></div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-foreground">
                      #{ticket.number} {ticket.subject}
                    </h1>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[ticket.status]}>
                        {ticket.status}
                      </Badge>
                      <Badge className={priorityColors[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created {formatTime(ticket.created_at)}</span>
                    <span>•</span>
                    <span>Last updated {formatTime(ticket.updated_at)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowReassignModal(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Reassign
                </Button>
                
                {/* Enterprise Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="More actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowReassignModal(true)} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Reassign ticket
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleValidateCustomer} disabled={validatingCustomer} className="gap-2">
                      <Shield className="h-4 w-4" />
                      {validatingCustomer ? 'Sending...' : 'Validate customer'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSendMagicLink} disabled={sendingMagicLink} className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {sendingMagicLink ? 'Sending...' : 'Send magic link'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <Edit3 className="h-4 w-4" />
                      Edit ticket
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Archive className="h-4 w-4" />
                      Archive ticket
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ticket
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

  {/* Enhanced Content */}
  <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Enhanced Conversation Card */}
              <Card className="shadow-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-foreground">Conversation</h2>
                    <div className="text-sm text-muted-foreground">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
                            {message.author_type === 'customer' ? (
                              <User className="w-5 h-5" />
                            ) : message.author_type === 'agent' ? (
                              <MessageSquare className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-foreground">
                                {message.user_info.name}
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
                          
                          <div className="prose prose-sm max-w-none text-foreground">
                            <div className="whitespace-pre-wrap">
                              {message.body}
                            </div>
                          </div>
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Paperclip className="w-4 h-4" />
                                <span>{message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Reply Form */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
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
                      
                      <div className="relative">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={replyType === 'public' ? 'Write a reply to the customer...' : 'Add an internal note...'}
                          className="w-full p-4 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-background text-foreground placeholder:text-muted-foreground min-h-[120px]"
                          disabled={sending}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Paperclip className="w-4 h-4" />
                          Attach files
                        </Button>
                        
                        <Button 
                          onClick={handleSendReply} 
                          disabled={!replyText.trim() || sending}
                          className="gap-2"
                        >
                          <Send className="w-4 h-4" />
                          {sending ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Customer Info */}
              <Card className="shadow-sm">
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Customer Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{ticket.customer?.name}</div>
                        <div className="text-sm text-muted-foreground">Customer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{ticket.customer?.email}</div>
                        <div className="text-sm text-muted-foreground">Email</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Ticket Details */}
              <Card className="shadow-sm">
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Ticket Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground">{ticket.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="font-medium text-foreground">{ticket.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assignee</span>
                      <span className="font-medium text-foreground">
                        {ticket.assigned_agent?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground">{formatTime(ticket.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium text-foreground">{formatTime(ticket.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-sm">
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                      <Flag className="w-4 h-4" />
                      Change Status
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                      <Flag className="w-4 h-4" />
                      Change Priority
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => setShowReassignModal(true)}
                      size="sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Reassign
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={handleValidateCustomer}
                      disabled={validatingCustomer}
                      size="sm"
                    >
                      <Shield className="w-4 h-4" />
                      {validatingCustomer ? 'Sending...' : 'Validate Customer'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={handleSendMagicLink}
                      disabled={sendingMagicLink}
                      size="sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {sendingMagicLink ? 'Sending...' : 'Send Magic Link'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone and will permanently remove the ticket and all its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTicket} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Modal */}
      {showReassignModal && (
        <ReassignModal
          onClose={() => setShowReassignModal(false)}
          onReassign={handleReassign}
        />
      )}
      
      {/* Toast Notifications */}
      <Toaster />
    </>
  )
}

// Enhanced Reassign Modal Component with Enterprise UI
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Reassign Ticket
          </DialogTitle>
          <DialogDescription>
            Select an agent to assign this ticket to. You can optionally add a note about the reassignment.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="assignee" className="text-sm font-medium text-foreground">
              Assign to Agent
            </label>
            <select
              id="assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
              required
            >
              <option value="">Select an agent...</option>
              <option value="unassign">Unassign</option>
              {/* In a real app, you would fetch agents from API */}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="note" className="text-sm font-medium text-foreground">
              Note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground h-24 resize-none"
              placeholder="Add a note about this reassignment..."
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!assigneeId} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Reassign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
