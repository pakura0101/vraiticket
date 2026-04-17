# VraiTicket — Frontend

Next.js 14 frontend for the VraiTicket IT support platform.

## Stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** with CSS variable-based light/dark theming
- **Zustand** for auth and theme state (persisted to localStorage)
- **React Hook Form** + **Zod** for form validation
- **Axios** with JWT Bearer token interceptor
- **Recharts** for performance analytics charts
- **Radix UI** for accessible Select, Dialog, Tooltip components

## Project Structure

```
frontend/src/
├── app/
│   ├── login/              ← Public login page (theme toggle works without auth)
│   └── (dashboard)/        ← Protected layout
│       ├── dashboard/      ← Overview with stats and recent tickets
│       ├── tickets/        ← Ticket list, new ticket, internal ticket, detail
│       └── admin/          ← Stats, performance, groups, companies, users
├── components/
│   ├── admin/StatCard.tsx
│   ├── layout/             ← Sidebar, TopNav, DashboardShell
│   ├── tickets/AttachmentGallery.tsx
│   └── ui/                 ← Button, Input, Select, Modal, Avatar, AuthAvatar…
├── hooks/
│   ├── useAuthStore.ts     ← Zustand auth store (token + user, persisted)
│   ├── useAuthImage.ts     ← Fetches auth-gated images via axios blob
│   └── useTheme.ts         ← Zustand theme store (dark/light, persisted)
├── lib/
│   ├── api.ts              ← Axios instance + 401 interceptor
│   ├── services.ts         ← API call wrappers (ticketsAPI, usersAPI…)
│   └── utils.ts            ← STATUS_CONFIG, cn(), formatDate…
├── styles/globals.css      ← CSS variables for dark + light themes
└── types/index.ts          ← TypeScript interfaces
```

## Local Development

### Prerequisites
- Node.js 20+

```bash
cd frontend

# Install dependencies
npm install

# Environment
cp .env.local.example .env.local
# Default: NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start dev server
npm run dev
```

App runs at `http://localhost:3000`.  
Make sure the backend is running at `http://localhost:8000`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL. With Docker + Nginx use `/api/v1`. With direct ports use the full URL. |

> **Note:** `NEXT_PUBLIC_` variables are baked into the build at compile time by Next.js. If you change this value you must rebuild.

## Theming

The app supports dark and light themes:

- Theme persisted in `localStorage` as `vt_theme`
- A blocking inline `<script>` in `layout.tsx` applies `data-theme` to `<html>` before first paint (no flash)
- All colors use CSS variables (`var(--bg)`, `var(--text)`, `var(--border)` etc.)
- Tailwind `dark:` variants work via `darkMode: ["selector", "[data-theme='dark']"]` in `tailwind.config.ts`
- Toggle: **Sun/Moon** button in TopNav (and on the login page — no auth required)

## Authenticated Image Fetching

All images served by the backend require a Bearer token. Two components handle this:

- **`AuthAvatar`** — fetches user avatar photos via axios, falls back to initials
- **`AttachmentGallery`** — fetches image attachments via axios, shows files as downloadable rows

Both components use relative paths (e.g. `/users/3/avatar`) — the axios baseURL prefix is never hardcoded.

## Building for Production

```bash
npm run build
npm start
```

The `next.config.js` includes `output: "standalone"` which produces a minimal Node.js server in `.next/standalone/` — used by the Docker multi-stage build.