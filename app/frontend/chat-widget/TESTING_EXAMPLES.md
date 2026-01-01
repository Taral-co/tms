# Chat Widget Testing Examples

Quick reference for testing the new markdown and form features.

## Test 1: Markdown Formatting

### Prompt for AI
```
User: "Can you show me different formatting options?"
```

### Expected AI Response
```markdown
Sure! Here are the formatting options I support:

## Text Formatting
- **Bold text** using **double asterisks**
- *Italic text* using *single asterisks*
- ~~Strikethrough~~ using ~~double tildes~~
- `Inline code` using backticks

## Lists
1. Numbered list item 1
2. Numbered list item 2
3. Numbered list item 3

- Bullet point 1
- Bullet point 2
- Bullet point 3

## Links
Visit our [documentation](https://example.com) for more info.

## Code Blocks
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```

## Blockquotes
> This is a helpful tip or important note

## Tables
| Feature | Status |
|---------|--------|
| Markdown | ✅ Working |
| Forms | ✅ Working |
| Links | ✅ Working |
```

---

## Test 2: Contact Form

### Prompt for AI
```
User: "I need help with my account"
```

### Expected AI Response
```markdown
I'd be happy to help with your account! To assist you properly, please provide your contact information:

```json
{
  "type": "form",
  "id": "contact-info-test",
  "title": "Contact Information",
  "description": "We'll use this to reach out to you",
  "fields": [
    {
      "name": "name",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "placeholder": "John Doe"
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "placeholder": "john@example.com",
      "validation": {
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
    },
    {
      "name": "phone",
      "label": "Phone Number",
      "type": "phone",
      "required": false,
      "placeholder": "+1 (555) 000-0000"
    }
  ],
  "submitLabel": "Continue",
  "cancelLabel": "Skip"
}
```
```

**What to test:**
- Form appears with smooth animation
- Required fields marked with red asterisk
- Email validation works
- Phone is optional
- Cancel button removes form
- Submit sends data

---

## Test 3: Ticket Creation Form

### Prompt for AI
```
User: "Login is not working"
```

### Expected AI Response
```markdown
I'm sorry you're having trouble logging in. Let me create a support ticket for this issue:

```json
{
  "type": "form",
  "id": "login-issue-ticket",
  "title": "Login Issue Report",
  "description": "Please provide details about the login problem",
  "fields": [
    {
      "name": "email",
      "label": "Account Email",
      "type": "email",
      "required": true,
      "placeholder": "your.account@example.com"
    },
    {
      "name": "error_message",
      "label": "Error Message",
      "type": "textarea",
      "required": false,
      "placeholder": "What error message do you see when trying to log in?"
    },
    {
      "name": "browser",
      "label": "Browser",
      "type": "select",
      "required": false,
      "options": ["Chrome", "Firefox", "Safari", "Edge", "Other"]
    },
    {
      "name": "priority",
      "label": "Priority",
      "type": "select",
      "required": true,
      "options": ["Low", "Normal", "High", "Urgent"]
    }
  ],
  "submitLabel": "Create Ticket",
  "cancelLabel": "Cancel"
}
```
```

**What to test:**
- Textarea expands as you type
- Dropdown shows all options
- Required vs optional fields
- Form submission creates ticket
- Data sent to backend correctly

---

## Test 4: Auto-Linking

### Prompt for AI
```
User: "Where can I find help?"
```

### Expected AI Response
```markdown
You can find help in several places:

1. **Documentation**: Visit https://docs.example.com
2. **Support Email**: Contact us at support@example.com
3. **Community Forum**: Join at https://community.example.com/forum
4. **Live Chat**: Available at https://example.com/chat

All links above are clickable!
```

**What to test:**
- All URLs are clickable
- Emails open mailto: links
- Links open in new tab
- Hover effect works
- Mobile tap works

---

## Test 5: Rich Content Response

### Prompt for AI
```
User: "How do I integrate your API?"
```

### Expected AI Response
```markdown
# API Integration Guide

Here's a step-by-step guide to integrate our API:

## 1. Get Your API Key

