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
- Demo source URLs use the confirmed domain `https://akademiata.pl` (not `ata.edu.pl` / `akademiata.edu.pl`)
- Every successful response includes a stable `queryId`
- Prior conversation `history` is accepted (max 8 messages) and reflected in the mock answer text
- Thumbs up/down calls `submitMockFeedback` with `{ queryId, rating }` only
- Query `trigger error` → backend-unavailable error (for testing)
- Query `question with no sources` → answer with an empty source list (still has `queryId`)

Components never choose mock vs real API. That decision lives in `src/lib/api/chat-client.ts`.

## Connect the FastAPI backend

1. Start the API so `POST /api/chat` and `POST /api/feedback` are available and CORS allows your frontend origin. See `backend/README.md`.
2. Update `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
```

3. Restart the Next.js dev server (or rebuild for production).

The client calls:

- `${NEXT_PUBLIC_API_BASE_URL}/api/chat`
- `${NEXT_PUBLIC_API_BASE_URL}/api/feedback`

### Chat request

```json
{
  "question": "How much is Computer Science tuition?",
  "language": "en",
  "history": [
    { "role": "user", "content": "How do I apply?" },
    { "role": "assistant", "content": "Complete the online application form…" }
  ]
}
```

`history` contains **prior completed turns only** (not the current question), max **8** messages. The first message sends `"history": []`.

### Chat response

```json
{
  "answer": "…",
  "sources": [
    {
      "title": "Computer Science Tuition",
      "url": "https://akademiata.pl/kalkulator-czesnego/",
      "section": "Fees",
      "excerpt": "Optional source excerpt",
      "source_type": "website"
    }
  ],
  "confidence": 0.84,
  "latency_ms": 1430,
  "query_id": "backend-generated-id"
}
```

`mapChatResponse` rejects payloads without a valid `query_id`. The UI stores `queryId` on the assistant message for feedback.

### Feedback request

```json
{
  "query_id": "backend-generated-id",
  "rating": "up",
  "comment": null
}
```

### Feedback response

```json
{
  "success": true,
  "feedback_id": "feedback-record-id"
}
```

Feedback controls appear only for completed assistant answers that have a `queryId`. Votes may change from up→down (and vice versa). Pending requests block duplicates; failures keep the answer and show an accessible retry.

Snake_case fields are normalized to camelCase in `src/lib/api/chat-mapper.ts`. Canonical contract: [CONTRACTS.md](../CONTRACTS.md) §3.

## Scripts

```bash
npm run dev        # development server
npm run lint       # ESLint
npm run typecheck  # TypeScript (--noEmit)
npm test           # unit + contract tests (Node test runner)
npm run build      # production build
npm run start      # serve production build
```

## Architecture

```
src/
  app/                 # routes + global styles
  components/
    layout/            # reusable shell (header/footer)
    chat/              # chatbot UI (incl. answer feedback controls)
    ui/                # shared primitives
  hooks/               # useChat (history + feedback), auto-scroll
  lib/
    api/               # client, mapper, errors, mock
    chat/              # constants, history, feedback helpers
    config/            # typed env
  types/               # domain types
```

Each page wraps content in `AppShell` (see `src/app/page.tsx`), so a future `/dashboard` route can reuse the same navigation, tokens, and UI primitives with a different `activeNav`.

## Design tokens

Theme values live as CSS variables in `src/app/globals.css` (`--background`, `--primary`, `--accent`, etc.) so branding can change without touching components.
