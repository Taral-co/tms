/**
 * Message renderers for markdown, links, and dynamic forms
 * Optimized for small bundle size and memory footprint
 */

import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked for lightweight operation
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
})

/**
 * Form field types supported by the widget
 */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number'
  required?: boolean
  placeholder?: string
  options?: string[] // For select fields
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
}

/**
 * Form configuration sent by AI agent
 */
export interface FormConfig {
  id: string
  title: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  cancelLabel?: string
  onSubmit: (data: Record<string, string>) => void
  onCancel?: () => void
}

/**
 * Render markdown content safely
 */
export function renderMarkdown(content: string): string {
  try {
    // Parse markdown
    const html = marked.parse(content) as string
    
    // Sanitize HTML to prevent XSS
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr',
        'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false,
    })
    
    return clean
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return escapeHtml(content)
  }
}

/**
 * Auto-link URLs in plain text
 */
export function autoLinkText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g
  
  return text
    .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(emailRegex, '<a href="mailto:$1">$1</a>')
}

/**
 * Detect if content contains markdown
 */
export function hasMarkdown(content: string): boolean {
  const markdownPatterns = [
    /\*\*[^*]+\*\*/,  // Bold
    /__[^_]+__/,       // Bold alt
    /\*[^*]+\*/,       // Italic
    /_[^_]+_/,         // Italic alt
    /\[[^\]]+\]\([^)]+\)/, // Links
    /```[\s\S]*?```/,  // Code blocks
    /`[^`]+`/,         // Inline code
    /^#{1,6}\s/m,      // Headers
    /^[-*+]\s/m,       // Lists
    /^\d+\.\s/m,       // Numbered lists
  ]
  
  return markdownPatterns.some(pattern => pattern.test(content))
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Render a dynamic form from configuration
 */
export function renderForm(config: FormConfig): HTMLElement {
  const formContainer = document.createElement('div')
  formContainer.className = 'tms-dynamic-form'
  formContainer.setAttribute('data-form-id', config.id)
  
  const formHTML = `
    <div class="tms-form-card">
      <div class="tms-form-header">
        <h3 class="tms-form-title">${escapeHtml(config.title)}</h3>
        ${config.description ? `<p class="tms-form-description">${escapeHtml(config.description)}</p>` : ''}
      </div>
      <form class="tms-form-body" id="form-${config.id}">
        ${config.fields.map(field => renderFormField(field)).join('')}
        <div class="tms-form-actions">
          ${config.cancelLabel ? `
            <button type="button" class="tms-form-btn tms-form-btn-secondary" data-action="cancel">
              ${escapeHtml(config.cancelLabel)}
            </button>
          ` : ''}
          <button type="submit" class="tms-form-btn tms-form-btn-primary">
            ${escapeHtml(config.submitLabel || 'Submit')}
          </button>
        </div>
      </form>
    </div>
  `
  
  formContainer.innerHTML = formHTML
  
  // Attach event listeners
  const form = formContainer.querySelector('form') as HTMLFormElement
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    handleFormSubmit(form, config)
  })
  
  const cancelBtn = formContainer.querySelector('[data-action="cancel"]')
  if (cancelBtn && config.onCancel) {
    cancelBtn.addEventListener('click', () => config.onCancel!())
  }
  
  return formContainer
}

/**
 * Render a single form field
 */
function renderFormField(field: FormField): string {
  const id = `field-${field.name}`
  const requiredAttr = field.required ? 'required' : ''
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''
  
  let inputHTML = ''
  
  switch (field.type) {
    case 'textarea':
      inputHTML = `
        <textarea
          id="${id}"
          name="${field.name}"
          class="tms-form-input tms-form-textarea"
          ${placeholder}
          ${requiredAttr}
          rows="4"
        ></textarea>
      `
      break
      
    case 'select':
      inputHTML = `
        <select
          id="${id}"
          name="${field.name}"
          class="tms-form-input tms-form-select"
          ${requiredAttr}
        >
          <option value="">Select ${field.label}</option>
          ${(field.options || []).map(opt => 
            `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`
          ).join('')}
        </select>
      `
      break
      
    default:
      const validationAttrs = field.validation ? [
        field.validation.pattern ? `pattern="${escapeHtml(field.validation.pattern)}"` : '',
        field.validation.min !== undefined ? `min="${field.validation.min}"` : '',
        field.validation.max !== undefined ? `max="${field.validation.max}"` : '',
        field.validation.minLength ? `minlength="${field.validation.minLength}"` : '',
        field.validation.maxLength ? `maxlength="${field.validation.maxLength}"` : '',
      ].filter(Boolean).join(' ') : ''
      
      inputHTML = `
        <input
          type="${field.type}"
          id="${id}"
          name="${field.name}"
          class="tms-form-input"
          ${placeholder}
          ${requiredAttr}
          ${validationAttrs}
        />
      `
  }
  
  return `
    <div class="tms-form-field">
      <label for="${id}" class="tms-form-label">
        ${escapeHtml(field.label)}
        ${field.required ? '<span class="tms-form-required">*</span>' : ''}
      </label>
      ${inputHTML}
    </div>
  `
}

/**
 * Handle form submission
 */
function handleFormSubmit(form: HTMLFormElement, config: FormConfig) {
  const formData = new FormData(form)
  const data: Record<string, string> = {}
  
  formData.forEach((value, key) => {
    data[key] = value.toString().trim()
  })
  
  // Validate required fields
  const missingFields = config.fields
    .filter(field => field.required && !data[field.name])
    .map(field => field.label)
  
  if (missingFields.length > 0) {
    alert(`Please fill in required fields: ${missingFields.join(', ')}`)
    return
  }
  
  // Call submit handler
  config.onSubmit(data)
  
  // Disable form after submission
  const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Submitted ✓'
  }
  
  // Disable all inputs
  form.querySelectorAll('input, textarea, select').forEach(input => {
    (input as HTMLInputElement).disabled = true
  })
}

/**
 * Parse form request from AI message
 */
export function parseFormRequest(content: string): FormConfig | null {
  try {
    // Check for JSON form data in markdown code blocks
    const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      const formData = JSON.parse(jsonMatch[1])
      if (formData.type === 'form' && formData.fields) {
        return formData as FormConfig
      }
    }
    
    // Check for inline JSON
    const inlineMatch = content.match(/\{[\s\S]*"type"\s*:\s*"form"[\s\S]*\}/)
    if (inlineMatch) {
      const formData = JSON.parse(inlineMatch[0])
      if (formData.fields) {
        return formData as FormConfig
      }
    }
  } catch (error) {
    console.error('Failed to parse form request:', error)
  }
  
  return null
}

/**
 * Common form templates
 */
export const FormTemplates = {
  contactInfo: (onSubmit: (data: Record<string, string>) => void): FormConfig => ({
    id: 'contact-info',
    title: 'Contact Information',
    description: 'Please share your contact details so we can assist you better.',
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'John Doe',
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'john@example.com',
        validation: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'phone',
        required: false,
        placeholder: '+1 (555) 000-0000',
      },
    ],
    submitLabel: 'Continue',
    onSubmit,
  }),
  
  createTicket: (onSubmit: (data: Record<string, string>) => void): FormConfig => ({
    id: 'create-ticket',
    title: 'Create Support Ticket',
    description: 'Provide details about your issue and we\'ll create a ticket for you.',
    fields: [
      {
        name: 'title',
        label: 'Issue Title',
        type: 'text',
        required: true,
        placeholder: 'Brief summary of the issue',
        validation: {
          minLength: 5,
          maxLength: 100,
        },
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Please describe your issue in detail...',
        validation: {
          minLength: 10,
        },
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        required: true,
        options: ['Low', 'Normal', 'High', 'Urgent'],
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: false,
        options: ['Question', 'Problem', 'Incident', 'Feature Request'],
      },
    ],
    submitLabel: 'Create Ticket',
    cancelLabel: 'Cancel',
    onSubmit,
  }),
  
  emailCapture: (onSubmit: (data: Record<string, string>) => void): FormConfig => ({
    id: 'email-capture',
    title: 'Stay in Touch',
    description: 'Enter your email to receive updates and continue the conversation.',
    fields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'your@email.com',
        validation: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
      },
    ],
    submitLabel: 'Submit',
    onSubmit,
  }),
}
