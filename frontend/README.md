# VraiTicket — Next.js Frontend

Modern IT ticket management frontend built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Zustand**.

---

## Design System

**Aesthetic:** Dark industrial — near-black surfaces, amber accent, teal secondary  
**Fonts:** Syne (display/headings) + DM Sans (body) + JetBrains Mono (code/IDs)  
**Theme:** Deep dark with tight contrast ratios and precise spacing

---

## Tech Stack

| Concern         | Technology                              |
|-----------------|-----------------------------------------|
| Framework       | Next.js 14 (App Router)                 |
| Language        | TypeScript                              |
| Styling         | Tailwind CSS + CSS Variables            |
| State           | Zustand (with persist middleware)       |
| Forms           | React Hook Form + Zod                   |
| HTTP            | Axios (with JWT interceptor)            |
| Components      | Radix UI primitives + custom            |
| Charts          | Recharts                                |
| Notifications   | react-hot-toast                         |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout + Toaster
│   ├── page.tsx                   # → redirects to /dashboard
│   ├── login/
│   │   └── page.tsx               # Full-screen login
│   └── (dashboard)/               # Route group — all protected pages
│       ├── layout.tsx             # Injects DashboardShell (auth guard)
│       ├── dashboard/page.tsx     # Stats + recent tickets
│       ├── tickets/
│       │   ├── page.tsx           # Paginated tickets list with filters
│       │   ├── new/page.tsx       # Create ticket form
│       │   └── [id]/page.tsx      # Ticket detail + comments + rating
│       └── admin/
│           ├── stats/page.tsx     # Charts + agent performance
│           ├── categories/page.tsx # Category CRUD + smart assignment
│           └── users/page.tsx     # User management
├── components/
│   ├── ui/
│   │   ├── index.tsx              # Button, Input, Textarea, Select, Modal, Avatar, Tooltip, Spinner
│   │   └── Badges.tsx             # StatusBadge, PriorityBadge
│   ├── layout/
│   │   ├── Sidebar.tsx            # Role-aware navigation sidebar
│   │   ├── TopNav.tsx             # Header with user info
│   │   └── DashboardShell.tsx     # Auth guard + layout
│   └── admin/
│       └── StatCard.tsx           # KPI card component
├── lib/
│   ├── api.ts                     # Axios instance + token injection + 401 handler
│   ├── services.ts                # All API calls (auth, tickets, users, etc.)
│   └── utils.ts                   # cn(), timeAgo(), status configs, constants
├── hooks/
│   └── useAuthStore.ts            # Zustand auth store with localStorage persistence
├── types/
│   └── index.ts                   # All TypeScript types (mirrors backend schemas)
└── styles/
    └── globals.css                # Fonts, CSS variables, base styles, component classes
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL to your backend
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Make sure the backend is running

```bash
# In your vraiticket backend directory:
uvicorn app.main:app --reload --port 8000
```

### 4. Start the dev server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Build for production

```bash
npm run build
npm start
```

---

## Authentication Flow

1. User submits login form → `POST /auth/login`
2. Token stored in Zustand (persisted to `localStorage` via zustand/persist)
3. Axios interceptor injects `Authorization: Bearer <token>` on every request
4. On 401 → token cleared, redirect to `/login`
5. `DashboardShell` checks `isAuthenticated` — redirects to `/login` if false

---

## Role-Based UI

| Feature                | client | agent | admin |
|------------------------|--------|-------|-------|
| See own tickets        | ✅     | —     | ✅    |
| See assigned tickets   | —      | ✅    | ✅    |
| Create ticket          | ✅     | —     | ✅    |
| Update status          | ❌     | ✅    | ✅    |
| Add internal note      | ❌     | ✅    | ✅    |
| See internal notes     | ❌     | ✅    | ✅    |
| Rate resolved ticket   | ✅     | ❌    | ❌    |
| Sidebar: Stats         | ❌     | ❌    | ✅    |
| Sidebar: Categories    | ❌     | ❌    | ✅    |
| Sidebar: Users         | ❌     | ❌    | ✅    |

---

## Pages Overview

### `/login`
Full-screen dark login with animated background mesh, demo credentials panel.

### `/dashboard`
- Greeting with time-of-day detection
- 4 KPI stat cards (total, open, resolved, escalated)
- Recent tickets table
- Agent performance grid (admin only)

### `/tickets`
- Filterable, paginated table
- Filters: status, priority, category, search
- Overdue SLA indicator (rose color)
- Role-scoped: clients see own, agents see assigned, admin sees all

### `/tickets/new`
- Controlled form with Zod validation
- Priority + category selectors
- On submit → redirects to ticket detail

### `/tickets/[id]`
- Full ticket header with status badge + Update button
- Description panel
- Comments thread (internal notes shown with lock badge, hidden from clients)
- Activity/audit log timeline
- Sidebar: metadata, SLA deadline, rating display
- Rating modal (star selector, 1-5) for clients on RESOLVED tickets
- Update modal (status + assignee) for agents/admins

### `/admin/stats`
- 4 KPI cards
- Bar chart (tickets by status, color-coded)
- Pie chart (distribution)
- Average resolution time
- Agent performance table with progress bars

### `/admin/categories`
- Card grid showing all categories
- Create/edit modal with name, description, default agent, SLA hours
- Toggle active/inactive

### `/admin/users`
- Searchable, filterable table
- Create user modal with role selector
- Toggle active/inactive per user
