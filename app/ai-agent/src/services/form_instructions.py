"""
Form generation instructions and templates for AI agent.
"""

FORM_GENERATION_INSTRUCTIONS = """
## Dynamic Form Generation

When you need to collect information from the user, you can generate dynamic forms that will be displayed in the chat widget.

### Form Request Format

To generate a form, include a JSON code block with the following structure:

```json
{
  "type": "form",
  "id": "unique-form-id",
  "title": "Form Title",
  "description": "Optional description",
  "fields": [
    {
      "name": "field_name",
      "label": "Field Label",
      "type": "text|email|phone|textarea|select|number",
      "required": true|false,
      "placeholder": "Optional placeholder",
      "options": ["Option1", "Option2"],
      "validation": {
        "pattern": "regex pattern",
        "min": 0,
        "max": 100,
        "minLength": 5,
        "maxLength": 100
      }
    }
  ],
  "submitLabel": "Submit",
  "cancelLabel": "Cancel"
}
```

### When to Use Forms

1. **Contact Information Request**: When you need name, email, or phone
2. **Ticket Creation**: When creating a support ticket
3. **Feedback Collection**: When gathering structured feedback
4. **Multi-field Input**: When you need multiple related pieces of information

### Form Templates

#### 1. Contact Information Form
Use when the user hasn't provided contact details but you need them.

Example message:
```
I'd be happy to help you with that! To ensure I can follow up properly, could you please provide your contact information?

```json
{
  "type": "form",
  "id": "contact-info",
  "title": "Contact Information",
  "description": "Please share your details so we can assist you better.",
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
      "placeholder": "john@example.com"
    },
    {
      "name": "phone",
      "label": "Phone Number",
      "type": "phone",
      "required": false,
      "placeholder": "+1 (555) 000-0000"
    }
  ],
  "submitLabel": "Continue"
}
```
```

#### 2. Ticket Creation Form
Use when user reports an issue that needs to be tracked as a ticket.

Example message:
```
I understand you're experiencing an issue. Let me create a support ticket for you.

```json
{
  "type": "form",
  "id": "create-ticket",
  "title": "Create Support Ticket",
  "description": "Provide details about your issue and we'll create a ticket.",
  "fields": [
    {
      "name": "title",
      "label": "Issue Title",
      "type": "text",
      "required": true,
      "placeholder": "Brief summary of the issue",
      "validation": {
        "minLength": 5,
        "maxLength": 100
      }
    },
    {
      "name": "description",
      "label": "Description",
      "type": "textarea",
      "required": true,
      "placeholder": "Please describe your issue in detail...",
      "validation": {
        "minLength": 10
      }
    },
    {
      "name": "priority",
      "label": "Priority",
      "type": "select",
      "required": true,
      "options": ["Low", "Normal", "High", "Urgent"]
    },
    {
      "name": "category",
      "label": "Category",
      "type": "select",
      "required": false,
      "options": ["Question", "Problem", "Incident", "Feature Request"]
    }
  ],
  "submitLabel": "Create Ticket",
  "cancelLabel": "Cancel"
}
```
```

#### 3. Email Capture Form
Use when you just need an email address for follow-up.

Example message:
```
I can send you a detailed guide. What's your email address?

```json
{
  "type": "form",
  "id": "email-capture",
  "title": "Stay in Touch",
  "description": "Enter your email to receive updates.",
  "fields": [
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "placeholder": "your@email.com"
    }
  ],
  "submitLabel": "Submit"
}
```
```

### Important Rules

1. **Always explain why** you're asking for information before showing the form
2. **Use appropriate field types** (email for emails, phone for phones, etc.)
3. **Mark required fields** accurately
4. **Provide helpful placeholders** to guide user input
5. **Keep forms concise** - only ask for necessary information
6. **Use validation** to ensure data quality

### Processing Form Responses

When a user submits a form, the data will be sent back to you in the next message with the format:
```
Form submitted: form-id
field_name: value
another_field: value
```

Use the `collect_contact_info` or `create_ticket` functions to process this data appropriately.

### Example Conversation Flow

**User**: "I'm having trouble logging in"

**Agent**: "I'm sorry to hear you're having login issues. Let me help you with that. First, let me create a support ticket to track this issue.

```json
{
  "type": "form",
  "id": "login-issue-ticket",
  "title": "Login Issue Report",
  "description": "Please provide details about the login problem.",
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
      "placeholder": "What error do you see when trying to log in?"
    },
    {
      "name": "browser",
      "label": "Browser",
      "type": "select",
      "required": false,
      "options": ["Chrome", "Firefox", "Safari", "Edge", "Other"]
    }
  ],
  "submitLabel": "Submit Issue"
}
```
"

**User**: [Submits form]

**Agent**: "Thank you! I've created ticket #12345 for your login issue. Our support team will investigate and get back to you within 24 hours. In the meantime, have you tried resetting your password?"
"""


def get_form_enhanced_system_prompt(base_prompt: str) -> str:
    """
    Enhance the system prompt with form generation capabilities.
    
    Args:
        base_prompt: The base system prompt
        
    Returns:
        Enhanced prompt with form instructions
    """
    return f"""{base_prompt}

{FORM_GENERATION_INSTRUCTIONS}
"""


def detect_form_trigger(message: str) -> tuple[bool, str | None]:
    """
    Detect if user message might benefit from a form.
    
    Returns:
        (should_suggest_form, form_type)
    """
    message_lower = message.lower()
    
    # Contact info triggers
    contact_triggers = [
        'email', 'contact', 'reach', 'follow up', 'get back',
        'send me', 'contact me', 'reach out'
    ]
    if any(trigger in message_lower for trigger in contact_triggers):
        return (True, 'contact_info')
    
    # Ticket creation triggers
    ticket_triggers = [
        'issue', 'problem', 'bug', 'error', 'not working', 'broken',
        'help with', 'trouble', 'cant', 'cannot', 'won\'t', 'doesnt work'
    ]
    if any(trigger in message_lower for trigger in ticket_triggers):
        return (True, 'ticket')
    
    # Feedback triggers
    feedback_triggers = [
        'feedback', 'suggestion', 'improve', 'feature request'
    ]
    if any(trigger in message_lower for trigger in feedback_triggers):
        return (True, 'feedback')
    
    return (False, None)
