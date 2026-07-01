# Hermes — Web

A modern, production-quality frontend for the Hermes document-intelligence platform.
Built with **React + Vite + TypeScript + Tailwind CSS** and shadcn/ui-style components.

It wires up the two core workflows against the FastAPI backend in this repo:

1. **Audit** — upload a document → OCR + typed extraction + deterministic audit → findings, report, and extracted data.
2. **Verification** — verify a presented document against an issuer's record of truth (confirmed / altered / not-issued / unverified), plus file-integrity signals.

…with an **Issuer Onboarding** experience (single record, bulk register import, scanned archive) and a **Dashboard** overview.

---

## Prerequisites

- **Node.js ≥ 18** (developed on Node 24) and npm.
- The **Hermes API** running locally — from the repo root:

  ```bash
  # runs fully in mock mode (no GPU, no API key needed)
  uvicorn apps.api.main:app --reload      # serves on http://localhost:8000
  ```

## Quickstart

```bash
cd apps/web
npm install
cp .env.example .env      # optional — sensible defaults work out of the box
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173**. The landing page links into the Dashboard, Audit, Verify, and Onboarding flows.

> The backend-status pill (bottom of the sidebar) turns green when the API is reachable.

## How it connects to the API

Local dev uses a **Vite proxy** so the browser never hits CORS:

- The app calls `/api/*` (default `VITE_API_URL=/api`).
- `vite.config.ts` proxies `/api` → `http://localhost:8000` and strips the `/api` prefix.

To point at a different backend during dev, set `VITE_API_PROXY_TARGET`. In production, set
`VITE_API_URL` to the deployed API origin (e.g. `https://api.hermes.example.com`) and the app
calls it directly — make sure the API's `CORS_ORIGINS` includes the web origin.

### Environment variables

| Variable                 | Default                 | Purpose                                                        |
| ------------------------ | ----------------------- | ------------------------------------------------------------- |
| `VITE_API_URL`           | `/api`                  | Base URL for API calls. `/api` is proxied in dev.             |
| `VITE_API_PROXY_TARGET`  | `http://localhost:8000` | Dev-only: where the `/api` proxy forwards to.                 |

## Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the dev server with HMR.                |
| `npm run build`     | Type-check (`tsc --noEmit`) then build to `dist/`. |
| `npm run preview`   | Serve the production build locally.           |
| `npm run typecheck` | Type-check only.                              |

## Pages

| Route          | Description                                                                             |
| -------------- | -------------------------------------------------------------------------------------- |
| `/`            | Landing — hero, product story, two-tier explanation, feature grid, CTAs.               |
| `/dashboard`   | Overview — stat cards, recent-activity feed, verification-outcome chart, system status. |
| `/audit`       | Upload a document → poll job → findings (filterable), report, extracted data.          |
| `/verify`      | Verify by file upload **or** structured record; verdict, mismatches, integrity panel.  |
| `/onboarding`  | Single record · bulk register (CSV) · scanned archive.                                 |

## Project structure

```
apps/web/
├─ index.html
├─ vite.config.ts            # dev proxy + @ alias
├─ tailwind.config.js        # design tokens (colors, shadows, animations)
└─ src/
   ├─ main.tsx               # providers: theme, router, tooltip, toaster
   ├─ App.tsx                # routes (landing standalone; app pages in AppShell)
   ├─ index.css              # CSS variables for light/dark themes
   ├─ types/api.ts           # typed interfaces mirroring the FastAPI responses
   ├─ services/              # API client layer
   │  ├─ client.ts           # fetch wrapper, ApiError, base URL
   │  └─ api.ts              # one typed function per endpoint
   ├─ hooks/                 # useAudit (upload+poll), useHealth, useDocTypes, useMutation, useTheme, useToast, useActivity
   ├─ lib/                   # utils, status/severity metadata, csv parser, local activity store
   ├─ components/
   │  ├─ ui/                 # shadcn-style primitives (button, card, tabs, dialog, …)
   │  ├─ layout/             # app shell (sidebar + mobile drawer), theme toggle, backend status
   │  └─ shared/             # dropzone, finding card, verify verdict, integrity panel, markdown/report views, …
   └─ pages/                 # landing, dashboard, audit, verify, onboarding, not-found
```

## Notes & design decisions

- **Typed to the backend.** `src/types/api.ts` mirrors the FastAPI JSON exactly; the client layer is the only place URLs are built.
- **Deterministic-first UI.** Findings show expected vs actual and citations because the backend verdict is arithmetic, not a model guess. Verification and audit are presented as two distinct tiers, matching the backend's philosophy.
- **Dashboard activity is local.** The backend has no "list past jobs" endpoint, so the Dashboard derives stats + the activity feed from actions taken in this browser (stored in `localStorage`). This is framed as _workspace_ activity in the UI and can be cleared.
- **Accessible & responsive.** Semantic HTML, labelled controls, keyboard-operable dropzone, focus-visible rings, dark/light mode with no flash, and layouts that collapse cleanly to mobile.
- **Resilient.** Every flow has explicit empty, loading, and error states; a static doc-type fallback keeps the selector working even if `/doc-types` is briefly unreachable.

## Building for production

```bash
npm run build      # outputs static assets to dist/
```

Deploy `dist/` to any static host (Vercel, Netlify, S3/CloudFront, …). Set `VITE_API_URL`
at build time to the deployed API origin, and ensure the API allows that origin via `CORS_ORIGINS`.

**SPA fallback:** the app uses client-side routing with deep links (e.g. `/audit/<jobId>`),
so configure the host to rewrite all unknown paths to `/index.html` (Vercel/Netlify do this
automatically; for Nginx use `try_files $uri /index.html;`). Otherwise refreshing a deep link 404s.
