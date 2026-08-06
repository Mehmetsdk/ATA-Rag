[INTEGRATION.md](https://github.com/user-attachments/files/30796197/INTEGRATION.md)
# Dashboard Integration Guide

Person 4's dashboard source lives at the **repository root** in `dashboard/src/`.
Copy each file into the existing Next.js frontend (`frontend/src/`).

## Files to copy

| Source (repo root) | Destination |
|---|---|
| `dashboard/src/app/dashboard/page.tsx` | `frontend/src/app/dashboard/page.tsx` |
| `dashboard/src/components/dashboard/*` | `frontend/src/components/dashboard/*` |
| `dashboard/src/hooks/use-dashboard.ts` | `frontend/src/hooks/use-dashboard.ts` |
| `dashboard/src/lib/api/dashboard-*.ts` | `frontend/src/lib/api/` |
| `dashboard/src/lib/api/mock-dashboard-client.ts` | `frontend/src/lib/api/` |
| `dashboard/src/lib/config/dashboard-env.ts` | `frontend/src/lib/config/dashboard-env.ts` |
| `dashboard/src/types/dashboard.ts` | `frontend/src/types/dashboard.ts` |

## Dependencies

These files import existing frontend modules — **do not duplicate them**:

- `@/lib/config/env` — `parseEnvBoolean`, `normalizeApiBaseUrl`
- `@/components/ui/badge`, `button`, `spinner`
- `@/components/layout/app-shell`
- `@/lib/utils/cn`
- `lucide-react` (already installed)

## Environment variables

Add to `frontend/.env.example` and `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK_DASHBOARD=true
```

When the backend is ready:

```env
NEXT_PUBLIC_USE_MOCK_DASHBOARD=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Teammate changes required (Person 3)

These changes belong to the frontend owner. **Do not apply automatically.**

### 1. Enable dashboard navigation

In `frontend/src/components/layout/app-header.tsx`, replace the disabled Dashboard span with a link:

```tsx
import Link from "next/link";

// Replace the disabled <span>Dashboard</span> with:
<Link
  href="/dashboard"
  className={cn(
    "rounded px-2 py-1 text-xs font-medium",
    activeNav === "dashboard"
      ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
  )}
  aria-current={activeNav === "dashboard" ? "page" : undefined}
>
  Dashboard
</Link>
```

Also add a link for the Assistant/chat route if desired.

### 2. Optional — wider layout for dashboard

`AppShell` uses `max-w-3xl` on `<main>`. For wider tables, Person 3 may add an optional `mainClassName` prop to `AppShell` or increase max-width for the dashboard route.

## Mock vs real API

| Mode | Env | Data source |
|---|---|---|
| Demo | `NEXT_PUBLIC_USE_MOCK_DASHBOARD=true` | In-browser mock (`mock-dashboard-client.ts`) |
| Local dev | `false` + mock server running | `integration/mock_server.py` on port 8000 |
| Production | `false` + real backend | Person 2's `/api/admin/*` endpoints |

## API contract

See `integration/CONTRACTS_DASHBOARD.md` (PROPOSED CONTRACT — for team discussion).
