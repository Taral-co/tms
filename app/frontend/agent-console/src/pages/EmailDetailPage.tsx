import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Paperclip, 
  Reply, 
  Forward,
  Eye,
  EyeOff,
  Clock,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { 
  Button, 
  Badge, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@tms/shared'
import { apiClient, EmailInbox, ConvertToTicketRequest } from '../lib/api'

export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [email, setEmail] = useState<EmailInbox | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [converting, setConverting] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertForm, setConvertForm] = useState<ConvertToTicketRequest>({
    type: 'question',
    priority: 'normal'
  })

  useEffect(() => {
    if (id) {
      loadEmailData(id)
    }
  }, [id])

  const loadEmailData = async (emailId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Load email by ID - using getEmailInbox with no filter to get all emails, then find the one we need
      const response = await apiClient.getEmailInbox({})
      
      // Find the specific email by ID
      const foundEmail = response.emails.find((e: EmailInbox) => e.id === emailId)
      if (!foundEmail) {
        setError('Email not found')
        return
      }
      
      setEmail(foundEmail)
    } catch (err) {
      console.error('Failed to load email:', err)
      setError('Failed to load email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRead = async () => {
    if (!email) return
    
    try {
      setToggling(true)
      if (!email.is_read) {
        await apiClient.markEmailAsRead(email.id)
        setEmail(prev => prev ? { ...prev, is_read: true } : null)
      }
      // Note: There's no markAsUnread method in the API, so we can only mark as read
    } catch (err) {
      console.error('Failed to toggle read status:', err)
    } finally {
      setToggling(false)
    }
  }

  const handleConvertToTicket = async () => {
    if (!email) return
    
    try {
      setConverting(true)
      await apiClient.convertEmailToTicket(email.id, convertForm)
      
      // Refresh email data to get updated ticket_id
      await loadEmailData(email.id)
      setShowConvertDialog(false)
      
      // Show success message
      alert('Email successfully converted to ticket!')
    } catch (err) {
      console.error('Failed to convert email:', err)
      alert('Failed to convert email to ticket')
    } finally {
      setConverting(false)
    }
  }

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true })
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE p')
    } else {
      return format(date, 'MMM d, yyyy')
    }
  }

  const getFromDisplay = (email: EmailInbox) => {
    if (email.from_name && email.from_name.trim()) {
      return `${email.from_name} <${email.from_address}>`
    }
    return email.from_address
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
        <div className="flex items-center space-x-2 text-destructive mb-4">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <Button onClick={() => navigate('/inbox')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inbox
        </Button>
      </div>
    )
  }

  if (!email) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Email not found</h2>
          <p className="text-muted-foreground mt-2">
            The email you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/inbox')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
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
          <Button variant="outline" onClick={() => navigate('/inbox')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{email.subject || '(No Subject)'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="w-4 h-4" />
              <span>Email ID: {email.id}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleRead}
            disabled={toggling || email.is_read}
          >
            {email.is_read ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Read
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Mark Read
              </>
            )}
          </Button>
          
          {!email.is_converted_to_ticket && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConvertDialog(true)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Convert to Ticket
            </Button>
          )}
          
          <Button variant="outline" size="sm">
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </Button>
          
          <Button variant="outline" size="sm">
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Email Content */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{getFromDisplay(email)}</p>
                      <p className="text-sm text-muted-foreground">
                        to {email.mailbox_address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatEmailDate(email.sent_at || email.received_at)}</span>
                    </div>
                    
                    {email.is_reply && (
                      <Badge variant="secondary" className="text-xs">
                        Reply
                      </Badge>
                    )}
                    
                    {email.is_converted_to_ticket && (
                      <Badge variant="outline" className="text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Converted to Ticket
                      </Badge>
                    )}
                    
                    {!email.is_read && (
                      <Badge variant="default" className="text-xs">
                        Unread
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Email Body */}
              <div className="prose prose-sm max-w-none">
                {email.body_html ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: email.body_html }}
                    className="email-content"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {email.body_text || email.snippet}
                  </pre>
                )}
              </div>
              
              {/* Attachments */}
              {email.has_attachments && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Paperclip className="w-4 h-4" />
                    Attachments ({email.attachment_count})
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This email has {email.attachment_count} attachment(s).
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Email Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">From:</span>
                <div className="text-sm mt-1 text-muted-foreground">
                  {getFromDisplay(email)}
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium">To:</span>
                <div className="text-sm mt-1 text-muted-foreground">
                  {email.mailbox_address}
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium">Received:</span>
                <div className="text-sm mt-1 text-muted-foreground">
                  {format(new Date(email.received_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
              
              {email.sent_at && (
                <div>
                  <span className="text-sm font-medium">Sent:</span>
                  <div className="text-sm mt-1 text-muted-foreground">
                    {format(new Date(email.sent_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              )}
              
              {email.message_id && (
                <div>
                  <span className="text-sm font-medium">Message ID:</span>
                  <div className="text-sm mt-1 text-muted-foreground font-mono break-all">
                    {email.message_id}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Info */}
          {email.ticket_id && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Linked Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-3">
                  This email has been converted to a ticket.
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/tickets/${email.ticket_id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Convert to Ticket Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Email to Ticket</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ticket Type</label>
              <Select value={convertForm.type} onValueChange={(value) => setConvertForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose ticket type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="problem">Problem</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={convertForm.priority} onValueChange={(value) => setConvertForm(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowConvertDialog(false)}
                disabled={converting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConvertToTicket}
                disabled={converting}
              >
                {converting ? 'Converting...' : 'Convert to Ticket'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .email-content {
          max-width: 100%;
          overflow-wrap: break-word;
        }
        .email-content img {
          max-width: 100%;
          height: auto;
        }
        .email-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .email-content blockquote {
          border-left: 3px solid #e5e5e5;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}
