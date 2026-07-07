# GrowEasy — AI-Powered CSV Importer

Upload a CSV in *any* column layout — Facebook Lead Ads, Google Ads exports, a real-estate CRM
dump, a manually built spreadsheet — and have it intelligently mapped into GrowEasy's CRM schema
using an LLM, with a preview/confirm flow and a clear success/skipped breakdown.

Built for the GrowEasy Software Developer (Intern) assignment.

## Live pieces

- `frontend/` — Next.js 14 (App Router, TypeScript, Tailwind). Handles upload, client-side
  preview, and rendering of the mapped results.
- `backend/` — Node.js + Express. Accepts the CSV, parses it, batches rows to an LLM for field
  mapping, validates the AI's output against the CRM schema rules, and returns structured JSON.

## Why it's built this way

The hard part of this assignment isn't CSV parsing — it's that column names are never
standardized. So the architecture keeps a clean seam between "structure" and "meaning":

1. **Parsing** (`backend/src/services/csvParser.js`) turns the file into row objects without
   assuming anything about headers. Whatever the columns are called becomes the object keys.
2. **Meaning** (`backend/src/services/aiMapper.js`) is entirely the LLM's job. The prompt gives it
   the CRM schema, the fixed enum values, and the field-specific rules (multiple emails/phones,
   date format, etc.) and asks it to reason about each row's *semantics*, not its column names.
3. **Trust, but verify** (`backend/src/services/validator.js`) is a plain-JS pass that re-checks
   every hard business rule after the AI responds — enum membership, `Date`-parseability, the
   "skip if no email or phone" rule — so a model hallucination never breaks the CRM's data
   contract, even under batching and retries.

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# then edit .env and set GEMINI_API_KEY - get one free, no card required,
# at https://aistudio.google.com/apikey
npm install
npm run dev
# -> listening on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# -> http://localhost:3000
```

Open `http://localhost:3000`, drop in a CSV, review the preview, click **Confirm & run AI
mapping**, and watch the results come back with import/skip totals.

A sample file is included at `sample-data/messy-leads.csv` — it deliberately uses odd column
names, a row with two phone numbers, a row with two emails, and a row with neither (to exercise
the skip rule).

## Using a different AI provider

The backend ships wired to **Gemini** (`gemini-2.5-flash` by default) via `@google/generative-ai`,
because it has a genuinely free tier — no credit card, no expiry, generous enough for this
assignment (Flash/Flash-Lite models specifically; Gemini's Pro-tier models are paid-only). The
assignment allows OpenAI, Gemini, or Claude interchangeably — to swap providers, only
`backend/src/services/aiMapper.js` needs to change:

- **OpenAI**: `npm install openai`, replace the Gemini client with
  `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`, and call
  `client.chat.completions.create({ model: 'gpt-4o-mini', response_format: { type: 'json_object' }, ... })`.
- **Anthropic (Claude)**: `npm install @anthropic-ai/sdk`, then call
  `client.messages.create({ model: 'claude-...', ... })` and ask for JSON output the same way.

The prompt, batching, retry, and validation logic are provider-agnostic and don't need to change.

### A note on Gemini's free tier

Free-tier limits are per-minute and per-day, not unlimited, and Google has changed them more than
once in 2026 — always check https://ai.google.dev/gemini-api/docs/rate-limits and your live quota
in Google AI Studio before relying on a number from anywhere else, including this README. As of
mid-2026, Flash and Flash-Lite models are free with no card required; the backend paces requests
(`AI_BATCH_DELAY_MS` in `.env`, default 2s between batches) to stay comfortably under typical
per-minute limits, and retries with backoff if a 429 does slip through.

## API

### `POST /api/import`

`multipart/form-data` with a single field `file` (the CSV).

```json
{
  "headers": ["Full Name", "Email Address", "..."],
  "totalSourceRows": 42,
  "imported": [ { "created_at": "...", "name": "...", "...": "..." } ],
  "skipped": [ { "source": { "...": "..." }, "reason": "No valid email or mobile number found" } ],
  "totalImported": 40,
  "totalSkipped": 2,
  "failedBatches": []
}
```

## Deployment

- **Backend** → Render / Railway: point it at `backend/`, build command `npm install`, start
  command `npm start`, set `GEMINI_API_KEY` and `CORS_ORIGIN` (your deployed frontend URL) as
  environment variables.
- **Frontend** → Vercel: point it at `frontend/`, set `NEXT_PUBLIC_API_BASE_URL` to your deployed
  backend URL.
- Both folders include a `Dockerfile` if you'd rather run them as containers.

## Design notes

The UI leans into what this tool actually *is* — an operational data-mapping console, not a
marketing page — so it's a dark, monospace-accented interface with a real 4-step sequence
(Upload → Preview → AI Mapping → Results) and a terminal-style log while the AI batches run.

## What I'd add next with more time

- Streaming batch-by-batch results to the frontend (currently the UI waits for the whole import
  to finish, then shows one combined result).
- A virtualized table for very large imports (current implementation renders all rows, which is
  fine into the low thousands but not beyond).
- Unit tests around `validator.js` and `csvParser.js`, since those encode the actual business
  rules and are the cheapest place to catch regressions.

## Note
A note on process: I used Claude (Anthropic) as a coding assistant throughout this project — for scaffolding the frontend/backend structure, drafting the AI extraction prompt, and the validation logic. All architecture decisions, testing, and the final review were mine.  
