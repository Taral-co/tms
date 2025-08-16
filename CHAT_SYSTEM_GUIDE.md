# Chat System Usage Guide

## Overview

The TMS Chat System provides a complete tawk.to-like live chat solution for multi-tenant customer support. It includes:

- **Real-time messaging** between customers and support agents
- **Domain validation** for secure widget embedding
- **Agent console** for managing chat sessions
- **Embeddable widgets** for customer websites
- **Professional UI** following enterprise design standards

## Architecture

```
Chat System Components:
├── Backend (Go)
│   ├── WebSocket server for real-time messaging
│   ├── REST API for chat management
│   └── Domain validation integration
├── Agent Console (React)
│   ├── Chat Sessions page
│   ├── Chat Widgets management
│   └── Real-time message interface
└── Embeddable Widget (Standalone)
    ├── Customer chat interface
    └── Domain-restricted embedding
```

## Getting Started

### 1. Create a Chat Widget

Before you can handle chat sessions, you need to create at least one chat widget:

1. Navigate to **Chat > Widgets** in the agent console
2. Click **Create Widget**
3. Fill in the required information:
   - **Name**: Internal name for the widget
   - **Domain**: The domain where this widget will be embedded
   - **Welcome Message**: Greeting shown to customers
   - **Appearance**: Colors and positioning
   - **Settings**: Business hours, file uploads, etc.
4. Click **Save** to create the widget
5. Copy the **embed code** to add to your website

### 2. Embed the Widget

Add the generated embed code to your website's HTML:

```html
<!-- Add before closing </body> tag -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','TmsChat','https://yourserver.com/chat-widget.js'));
  
  TmsChat('init', {
    widgetId: 'your-widget-id',
    domain: 'yourwebsite.com'
  });
</script>
```

### 3. Handle Chat Sessions

#### Accessing Chat Sessions

1. Navigate to **Chat > Sessions** in the agent console
2. Use the filters to view:
   - **All**: Every chat session
   - **Unassigned**: Sessions needing agent assignment
   - **Active**: Currently ongoing conversations
3. Use the search bar to find specific customers or sessions

#### Starting New Chat Sessions

**Method 1: Agent-Initiated Chat**
1. Click **New Chat** button in the sessions page
2. Select a chat widget from the dropdown
3. Enter customer email (required)
4. Enter customer name (optional)
5. Click **Start Chat**

**Method 2: Customer-Initiated Chat**
- Customers click the chat widget on your website
- New sessions appear automatically in the agent console
- Unassigned sessions show with a yellow indicator

#### Managing Sessions

**Assigning Sessions:**
- Click **Assign to Me** on any unassigned session
- Sessions automatically appear in your active list
- Multiple agents can handle different sessions simultaneously

**Responding to Messages:**
1. Click on a session to open the chat interface
2. Type your response in the message input
3. Press **Enter** or click **Send**
4. Messages appear instantly for both agent and customer

**Session Status:**
- **Active**: Currently ongoing conversation
- **Waiting**: Customer waiting for agent response
- **Ended**: Session completed by agent or customer
- **Transferred**: Moved to another agent

## Features

### Real-Time Messaging
- **Instant delivery**: Messages appear immediately
- **Typing indicators**: See when customers are typing
- **Message history**: Full conversation timeline
- **File sharing**: Support for image and document uploads

### Professional Interface
- **Enterprise UI**: Consistent with TMS design system
- **Theme support**: Light/dark mode with CSS variables
- **Responsive design**: Works on desktop and mobile
- **Accessibility**: WCAG AA compliant with keyboard navigation

### Agent Tools
- **Session assignment**: Distribute chats among team members
- **Customer context**: View customer email and previous sessions
- **Quick responses**: Pre-written responses for common questions
- **Session notes**: Internal notes visible only to agents

## Advanced Usage

### Customizing Widget Appearance

Each widget can be customized to match your brand:

```javascript
// Widget configuration options
{
  primaryColor: '#3b82f6',      // Main accent color
  secondaryColor: '#1f2937',    // Text and borders
  position: 'bottom-right',     // Widget placement
  welcomeMessage: 'Hi! How can we help?',
  offlineMessage: 'We\'re currently offline',
  autoOpenDelay: 3000,          // Auto-open after 3 seconds
  showAgentAvatars: true,       // Display agent photos
  allowFileUploads: true,       // Enable file sharing
  requireEmail: false,          // Require email before chat
  businessHours: {              // Operating hours
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    // ... other days
  }
}
```

