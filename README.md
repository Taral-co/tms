# TMS - Enterprise Ticket Management System

A production-grade multi-tenant support ticketing system with enterprise UI, magic-link authentication, and real-time messaging.

## Architecture

```
app/
├── backend/           # Go API server
├── frontend/          # Frontend monorepo
│   ├── agent-console/ # Internal agent dashboard
│   ├── public-view/   # Customer magic-link interface  
│   └── shared/        # Common components & SDK
└── deploy/            # Infrastructure & deployment
```

## Frontend Development

### Quick Start

```bash
# Install dependencies (from repo root)
pnpm -w install

# Start all frontend applications (from app/frontend)
cd app/frontend
pnpm run dev
```

**Development servers run with hot module replacement (HMR) - all changes are automatically reflected.**

### Applications

| Application | Port | Purpose | Users |
|-------------|------|---------|-------|
| **Agent Console** | 3000 | Internal staff interface | Support agents, admins |
| **Public View** | 3002* | Customer self-service | Customers via magic links |
| **Shared Library** | - | Common components/SDK | Used by other apps |

*Port may vary if 3001 is in use

### Features

#### 🏢 Agent Console (Enterprise Dashboard)
- **Enterprise UI**: Professional grade components with consistent design system
- **AppShell**: Sophisticated sidebar with smooth animations, refined topbar with backdrop blur
- **Email Detail**: Clean layout with proper visual hierarchy, status indicators, and contextual actions
- **Components**: Reusable DataCard, DetailSection, PageHeader, and StatusIndicator components
- **Inbox**: Virtualized list (5k+ tickets), advanced filters, infinite scroll
- **Ticket View**: Professional status management, timeline, reply editor with AI assist
- **Settings**: User management, tenant configuration
- **Theme Support**: Professional light/dark/high-contrast themes with CSS variables

#### 🌐 Public View (Customer Interface)  
- **Magic Link Access**: Secure token-based authentication
- **Ticket Timeline**: Read-only view of public messages
- **Reply Interface**: Customer can respond directly
- **Mobile Optimized**: Responsive design for all devices
- **Theme Toggle**: Matches system preference with manual override

#### 📚 Shared Library
- **UI Components**: shadcn/ui + custom enterprise components
- **Theme System**: CSS variables with light/dark/high-contrast modes
- **API Client**: Type-safe React Query hooks
- **Utilities**: Performance optimizations, accessibility helpers

### Build & Test

```bash
# Production builds
pnpm -w -r run build

# Run test suites  
pnpm -w -r run test

# Lint check
pnpm -w -r run lint

# Type checking
pnpm -w -r run type-check
```

### Performance

- **Route code-splitting**: Lazy-loaded pages and components
- **Virtualized lists**: Handle 5k+ items with smooth scrolling
- **Optimized bundling**: Tree-shaking, asset optimization
- **Target metrics**: <2s FCP, <100ms p95 interaction latency

### Accessibility 

- **WCAG AA compliance**: Proper contrast ratios, keyboard navigation
- **ARIA support**: Screen reader friendly with proper labels
- **Focus management**: Visible focus indicators, logical tab order
- **RTL ready**: Right-to-left language support

### Theming

The theme system uses CSS variables for consistent styling:

```css
/* Light/dark/high-contrast modes */
:root[data-theme="light"] { --background: 0 0% 100%; }
:root[data-theme="dark"] { --background: 222.2 84% 4.9%; }
:root[data-theme="hc"] { --background: 0 0% 0%; }

/* Per-tenant branding */
:root { 
  --tenant-primary: var(--primary); 
  --tenant-primary-fg: var(--primary-fg);
}
```

### Security

- **Token handling**: Magic-link tokens stored in memory only
- **CORS protection**: Secure defaults for cross-origin requests  
- **Input sanitization**: XSS prevention on user content
- **No token persistence**: Page refresh requires new magic-link

## API Integration

The frontend uses a type-safe API client with React Query:

```typescript
// Auto-generated from OpenAPI/backend types
import { useTickets, useTicket, useCreateMessage } from '@tms/shared'

// In components
const { data: tickets, isLoading } = useTickets({ 
  filter: { status: 'open' }, 
  sort: 'created_at' 
})
```

## Development Guidelines

### Hot Module Replacement (HMR)
- **Always enabled**: Dev servers run continuously with auto-reload
- **Instant feedback**: Code changes appear immediately in browser  
- **State preservation**: React state maintained across most changes

### Component Development
- **Accessibility first**: Every interactive element has proper ARIA
- **Performance aware**: Use virtualization for large lists
- **Theme compatible**: Use CSS variables, not hardcoded colors
- **Type safe**: Full TypeScript coverage with strict mode

### Testing Strategy
- **Unit tests**: Components and hooks with React Testing Library
- **Integration tests**: User flows and API interactions
- **Accessibility tests**: Automated axe checks on key pages
- **E2E tests**: Critical user journeys with Playwright

## Deployment

See `deploy/README.md` for production deployment instructions.

## Magic Link Testing

Generate test magic links for development:

```bash
# From repo root
./test-magic-link.sh
```

Visit the generated URL to test the public customer interface.
