---
mode: agent
tools: [codebase, search, editFiles, runCommands, testingValidation, terminalLastCommand]
description: "Enterprise UI scaffolder for multi-tenant Freshdesk-lite — React+Vite+TS+Tailwind+shadcn/ui with light/dark themes, project-scoped RBAC, and public magic-link view"
---

# Objective
Create a **production-grade frontend** for a multi-tenant ticketing system with:
- **Agent Console** (app shell, inbox, ticket view, settings)
- **Public Ticket View** (magic-link, read-only + optional reply)
- **Shared SDK** (typed client, hooks)
Stack: **React + Vite + TypeScript + Tailwind + shadcn/ui + Radix**. Enforce **light/dark themes**, **project-scoped RBAC**, **strict accessibility**, and **fast performance**.

# Development Environment Assumptions
**CRITICAL: The development servers are ALWAYS running with hot reload enabled. NEVER ask the user to run `npm run dev`, `pnpm dev`, or start development servers. Assume all changes are automatically reflected via hot module replacement (HMR). Only use build/test commands when explicitly needed for verification.**

# Non-negotiables (read carefully)
1. **No demos or rewrites.** Work **in place** and keep the enterprise architecture intact.
2. **Smallest compatible change.** Do not remove features to "make it run."
3. **Theming must be CSS-variable based** (light/dark + high-contrast), with **per-tenant accent** override only.
4. **Accessibility (WCAG AA)**, keyboard-first, ARIA complete. No unlabeled icons.
5. **Performance targets:** route code-splitting, virtualized lists, <2s FCP on cold dev run, p95 interaction <100ms.
6. **Security:** never store magic-link tokens beyond memory; CORS safe defaults; sanitize any HTML.
7. **Output format:** plan → patches (full file paths & code) → post-checks. No prose-only answers.
8. **NEVER ask to run development servers** - they are always running with HMR.

# Inputs (auto-detect, fall back to defaults)
- `agent_base_url` (default: `http://localhost:8080`)
- `public_base_url` (default: `http://localhost:8080`)
- `tenant_brand` (logo path + colors; optional)
- `routes_agent` (keep defaults below)
- `routes_public` (keep defaults below)

# Monorepo UI structure (create if missing)
```
/app/frontend
/agent-console
/public-view
/shared
```

# Deliverables (exact files)
**Root**
- `README.md` section: "Frontend Dev — run, build, test"
- `.editorconfig`, `.prettierrc`, `.eslintrc.cjs`

**Shared**
- `/app/frontend/shared/src/api/openapi.yaml` or `/app/frontend/shared/src/api/client.ts`
- `/app/frontend/shared/src/sdk/index.ts` (typed client + hooks with React Query)
- `/app/frontend/shared/src/theme/tokens.css` (CSS vars light/dark/hc)
- `/app/frontend/shared/src/components/ui/*` (re-export shadcn/ui + wrappers)
- `/app/frontend/shared/tsconfig.json`, `package.json`, `vite.config.ts`