### Business Hours

Configure when chat is available:

1. Edit your chat widget
2. Navigate to **Business Hours** section
3. Set operating hours for each day
4. Choose timezone
5. Configure offline behavior:
   - Show offline message
   - Collect contact information
   - Redirect to contact form

### Integration with Tickets

Chat sessions can automatically create support tickets:

1. **Automatic ticket creation**: When chat ends
2. **Manual conversion**: Agent creates ticket during chat
3. **Context preservation**: Chat history attached to ticket
4. **Customer linking**: Associates chat with existing customer records

## Troubleshooting

### Widget Not Loading
- **Check domain validation**: Ensure domain is correctly configured
- **Verify embed code**: Widget ID must match created widget
- **Browser console**: Look for JavaScript errors
- **CORS settings**: Ensure your domain is allowed

### Messages Not Sending
- **WebSocket connection**: Check browser network tab
- **Authentication**: Verify agent login status
- **Server status**: Confirm backend services are running
- **Network issues**: Check internet connectivity

### Session Assignment Issues
- **Permissions**: Verify agent has chat access
- **Project scope**: Ensure agent is assigned to correct project
- **Session limits**: Check concurrent session limits
- **Role restrictions**: Confirm RBAC permissions

## API Reference

### REST Endpoints

```bash
# List chat sessions
GET /v1/chat/sessions?status=active&assigned_agent_id=123

# Get specific session
GET /v1/chat/sessions/{sessionId}

# Create new session
POST /v1/chat/sessions
{
  "widget_id": "widget-123",
  "customer_email": "customer@example.com",
  "customer_name": "John Doe"
}

# Send message
POST /v1/chat/sessions/{sessionId}/messages
{
  "content": "Hello! How can I help you?",
  "message_type": "text"
}

# Assign session
POST /v1/chat/sessions/{sessionId}/assign
{
  "agent_id": "agent-123"
}
```

### WebSocket Events

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/v1/chat/ws');

// Listen for new messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch(message.type) {
    case 'new_message':
      // Handle incoming message
      break;
    case 'session_assigned':
      // Handle session assignment
      break;
    case 'typing_indicator':
      // Show typing indicator
      break;
  }
};

// Send message
ws.send(JSON.stringify({
  type: 'send_message',
  session_id: 'session-123',
  content: 'Hello!',
  message_type: 'text'
}));
```

## Performance Optimization

### For High Volume
- **Session limits**: Set maximum concurrent sessions per agent
- **Auto-assignment**: Configure automatic session distribution
- **Canned responses**: Use templates for common replies
- **Keyboard shortcuts**: Enable quick actions

### For Large Teams
- **Departments**: Route chats to specific teams
- **Skills-based routing**: Match customers with specialized agents
- **Supervisor mode**: Allow managers to monitor all sessions
- **Analytics**: Track response times and satisfaction

## Security Considerations

### Domain Validation
- **Whitelist domains**: Only allow approved websites
- **SSL/TLS**: Ensure encrypted connections
- **Token validation**: Verify session authenticity
- **Rate limiting**: Prevent spam and abuse

### Data Protection
- **Message encryption**: Secure message content
- **PII handling**: Protect customer information
- **Audit logs**: Track all chat activities
- **Data retention**: Configure automatic cleanup

## Maintenance

### Regular Tasks
- **Monitor performance**: Check response times
- **Update widgets**: Keep embed codes current
- **Clean old sessions**: Archive completed chats
- **Agent training**: Ensure proper usage

### Backup and Recovery
- **Chat history**: Regular database backups
- **Widget configurations**: Export settings
- **Agent assignments**: Document team structure
- **Integration settings**: Keep configuration records

## Support

For additional help with the chat system:

1. **Documentation**: Check this guide and API docs
2. **System logs**: Review application logs for errors
3. **Test environment**: Use staging for troubleshooting
4. **Team collaboration**: Share issues with other agents

---

**Note**: This chat system is integrated with the TMS platform and follows the same authentication, permissions, and multi-tenant architecture as other TMS features.