First, obtain your API key from the [dashboard](https://example.com/dashboard).

## 2. Install the SDK

```bash
npm install @example/sdk
# or
pip install example-sdk
```

## 3. Initialize the Client

```javascript
const client = new ExampleClient({
  apiKey: 'your_api_key_here'
});
```

## 4. Make Your First Request

```javascript
const response = await client.getData({
  userId: '12345'
});
console.log(response);
```

## Important Notes

> **Security**: Never expose your API key in client-side code

> **Rate Limits**: 
> - Free tier: 100 requests/hour
> - Pro tier: 1000 requests/hour

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Error | Check API key is valid |
| 429 Error | You've hit rate limit |
| 500 Error | Contact support@example.com |

## Next Steps

- Read the [full documentation](https://docs.example.com)
- Join our [Discord community](https://discord.gg/example)
- Check out [example projects](https://github.com/example/examples)

Need more help? Let me know!
```

**What to test:**
- Headers render with proper size
- Code blocks have background
- Syntax highlighting visible
- Tables format correctly
- Blockquotes styled
- All links clickable
- Scrolling works smoothly

---

## Test 6: Email Capture Form

### Prompt for AI
```
User: "Send me the documentation"
```

### Expected AI Response
```markdown
I'll send you the documentation right away! What's your email address?

```json
{
  "type": "form",
  "id": "email-capture",
  "title": "Get Documentation",
  "description": "Enter your email to receive the docs",
  "fields": [
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "placeholder": "you@example.com",
      "validation": {
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
    }
  ],
  "submitLabel": "Send Docs"
}
```
```

**What to test:**
- Simple single-field form
- Email validation
- No cancel button (as designed)
- Quick submission

---

## Test 7: Mixed Content

### Prompt for AI
```
User: "I have a billing question"
```

### Expected AI Response
```markdown
I can help with billing questions! Here are some common topics:

## Billing FAQs

### Payment Methods
We accept:
- Credit/Debit cards (Visa, Mastercard, Amex)
- PayPal
- Bank transfer (Enterprise only)

### Billing Cycles
- Monthly: Billed on the 1st of each month
- Annual: Save 20% with yearly billing

### Invoices
Download invoices from your [billing dashboard](https://example.com/billing).

---

For specific billing issues, please provide your information:

```json
{
  "type": "form",
  "id": "billing-support",
  "title": "Billing Support Request",
  "description": "Help us identify your account",
  "fields": [
    {
      "name": "email",
      "label": "Account Email",
      "type": "email",
      "required": true
    },
    {
      "name": "issue",
      "label": "What's the issue?",
      "type": "select",
      "required": true,
      "options": [
        "Charge question",
        "Cancel subscription",
        "Update payment method",
        "Invoice request",
        "Other"
      ]
    },
    {
      "name": "details",
      "label": "Additional Details",
      "type": "textarea",
      "required": false,
      "placeholder": "Please provide more information..."
    }
  ],
  "submitLabel": "Submit Request"
}
```
```

**What to test:**
- Markdown renders before form
- Form appears after content
- Scrolling to form works
- Both parts are readable
- Form doesn't overlap text

---

## Testing Checklist

### Visual Tests
- [ ] Forms have smooth slide-in animation
- [ ] Markdown formatting looks clean
- [ ] Links have hover effect
- [ ] Code blocks have background
- [ ] Tables align properly
- [ ] Form buttons have proper spacing
- [ ] Primary color used consistently

### Functional Tests
- [ ] Required fields show asterisk
- [ ] Email validation works
- [ ] Form submission sends data
- [ ] Cancel button works
- [ ] Links open in new tab
- [ ] Code can be selected/copied
- [ ] Form disables after submit
- [ ] Scrolling works smoothly

### Mobile Tests
- [ ] Forms fit on mobile screen
- [ ] Text is readable
- [ ] Buttons are tap-friendly
- [ ] Keyboard doesn't cover inputs
- [ ] Links are easily tappable
- [ ] Code blocks scroll horizontally

### Accessibility Tests
- [ ] Tab key navigates forms
- [ ] Enter submits forms
- [ ] Escape cancels forms
- [ ] Screen reader compatible
- [ ] Proper labels on inputs
- [ ] Focus indicators visible

### Edge Cases
- [ ] Very long text doesn't break layout
- [ ] Special characters render correctly
- [ ] Multiple forms in one conversation
- [ ] Form with many fields scrolls
- [ ] Empty form shows validation
- [ ] Malformed JSON handled gracefully

---

## Quick Test Script

Copy this into your test.html or browser console:

```javascript
// Simulate AI sending a form
const formMessage = {
  id: 'test-' + Date.now(),
  content: `Let me help you with that!\n\n\`\`\`json\n${JSON.stringify({
    type: 'form',
    id: 'quick-test',
    title: 'Quick Test Form',
    fields: [
      {name: 'email', label: 'Email', type: 'email', required: true}
    ],
    submitLabel: 'Test Submit'
  }, null, 2)}\n\`\`\``,
  author_type: 'ai-agent',
  author_name: 'AI Agent',
  created_at: new Date().toISOString(),
  message_type: 'text',
  is_private: false
};

// If widget is loaded
if (window.TMSChatWidget) {
  window.TMSChatWidget.displayMessage(formMessage);
}
```

---

## Debugging Tips

### Form Not Appearing
```javascript
// Check if parseFormRequest works
import { parseFormRequest } from './renderers';
const content = 'your message with form JSON';
console.log(parseFormRequest(content));
```

### Markdown Not Rendering
```javascript
// Check if hasMarkdown detects it
import { hasMarkdown } from './renderers';
console.log(hasMarkdown('**bold text**')); // Should be true
```

### Form Data Not Sending
```javascript
// Check WebSocket is open
console.log(widget.websocket?.readyState); // Should be 1 (OPEN)

// Check form submission
widget.websocket.addEventListener('message', (event) => {
  console.log('WS Message:', JSON.parse(event.data));
});
```

---

## Expected Behavior Summary

| Feature | Expected Behavior |
|---------|-------------------|
| **Markdown** | Rich formatting with proper styling |
| **Forms** | Smooth appearance, validation, submission |
| **Links** | Auto-detected, clickable, new tab |
| **Code Blocks** | Background color, selectable |
| **Tables** | Aligned, bordered, readable |
| **Lists** | Proper indentation, bullets/numbers |
| **Blockquotes** | Left border, background |
| **Forms Submit** | Disable button, show as message |
| **Forms Cancel** | Remove form, no data sent |
| **Mobile** | Responsive, readable, usable |

---

## Need Help?

1. Check browser console for errors
2. Review CHAT_WIDGET_ENHANCEMENTS.md
3. Test with test.html file
4. Check WebSocket messages in Network tab
5. Verify AI agent is sending correct format
