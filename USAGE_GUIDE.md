# 🚀 TMS Application Guide

## Quick Start - What to Run

### Option 1: Run Everything Together (Recommended)
```bash
cd app/frontend
pnpm run dev
```
This starts all applications:
- **Agent Console**: http://localhost:3000 (for your staff)
- **Public View**: http://localhost:3001 (for customers via magic links)
- **Shared Library**: Auto-builds when components change

### Option 2: Run Individual Applications

#### For Internal Staff (Support Agents/Admins):
```bash
cd app/frontend/agent-console
pnpm run dev
# Visit: http://localhost:3000
```

#### For Customer Magic Links:
```bash
cd app/frontend/public-view
pnpm run dev
# Visit: http://localhost:3001/tickets/[TOKEN]
```

## 📱 Application Purposes

### 🏢 Agent Console (Port 3000)
**WHO**: Your company's support staff
**PURPOSE**: Internal ticket management system
**FEATURES**:
- Login with email/password
- View all customer tickets
- Manage email inbox
- Assign tickets to agents
- Internal messaging and notes

**LOGIN REQUIRED**: Yes (agents/admins only)

### 🌐 Public View (Port 3001)
**WHO**: Your customers
**PURPOSE**: Customer self-service portal via magic links
**FEATURES**:
- View ticket details via secure magic link
- Reply to support conversations
- No account registration needed
- Mobile-optimized interface

**LOGIN REQUIRED**: No (magic link authentication)

### 📚 Shared Library
**PURPOSE**: Common code shared between applications
**CONTAINS**:
- UI components (buttons, forms, etc.)
- Theme system (dark/light modes)
- TypeScript types
- API client
- Utility functions

**NOT A STANDALONE APP**: This is a library used by other apps

## 🔗 Test the Magic Link System

1. **Start the backend**:
```bash
cd app/backend
./tms-backend
```

2. **Start the frontend**:
```bash
cd app/frontend
pnpm run dev
```

3. **Generate a test magic link**:
```bash
./test-magic-link.sh
```

4. **Visit the magic link**: Use the URL from step 3 in your browser

## 🎯 Real Customer Flow

1. **Customer emails**: support@yourcompany.com
2. **Agent sees email**: In agent console inbox
3. **Agent creates ticket**: From the email
4. **System sends magic link**: Email to customer
5. **Customer clicks link**: Opens public view
6. **Customer replies**: Direct to support team
7. **Agent responds**: Via agent console

## 🛠️ Development Tips

- **Hot Reload**: All apps auto-refresh when you edit code
- **Shared Components**: Edit once in `shared/`, used everywhere
- **Type Safety**: Full TypeScript across all applications
- **Theme System**: Consistent styling with dark/light modes

## 📊 Which Port is Which?

| Port | Application | Users | Purpose |
|------|-------------|-------|---------|
| 8080 | Backend API | All | REST API server |
| 3000 | Agent Console | Staff | Internal ticket management |
| 3001 | Public View | Customers | Magic link ticket access |

Start with running everything together (`pnpm run dev` in `app/frontend`) to see the full system in action! 🎉