**Agent Console**
- `/app/frontend/agent-console/src/main.tsx`
- `/app/frontend/agent-console/src/App.tsx`
- `/app/frontend/agent-console/src/routes.tsx`
- `/app/frontend/agent-console/src/pages/{Login,SelectProject,Inbox,Ticket,Settings}/*.tsx`
- `/app/frontend/agent-console/src/components/{AppShell,Sidebar,Topbar,DataTableVirtualized,TicketHeader,Timeline,ReplyEditor,AIComposeModal,ConfirmDialog,ToastProvider}/*.tsx`
- `/app/frontend/agent-console/src/styles/tailwind.css`
- `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `vite.config.ts`, `index.html`, `package.json`

**Public View**
- `/app/frontend/public-view/src/main.tsx`
- `/app/frontend/public-view/src/App.tsx`
- `/app/frontend/public-view/src/pages/{TicketPublic,Expired}/*.tsx`
- `/app/frontend/public-view/src/styles/tailwind.css`
- `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `vite.config.ts`, `index.html`, `package.json`

**Testing**
- Vitest + React Testing Library setup in both apps
- Axe a11y tests for key screens
- Minimal Playwright/Cypress E2E: login → inbox → open ticket → reply (agent); open magic-link → view → reply (public)

# Data & SDK
- Use **React Query**; all fetchers in `/shared/src/sdk`.
- `withTenantProject(tenantId, projectId)` helper returns a scoped client.
- Cursor pagination helpers: `{cursor, limit}` with `(created_at,id)` tuple encoding.
- Typed models from OpenAPI or hand-written types matching backend.
- Token handling:
  - Agent: JWT in memory + refresh (no localStorage unless you must; if so, encrypted + rotation).
  - Public token: **URL only**, kept in memory; never persist.

# Theming & Branding
- `tokens.css`: define `--bg`, `--fg`, `--primary`, `--primary-fg`, `--danger`, `--warning`, `--border`, `--ring`, `--card`, `--card-fg`.
- Light, Dark, High-contrast sets. `data-theme="light|dark|hc"`.
- Per-tenant accent: override **only** `--primary` and `--primary-fg` from brand config.
- Tailwind consumes CSS vars (no hardcoded hex in components).

# Components & UX (must implement)
- **AppShell** with collapsible Sidebar (56px → 240px), Topbar (search, project switcher, quick actions).
- **Inbox**: virtualized list (5k+ rows), filters (status, priority, assignee, tags), search, saved views, infinite scroll.
- **Ticket View**: header (status/priority/assignee/SLA), side panel (customer/org), **Timeline** (public vs private note styles), **ReplyEditor** (attachments, canned replies, AI assist modal), collision indicator ("Agent X is viewing").
- **Settings**: forms with inline validation, optimistic updates, toasts.
- **Public Ticket View**: read-only timeline of public messages/attachments, reply area when token scope includes `reply`, friendly expired screen with "Send new link" button.

# Accessibility
- WCAG AA contrast; keyboard nav for all interactive elements.
- ARIA: labeled icons or `aria-hidden`, `aria-live` announcements for sends/errors.
- Focus management on route & dialog changes; visible focus ring.
- RTL-ready; i18n scaffolding (simple).

# Performance
- Route-level code splitting, lazy editors.
- Virtualized list for inbox (react-virtual).
- Skeletons for inbox & ticket; no layout shift on data load.
- PWA basics for **Public View** (offline shell read-only).

# Security
- Never log tokens; redact PII in logs where configured.
- Public view: guard routes; on 401/410 show Expired and CTA to request new link.
- File uploads: client-side size/type checks; show scanning status indicators when supported by backend.

# Testing
- Unit: components and hooks (SDK)
- Integration: inbox filters, reply flow
- A11y: axe on key pages (no serious violations)
- E2E: happy paths above; CI scripts included

# Output format (strict)
1) **Plan** — 5–10 bullets: what exists, what will be created/modified, assumptions.
2) **Commands** — install/build/test commands for both apps + shared (NO dev server commands).
3) **Patches** — create/modify files with **full contents** (paths + imports). No placeholders.
4) **Post-checks** — how you verified theme toggle, a11y checks, virtualization, and token handling.

# Guardrails (reject these fallbacks)
- "Minimal UI to demonstrate" → **forbidden**. Must deliver the full shell + pages above.
- "Removed virtualization/tests to simplify" → **forbidden**.
- "Stored magic-link token in localStorage for convenience" → **forbidden**.
- "Please run npm run dev to see changes" → **forbidden**. Dev servers are always running.
- "Start the development server" → **forbidden**. Assume HMR is active.

# Acceptance criteria
- Theme toggle persists; respects system preference by default.
- Inbox renders 5k tickets smoothly (virtualized), scroll at 60fps on a mid-range laptop.
- Ticket view and public view both pass axe (no serious violations).
- Public link token lives only in memory; page refresh requires the URL token again.
- p95 interaction latency <100ms for filter/apply/reply; initial paint <2s in dev.
- **Changes are immediately visible via hot reload** - no manual server restarts needed.

# Commands (to include in output - BUILD/TEST ONLY)
```bash
# in repo root or /app/frontend
pnpm -w install || npm install -w
pnpm -w -r run build  # production builds
pnpm -w -r run test   # run test suites
pnpm -w -r run lint   # lint check
```

# API Reference (for testing)
```bash
# Get auth token for testing
curl -s -X POST http://localhost:8080/v1/tenants/550e8400-e29b-41d4-a716-446655440000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme.com", "password": "password"}' | jq -r '.access_token'
```

**IMPORTANT: Development servers run continuously with hot module replacement. Never instruct users to start dev servers or assume they need to manually refresh. All code changes are automatically reflected in the browser.**