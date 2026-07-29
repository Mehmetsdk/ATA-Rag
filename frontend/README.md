# ATA University Assistant (Frontend)

Production-ready chatbot frontend for **Akademia Techniczno-Artystyczna**. Students, applicants, staff, and visitors can ask questions grounded in indexed university sources.

This package is the shared frontend foundation for the chatbot and a future `/dashboard` route. It does not include authentication, registration, or backend RAG logic.

## Stack

- Next.js App Router
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- Lucide icons

## Local setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL, e.g. `http://localhost:8000` (trailing slashes are stripped) |
| `NEXT_PUBLIC_USE_MOCK_API` | Enable mock adapter only when set to `true`, `1`, or `yes` (case-insensitive). Values such as `false`, `0`, empty, or unset keep mock mode **off**. |

Example (`.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=true
```

### Important: build-time embedding

`NEXT_PUBLIC_*` variables are **inlined into the client bundle at Next.js build time**.

- After changing them for a production build, run `npm run build` again (then `npm run start`).
- In development, restart `npm run dev` after changing `.env.local`.

Never put LLM keys, embedding keys, database credentials, or other server secrets in frontend env files. Only public configuration belongs in `NEXT_PUBLIC_*`.

## Mock mode

When `NEXT_PUBLIC_USE_MOCK_API=true`, the UI talks to `src/lib/api/mock-chat-client.ts` instead of the network. The mock module is loaded dynamically and is not used in real API mode.

Mock behaviour:

- 700–1200 ms simulated latency
- Realistic answers and 1–3 sources for common university questions
- Sources are labeled **Demo sources** in the UI and titled with `[Demo]`
- Query `trigger error` → backend-unavailable error (for testing)
- Query `question with no sources` → answer with an empty source list

Components never choose mock vs real API. That decision lives in `src/lib/api/chat-client.ts`.

## Connect the FastAPI backend

1. Start the API so `POST /api/chat` is available and CORS allows your frontend origin.
2. Update `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
```

3. Restart the Next.js dev server (or rebuild for production).

The client calls `${NEXT_PUBLIC_API_BASE_URL}/api/chat` after normalizing the base URL (no double slash).

Expected request body:

```json
{
  "question": "How much is Computer Science tuition?",
  "language": "en"
}
```

Expected response shape:

```json
{
  "answer": "…",
  "sources": [
    {
      "title": "Computer Science Tuition",
      "url": "https://example.edu/tuition",
      "section": "Fees",
      "excerpt": "Optional source excerpt",
      "source_type": "website"
    }
  ],
  "confidence": 0.84,
  "latency_ms": 1430
}
```

Snake_case fields are normalized to camelCase in `src/lib/api/chat-mapper.ts` before reaching UI components.

## Scripts

```bash
npm run dev        # development server
npm run lint       # ESLint
npm run typecheck  # TypeScript (--noEmit)
npm test           # focused unit tests (Node test runner)
npm run build      # production build
npm run start      # serve production build
```

## Architecture

```
src/
  app/                 # routes + global styles
  components/
    layout/            # reusable shell (header/footer)
    chat/              # chatbot UI
    ui/                # shared primitives
  hooks/               # useChat, auto-scroll
  lib/
    api/               # client, mapper, errors, mock
    chat/              # constants + helpers
    config/            # typed env
  types/               # domain types
```

Each page wraps content in `AppShell` (see `src/app/page.tsx`), so a future `/dashboard` route can reuse the same navigation, tokens, and UI primitives with a different `activeNav`.

## Design tokens

Theme values live as CSS variables in `src/app/globals.css` (`--background`, `--primary`, `--accent`, etc.) so branding can change without touching components.
