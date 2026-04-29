# PrinterFleet Frontend

React SPA for the NOC printer-fleet dashboard. Built with **Vite + React 19 + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router**.

## Development

The Vite dev server runs on `:5173` and proxies `/api/*` and `/ws/*` to the Django backend on `:8000`, so both must be running.

```bash
# 1. Install deps (once)
cd frontend
npm install

# 2. Start Django + Celery + Redis + Postgres
cd ..
docker-compose up backend db redis celery_worker celery_beat

# 3. In another terminal, start the Vite dev server
cd frontend
npm run dev
# → http://localhost:5173
```

## Production build

```bash
cd frontend
npm run build
# → frontend/dist/ contains index.html + hashed assets/
```

Django serves `frontend/dist/index.html` for any non-API URL (see `Backend/devices/spa.py`), and streams hashed assets from `frontend/dist/assets/`. Nothing else to configure — just build before starting the stack.

```bash
# Rebuild and restart backend to pick up fresh bundle
cd frontend && npm run build && cd ..
docker-compose restart backend
# → http://localhost:8000
```

## Environment variables

Both are optional. In dev the Vite proxy handles everything; in prod the app uses the current host.

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_API_URL` | `/api` | REST base path |
| `VITE_WS_URL` | `ws(s)://<host>` | WebSocket base URL |

Set in `frontend/.env.local` if you need to point at a remote backend during dev.

## Project layout

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx                  # React root + providers
│   ├── App.tsx                   # routes
│   ├── index.css                 # tailwind + CSS variables
│   ├── lib/
│   │   ├── api.ts                # typed fetch + ApiError
│   │   ├── auth.ts               # localStorage token/user + RBAC
│   │   ├── env.ts                # VITE_* env vars
│   │   ├── query.ts              # TanStack Query client + keys
│   │   ├── utils.ts              # cn(), formatters
│   │   └── ws.ts                 # WebSocket + cache invalidation
│   ├── features/
│   │   ├── auth/api.ts           # login/logout/me/users
│   │   ├── logs/api.ts           # logs + daily-stats
│   │   └── printers/api.ts       # printers CRUD + sre + poll
│   ├── types/api.ts              # types mirroring DRF serializers
│   ├── components/
│   │   ├── ui/                   # shadcn primitives (owned, editable)
│   │   ├── app-layout.tsx        # sidebar + header shell
│   │   ├── app-sidebar.tsx
│   │   ├── app-header.tsx
│   │   ├── auth-guard.tsx
│   │   ├── printer-card.tsx      # dashboard grid tile
│   │   ├── supply-bar.tsx        # toner/drum level bar
│   │   ├── health-ring.tsx
│   │   └── status-indicator.tsx
│   └── pages/
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx     # SRE cards + fleet grid
│       ├── PrintersPage.tsx      # table + filters + add/edit dialogs
│       ├── PrinterDetailPage.tsx # tabs: overview, consumables, logs, stats
│       ├── AlertsPage.tsx        # event feed with live WS prepends
│       └── NotFoundPage.tsx
```

## What's in scope-1 (this build)

| Route | Page | Status |
|-------|------|--------|
| `/login` | Sign in | ✅ |
| `/dashboard` | SRE signals, fleet health, device grid | ✅ |
| `/printers` | Table with filters, pagination, CRUD | ✅ |
| `/printers/:id` | Detail with tabs (overview / consumables / logs / 30-day chart) | ✅ |
| `/alerts` | Event feed + live WS prepends + active-down banner | ✅ |
| `/consumables`, `/reports`, `/settings` | — | Second pass |

## Conventions

- **State**: TanStack Query for server state, local `useState` for UI state. No Redux.
- **Forms**: `react-hook-form + Zod` for anything non-trivial; inline `useState` for two-field dialogs.
- **Styling**: Tailwind utilities + shadcn components. CSS variables drive dark theme — see `src/index.css`.
- **Icons**: lucide-react only (consistent stroke, tree-shakes well).
- **Accessibility**: Radix primitives via shadcn handle focus traps, keyboard nav, ARIA.

## The old frontend

`Flowbite/` (the previous Astro 2 + Flowbite dashboard) is left in the repo as reference while this rewrite bakes. Once scope-2 ships it can be deleted.
